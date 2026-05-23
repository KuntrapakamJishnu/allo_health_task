'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Loader2 } from 'lucide-react';

interface WarehouseStock {
  warehouseId: string;
  warehouseName: string;
  warehouseCity: string;
  totalUnits: number;
  reservedUnits: number;
  availableUnits: number;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  sku: string;
  stock: WarehouseStock[];
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch('/api/products');
        if (!response.ok) throw new Error('Failed to fetch products');
        const data = await response.json();
        setProducts(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800">
      <div className="container mx-auto px-4 py-12">
        <div className="mb-12">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent mb-2">
            Inventory Store
          </h1>
          <p className="text-slate-300 text-lg">
            Browse available products and make reservations
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-500/50 rounded-lg flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-200">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <Card key={product.id} className="bg-slate-800/50 border-slate-700 hover:border-blue-500/50 transition-all hover:shadow-lg hover:shadow-blue-500/20">
              <CardHeader>
                <CardTitle className="text-blue-400">{product.name}</CardTitle>
                <CardDescription className="text-slate-400">
                  SKU: {product.sku}
                </CardDescription>
                {product.description && (
                  <p className="text-sm text-slate-300 mt-2">{product.description}</p>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-2xl font-bold text-green-400">
                  ${product.price.toFixed(2)}
                </div>

                <div className="space-y-3">
                  {product.stock.length === 0 ? (
                    <p className="text-slate-400">No stock information available</p>
                  ) : (
                    product.stock.map((warehouse) => (
                      <div
                        key={warehouse.warehouseId}
                        className="p-3 bg-slate-900/50 rounded-lg border border-slate-700"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-medium text-slate-200">
                              {warehouse.warehouseName}
                            </p>
                            <p className="text-xs text-slate-400">
                              {warehouse.warehouseCity}
                            </p>
                          </div>
                          <Badge className="bg-blue-600 text-white">
                            {warehouse.availableUnits} available
                          </Badge>
                        </div>
                        <div className="text-xs text-slate-400">
                          Total: {warehouse.totalUnits} | Reserved:{' '}
                          {warehouse.reservedUnits}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {product.stock.some((w) => w.availableUnits > 0) ? (
                  <Link href={`/checkout?productId=${product.id}`}>
                    <Button className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold">
                      Make Reservation
                    </Button>
                  </Link>
                ) : (
                  <Button disabled className="w-full opacity-50 cursor-not-allowed">
                    Out of Stock
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {products.length === 0 && !error && (
          <div className="text-center py-12">
            <p className="text-slate-400">No products available</p>
          </div>
        )}
      </div>
    </div>
  );
}
