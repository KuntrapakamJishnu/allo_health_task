'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
        <div className="text-center">
          <div className="inline-flex items-center justify-center mb-6">
            <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
          </div>
          <p className="text-slate-300 text-lg font-light tracking-wide">Loading inventory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 overflow-hidden">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl animate-pulse-smooth"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl animate-pulse-smooth" style={{animationDelay: '1s'}}></div>
      </div>

      <div className="container mx-auto px-4 py-12 relative z-10">
        <div className="mb-16 animate-fade-in-up">
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-300 bg-clip-text text-transparent mb-4 leading-tight">
            Inventory Store
          </h1>
          <p className="text-slate-300 text-lg font-light max-w-2xl">
            Browse available products and make reservations with real-time availability tracking
          </p>
          <div className="h-1 w-20 bg-gradient-to-r from-blue-500 to-cyan-500 mt-6 rounded-full"></div>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-900/20 border border-red-500/50 rounded-xl flex items-start gap-4 backdrop-blur-sm animate-fade-in-up">
            <AlertCircle className="h-6 w-6 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-200 font-medium">Error Loading Products</p>
              <p className="text-red-200/80 text-sm mt-1">{error}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {products.map((product, idx) => (
            <div key={product.id} className="animate-fade-in-up" style={{animationDelay: `${idx * 0.1}s`}}>
              <Card className="bg-slate-800/40 border-slate-700 hover:border-blue-500/80 transition-all duration-500 hover:shadow-2xl hover:shadow-blue-500/20 h-full overflow-hidden group backdrop-blur-sm">
                {/* Card background glow */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-cyan-500/0 group-hover:from-blue-500/5 group-hover:to-cyan-500/5 transition-all duration-500"></div>
                
                <div className="relative">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-blue-400 group-hover:text-cyan-300 transition-colors duration-300 text-2xl">
                      {product.name}
                    </CardTitle>
                    <CardDescription className="text-slate-400 group-hover:text-slate-300 transition-colors">
                      SKU: <span className="font-mono text-slate-300">{product.sku}</span>
                    </CardDescription>
                    {product.description && (
                      <p className="text-sm text-slate-400 mt-3 leading-relaxed">
                        {product.description}
                      </p>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="text-3xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                      ${product.price.toFixed(2)}
                    </div>

                    <div className="space-y-3">
                      {product.stock.length === 0 ? (
                        <p className="text-slate-400 py-4 text-center">No stock information available</p>
                      ) : (
                        product.stock.map((warehouse, stockIdx) => (
                          <div
                            key={warehouse.warehouseId}
                            className="p-4 bg-slate-900/60 rounded-lg border border-slate-700 group-hover:border-blue-500/30 transition-all duration-300 hover:bg-slate-900/80"
                            style={{transitionDelay: `${stockIdx * 50}ms`}}
                          >
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <p className="font-semibold text-slate-200 text-sm">
                                  {warehouse.warehouseName}
                                </p>
                                <p className="text-xs text-slate-500 mt-1">
                                  📍 {warehouse.warehouseCity}
                                </p>
                              </div>
                              <div className={`px-3 py-1 rounded-full text-white text-xs font-bold ${
                                warehouse.availableUnits > 5 ? 'bg-green-600/80' :
                                warehouse.availableUnits > 0 ? 'bg-yellow-600/80' :
                                'bg-red-600/80'
                              }`}>
                                {warehouse.availableUnits}
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              <div className="text-center">
                                <p className="text-xs text-slate-500 mb-1">Total</p>
                                <p className="text-sm font-bold text-blue-400">
                                  {warehouse.totalUnits}
                                </p>
                              </div>
                              <div className="text-center border-l border-r border-slate-700">
                                <p className="text-xs text-slate-500 mb-1">Reserved</p>
                                <p className="text-sm font-bold text-yellow-400">
                                  {warehouse.reservedUnits}
                                </p>
                              </div>
                              <div className="text-center">
                                <p className="text-xs text-slate-500 mb-1">Available</p>
                                <p className="text-sm font-bold text-green-400">
                                  {warehouse.availableUnits}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {product.stock.some((w) => w.availableUnits > 0) ? (
                      <Link href={`/checkout?productId=${product.id}`} className="block">
                        <Button className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold py-3 rounded-lg transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/50 active:scale-95 transform">
                          ✨ Make Reservation
                        </Button>
                      </Link>
                    ) : (
                      <Button disabled className="w-full opacity-40 cursor-not-allowed py-3 rounded-lg bg-slate-700">
                        Out of Stock
                      </Button>
                    )}
                  </CardContent>
                </div>
              </Card>
            </div>
          ))}
        </div>

        {products.length === 0 && !error && (
          <div className="text-center py-20 animate-fade-in-up">
            <div className="text-6xl mb-4">📦</div>
            <p className="text-slate-400 text-xl font-light">No products available at the moment</p>
          </div>
        )}
      </div>
    </div>
  );
}
