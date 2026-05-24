'use client';

import { Suspense } from 'react';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Clock, Loader2, ArrowLeft } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  price: number;
  description: string | null;
  sku: string;
  stock: WarehouseStock[];
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

  const [products, setProducts] = useState<Product[]>([]);
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

  // Auto-select first available warehouse when product data loads
  // Guard clause prevents cascading renders - only updates when selectedWarehouse is empty
  useEffect(() => {
    if (!currentProduct?.stock?.length || selectedWarehouse !== '') {
      return;
    }
    
    const available = currentProduct.stock.find((s: WarehouseStock) => s.availableUnits > 0);
    if (available) {
      setSelectedWarehouse(available.warehouseId);
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
        <div className="text-center">
          <div className="inline-flex items-center justify-center mb-6">
            <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
          </div>
          <p className="text-slate-300 text-lg font-light">Loading products...</p>
        </div>
      </div>
    );
  }

  if (!currentProduct) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center p-4 animate-fade-in-up">
        <Card className="bg-slate-800/50 border-slate-700 w-full max-w-md backdrop-blur-sm">
          <CardContent className="pt-8 text-center space-y-6">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto" />
            <div>
              <p className="text-slate-200 font-semibold text-lg">Product Not Found</p>
              <p className="text-slate-400 text-sm mt-2">The product you&apos;re looking for doesn&apos;t exist.</p>
            </div>
            <Link href="/" className="block">
              <Button className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold py-3">
                ← Back to Store
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 overflow-hidden">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl animate-pulse-smooth"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl animate-pulse-smooth" style={{animationDelay: '1s'}}></div>
      </div>

      <div className="container mx-auto px-4 py-12 max-w-2xl relative z-10">
        <Link href="/" className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 mb-8 transition-colors duration-300 group animate-fade-in-up">
          <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
          <span className="font-medium">Back to Store</span>
        </Link>

        <div className="grid md:grid-cols-3 gap-8 animate-fade-in-up">
          {/* Product Summary */}
          <Card className="md:col-span-1 bg-slate-800/40 border-slate-700 sticky top-8 h-fit backdrop-blur-sm hover:border-blue-500/50 transition-all duration-300">
            <CardHeader>
              <CardTitle className="text-blue-400 text-2xl">{currentProduct.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <p className="text-sm text-slate-400 mb-2 font-light">Price</p>
                <p className="text-3xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                  ${currentProduct.price.toFixed(2)}
                </p>
              </div>
              {reservation && (
                <div className="p-4 bg-gradient-to-br from-blue-900/30 to-cyan-900/30 border border-blue-500/40 rounded-lg backdrop-blur-sm">
                  <p className="text-xs text-slate-400 mb-2 font-medium tracking-wide">RESERVATION ID</p>
                  <p className="text-xs text-slate-300 font-mono break-all leading-relaxed bg-slate-900/40 p-2 rounded">
                    {reservation.id}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Reservation Form / Status */}
          <Card className="md:col-span-2 bg-slate-800/40 border-slate-700 backdrop-blur-sm hover:border-blue-500/50 transition-all duration-300">
            <CardHeader>
              <CardTitle className="text-blue-400 text-2xl">
                {reservation
                  ? reservation.status === 'CONFIRMED'
                    ? '✅ Purchase Confirmed'
                    : '⏱️ Complete Your Reservation'
                  : '🛒 Make a Reservation'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {error && (
                <div className="p-4 bg-red-900/20 border border-red-500/50 rounded-lg backdrop-blur-sm animate-fade-in-up">
                  <div className="flex gap-3">
                    <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-red-200">Error</p>
                      <p className="text-red-200/90 text-sm mt-1">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {successMessage && (
                <div className="p-4 bg-green-900/20 border border-green-500/50 rounded-lg backdrop-blur-sm animate-fade-in-up">
                  <div className="flex gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-green-200">Success</p>
                      <p className="text-green-200/90 text-sm mt-1">{successMessage}</p>
                    </div>
                  </div>
                </div>
              )}

              {!reservation ? (
                <>
                  {/* Warehouse Selection */}
                  <div>
                    <label className="text-sm font-semibold text-slate-200 block mb-3">
                      Select Warehouse
                    </label>
                    <select
                      value={selectedWarehouse}
                      onChange={(e) => setSelectedWarehouse(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300"
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
                    <label className="text-sm font-semibold text-slate-200 block mb-3">
                      Quantity
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={selectedWarehouseData?.availableUnits || 1}
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300"
                    />
                    {selectedWarehouseData && (
                      <p className="text-xs text-slate-400 mt-2 font-light">
                        Maximum available: <span className="text-green-400 font-semibold">{selectedWarehouseData.availableUnits} units</span>
                      </p>
                    )}
                  </div>

                  {/* Stock Info */}
                  {selectedWarehouseData && (
                    <div className="p-4 bg-slate-900/40 border border-slate-700 rounded-lg space-y-3">
                      <p className="text-sm font-semibold text-slate-200">
                        📦 {selectedWarehouseData.warehouseName}
                      </p>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-700">
                          <p className="text-xs text-slate-500 mb-1 font-light">Available</p>
                          <p className="text-lg font-bold text-green-400">
                            {selectedWarehouseData.availableUnits}
                          </p>
                        </div>
                        <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-700">
                          <p className="text-xs text-slate-500 mb-1 font-light">Reserved</p>
                          <p className="text-lg font-bold text-yellow-400">
                            {selectedWarehouseData.reservedUnits}
                          </p>
                        </div>
                        <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-700">
                          <p className="text-xs text-slate-500 mb-1 font-light">Total</p>
                          <p className="text-lg font-bold text-blue-400">
                            {selectedWarehouseData.totalUnits}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={handleMakeReservation}
                    disabled={!selectedWarehouse || quantity < 1 || submitting}
                    className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold py-3 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/50 active:scale-95 transform"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Reserving...
                      </>
                    ) : (
                      '🎯 Make Reservation'
                    )}
                  </Button>
                </>
              ) : (
                <>
                  {/* Reservation Status */}
                  <div className="p-4 bg-slate-900/40 border border-slate-700 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-400 font-light">Status:</span>
                      <Badge
                        className={`font-bold ${
                          reservation.status === 'CONFIRMED'
                            ? 'bg-green-600/80 text-white'
                            : 'bg-yellow-600/80 text-white'
                        }`}
                      >
                        {reservation.status}
                      </Badge>
                    </div>

                    {reservation.status === 'PENDING' && timeLeft !== null && (
                      <div className="flex items-center gap-3 pt-3 border-t border-slate-700">
                        <Clock className={`h-5 w-5 ${timeLeft < 60 ? 'text-red-500 animate-pulse' : 'text-yellow-500'}`} />
                        <span className="text-slate-300 text-sm">Time remaining:</span>
                        <span className={`font-mono font-bold text-lg ${timeLeft < 60 ? 'text-red-500 animate-pulse' : 'text-yellow-400'}`}>
                          {formatTime(timeLeft)}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="p-4 bg-slate-900/40 border border-slate-700 rounded-lg space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-slate-500 text-xs font-light mb-1">Quantity</p>
                        <p className="text-slate-200 font-bold text-lg">
                          {reservation.quantity}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500 text-xs font-light mb-1">Warehouse</p>
                        <p className="text-slate-200 font-bold text-lg">
                          {reservation.warehouse.name}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500 text-xs font-light mb-1">Product</p>
                        <p className="text-slate-200 font-bold text-lg">
                          {reservation.product.name}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500 text-xs font-light mb-1">Total Price</p>
                        <p className="text-green-400 font-bold text-lg">
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
                        className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold py-3 rounded-lg transition-all duration-300 hover:shadow-lg hover:shadow-green-500/50 active:scale-95 transform disabled:opacity-40"
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Confirming...
                          </>
                        ) : (
                          '✅ Confirm Purchase'
                        )}
                      </Button>
                      <Button
                        onClick={handleCancelReservation}
                        disabled={submitting}
                        className="border border-slate-600 bg-slate-900/40 hover:bg-slate-800 text-slate-200 hover:text-slate-100 font-bold py-3 rounded-lg transition-all duration-300 active:scale-95 transform disabled:opacity-40"
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Cancelling...
                          </>
                        ) : (
                          '✕ Cancel'
                        )}
                      </Button>
                    </div>
                  )}

                  {reservation.status === 'CONFIRMED' && (
                    <Link href="/" className="block">
                      <Button className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold py-3 rounded-lg transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/50">
                        ← Return to Store
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
