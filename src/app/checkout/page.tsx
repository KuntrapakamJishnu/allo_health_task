'use client';

import { Suspense } from 'react';
import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Clock, Loader2, ArrowLeft } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  price: number;
  description: string | null;
  sku: string;
}

interface Warehouse {
  id: string;
  name: string;
  city: string;
}

interface WarehouseStock {
  warehouseId: string;
  warehouseName: string;
  warehouseCity: string;
  totalUnits: number;
  reservedUnits: number;
  availableUnits: number;
}

interface Reservation {
  id: string;
  productId: string;
  warehouseId: string;
  quantity: number;
  status: 'PENDING' | 'CONFIRMED' | 'RELEASED';
  expiresAt: string;
  product: Product;
  warehouse: Warehouse;
}

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const productId = searchParams.get('productId');

  const [products, setProducts] = useState<any[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const currentProduct = products.find((p) => p.id === productId);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch('/api/products');
        if (!response.ok) throw new Error('Failed to fetch products');
        const data = await response.json();
        setProducts(data);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // Auto-select first available warehouse
  useEffect(() => {
    if (currentProduct?.stock && selectedWarehouse === '') {
      const available = currentProduct.stock.find((s: WarehouseStock) => s.availableUnits > 0);
      if (available) {
        setSelectedWarehouse(available.warehouseId);
      }
    }
  }, [currentProduct, selectedWarehouse]);

  // Countdown timer
  useEffect(() => {
    if (!reservation) return;

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const expiresAt = new Date(reservation.expiresAt).getTime();
      const diff = expiresAt - now;

      if (diff <= 0) {
        setTimeLeft(0);
        setError('Reservation has expired. Please make a new one.');
      } else {
        setTimeLeft(Math.floor(diff / 1000));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [reservation]);

  const handleMakeReservation = async () => {
    if (!selectedWarehouse || quantity < 1) {
      setError('Please select a warehouse and quantity');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          warehouseId: selectedWarehouse,
          quantity,
          idempotencyKey: `reserve-${productId}-${selectedWarehouse}-${Date.now()}`,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 409) {
          setError(`Not enough stock available. ${errorData.error}`);
        } else if (response.status === 404) {
          setError('Product or warehouse not found');
        } else {
          setError(errorData.error || 'Failed to create reservation');
        }
        return;
      }

      const data = await response.json();
      setReservation(data);
      setSuccessMessage('Reservation created successfully! Complete your purchase before the timer expires.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmReservation = async () => {
    if (!reservation) return;

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/reservations/${reservation.id}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idempotencyKey: `confirm-${reservation.id}-${Date.now()}`,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 410) {
          setError('Reservation has expired. Please make a new one.');
          setReservation(null);
        } else if (response.status === 409) {
          setError('Reservation has already been released');
        } else {
          setError(errorData.error || 'Failed to confirm reservation');
        }
        return;
      }

      const data = await response.json();
      setReservation(data);
      setSuccessMessage('Purchase confirmed! Your reservation is now locked in.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelReservation = async () => {
    if (!reservation) return;

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/reservations/${reservation.id}/release`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to cancel reservation');
        return;
      }

      setReservation(null);
      setSuccessMessage('Reservation cancelled. Units are now available again.');
      setTimeout(() => {
        router.push('/');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const selectedWarehouseData = currentProduct?.stock.find(
    (s: WarehouseStock) => s.warehouseId === selectedWarehouse
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!currentProduct) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center">
        <Card className="bg-slate-800/50 border-slate-700 w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-slate-200 mb-4">Product not found</p>
            <Link href="/">
              <Button className="bg-blue-600 hover:bg-blue-700">Back to Store</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800">
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <Link href="/" className="flex items-center gap-2 text-blue-400 hover:text-blue-300 mb-8">
          <ArrowLeft className="h-4 w-4" />
          Back to Store
        </Link>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Product Summary */}
          <Card className="md:col-span-1 bg-slate-800/50 border-slate-700 sticky top-4 h-fit">
            <CardHeader>
              <CardTitle className="text-blue-400">{currentProduct.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-slate-400">Price</p>
                <p className="text-2xl font-bold text-green-400">
                  ${currentProduct.price.toFixed(2)}
                </p>
              </div>
              {reservation && (
                <div className="p-3 bg-blue-900/30 border border-blue-500/50 rounded-lg">
                  <p className="text-sm text-slate-300 mb-2">
                    <strong>Reservation ID:</strong>
                  </p>
                  <p className="text-xs text-slate-400 font-mono break-all">
                    {reservation.id}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Reservation Form / Status */}
          <Card className="md:col-span-2 bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-blue-400">
                {reservation
                  ? reservation.status === 'CONFIRMED'
                    ? 'Purchase Confirmed'
                    : 'Complete Your Reservation'
                  : 'Make a Reservation'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {error && (
                <Alert className="bg-red-900/20 border-red-500/50">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <AlertTitle className="text-red-200">Error</AlertTitle>
                  <AlertDescription className="text-red-200">{error}</AlertDescription>
                </Alert>
              )}

              {successMessage && (
                <Alert className="bg-green-900/20 border-green-500/50">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <AlertTitle className="text-green-200">Success</AlertTitle>
                  <AlertDescription className="text-green-200">
                    {successMessage}
                  </AlertDescription>
                </Alert>
              )}

              {!reservation ? (
                <>
                  {/* Warehouse Selection */}
                  <div>
                    <label className="text-sm font-medium text-slate-200 block mb-2">
                      Select Warehouse
                    </label>
                    <select
                      value={selectedWarehouse}
                      onChange={(e) => setSelectedWarehouse(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-slate-200 focus:outline-none focus:border-blue-500"
                    >
                      <option value="">Choose a warehouse...</option>
                      {currentProduct.stock.map((stock: WarehouseStock) => (
                        <option
                          key={stock.warehouseId}
                          value={stock.warehouseId}
                          disabled={stock.availableUnits === 0}
                        >
                          {stock.warehouseName} ({stock.warehouseCity}) - {stock.availableUnits} available
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Quantity Selection */}
                  <div>
                    <label className="text-sm font-medium text-slate-200 block mb-2">
                      Quantity
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={selectedWarehouseData?.availableUnits || 1}
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-slate-200 focus:outline-none focus:border-blue-500"
                    />
                    {selectedWarehouseData && (
                      <p className="text-xs text-slate-400 mt-1">
                        Max available: {selectedWarehouseData.availableUnits}
                      </p>
                    )}
                  </div>

                  {/* Stock Info */}
                  {selectedWarehouseData && (
                    <div className="p-3 bg-slate-900/50 border border-slate-700 rounded-lg">
                      <p className="text-sm text-slate-300 mb-2">
                        <strong>{selectedWarehouseData.warehouseName}</strong>
                      </p>
                      <div className="grid grid-cols-3 gap-2 text-xs text-slate-400">
                        <div>
                          <p className="text-slate-500">Available</p>
                          <p className="text-green-400 font-semibold">
                            {selectedWarehouseData.availableUnits}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-500">Reserved</p>
                          <p className="text-yellow-400 font-semibold">
                            {selectedWarehouseData.reservedUnits}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-500">Total</p>
                          <p className="text-blue-400 font-semibold">
                            {selectedWarehouseData.totalUnits}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={handleMakeReservation}
                    disabled={!selectedWarehouse || quantity < 1 || submitting}
                    className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Make Reservation'
                    )}
                  </Button>
                </>
              ) : (
                <>
                  {/* Reservation Status */}
                  <div className="p-4 bg-slate-900/50 border border-slate-700 rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-slate-300">Reservation Status:</span>
                      <Badge
                        className={`${
                          reservation.status === 'CONFIRMED'
                            ? 'bg-green-600'
                            : 'bg-yellow-600'
                        }`}
                      >
                        {reservation.status}
                      </Badge>
                    </div>

                    {reservation.status === 'PENDING' && timeLeft !== null && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-yellow-500" />
                        <span className="text-slate-300">Time remaining:</span>
                        <span className={`font-semibold ${timeLeft < 60 ? 'text-red-500' : 'text-yellow-400'}`}>
                          {formatTime(timeLeft)}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="p-4 bg-slate-900/50 border border-slate-700 rounded-lg">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-slate-500">Quantity</p>
                        <p className="text-slate-200 font-semibold">
                          {reservation.quantity}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500">Warehouse</p>
                        <p className="text-slate-200 font-semibold">
                          {reservation.warehouse.name}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500">Product</p>
                        <p className="text-slate-200 font-semibold">
                          {reservation.product.name}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500">Total Price</p>
                        <p className="text-green-400 font-semibold">
                          ${(reservation.quantity * currentProduct.price).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {reservation.status === 'PENDING' && (
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        onClick={handleConfirmReservation}
                        disabled={submitting}
                        className="bg-green-600 hover:bg-green-700 text-white font-semibold"
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Confirming...
                          </>
                        ) : (
                          'Confirm Purchase'
                        )}
                      </Button>
                      <Button
                        onClick={handleCancelReservation}
                        disabled={submitting}
                        className="border border-slate-600 bg-transparent text-slate-200 hover:bg-slate-700"
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Cancelling...
                          </>
                        ) : (
                          'Cancel'
                        )}
                      </Button>
                    </div>
                  )}

                  {reservation.status === 'CONFIRMED' && (
                    <Link href="/">
                      <Button className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold">
                        Return to Store
                      </Button>
                    </Link>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
