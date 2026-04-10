'use client';

import { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@convex/_generated/api';
import { useGetProducts, useGetFabricVariants } from '@/hooks/useConvex';
import { Package, CheckCircle, AlertCircle, Loader, ArrowRight, Zap } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import Image from 'next/image';

export default function InitProductsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [defaultStock, setDefaultStock] = useState({
    glssa: 50,
    wsaydRegular: 50,
    wsaydReduced: 50,
    coudoir: 50,
    zerbiya: 10,
  });

  const migrateFromProducts = useMutation(api.fabricVariants.migrateFromProducts);
  const majalisProducts = useGetProducts({ productType: 'majalis_set' }) ?? [];
  const fabricVariants = useGetFabricVariants() ?? [];

  const alreadyMigrated = majalisProducts.filter((p: any) => p.fabricVariantId);
  const notMigrated = majalisProducts.filter((p: any) => !p.fabricVariantId);

  const handleMigrate = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const response = await migrateFromProducts({ defaultStock });
      setResult(response);
      toast.success(`Migration réussie: ${response.created.length} variantes créées`);
    } catch (error: any) {
      console.error('Migration error:', error);
      toast.error(`Erreur: ${error.message}`);
      setResult({ error: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <Toaster />

      {/* Deprecation Banner */}
      <div className="mb-6 bg-yellow-50 border border-yellow-300 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold text-yellow-900 mb-1">Page de migration</h3>
            <p className="text-sm text-yellow-700">
              Cette page permet de migrer les produits majalis existants vers le nouveau système de variantes de tissu.
              Après la migration, gérez le stock via la page{' '}
              <a href="/dashboard/stock" className="underline font-bold text-yellow-800 hover:text-yellow-900">Stock</a>.
            </p>
          </div>
        </div>
      </div>

      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 mb-1">
          Migration vers Variantes de Tissu
        </h1>
        <p className="text-sm text-neutral-600">
          Convertir les produits majalis existants en variantes de tissu pour un suivi de stock par composant
        </p>
      </div>

      {/* Current State Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-neutral-200 p-4 text-center">
          <p className="text-xs text-neutral-500 mb-1">Produits Majalis</p>
          <p className="text-3xl font-black text-neutral-900">{majalisProducts.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-neutral-200 p-4 text-center">
          <p className="text-xs text-neutral-500 mb-1">Déjà migrés</p>
          <p className="text-3xl font-black text-green-600">{alreadyMigrated.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-neutral-200 p-4 text-center">
          <p className="text-xs text-neutral-500 mb-1">À migrer</p>
          <p className="text-3xl font-black text-[#B85C38]">{notMigrated.length}</p>
        </div>
      </div>

      {/* Products to Migrate */}
      <div className="bg-white rounded-xl border border-neutral-200 p-6 mb-6">
        <h3 className="text-sm font-bold text-neutral-900 mb-4">Produits Majalis ({majalisProducts.length})</h3>
        <div className="space-y-2">
          {majalisProducts.map((product: any) => (
            <div key={product._id} className="flex items-center gap-3 p-3 rounded-lg bg-neutral-50 border border-neutral-100">
              <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-neutral-200 flex-shrink-0">
                <Image src={product.image} alt={product.title.ar} fill className="object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-neutral-900 truncate" dir="rtl">{product.title.ar}</p>
                <p className="text-xs text-neutral-500">Stock actuel: {product.inventory.stockQuantity}</p>
              </div>
              {product.fabricVariantId ? (
                <span className="px-2 py-1 bg-green-50 text-green-700 text-xs font-bold rounded border border-green-200">
                  Migré ✓
                </span>
              ) : (
                <span className="px-2 py-1 bg-orange-50 text-orange-700 text-xs font-bold rounded border border-orange-200">
                  À migrer
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Default Stock Configuration */}
      {notMigrated.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6">
          <div className="flex items-start gap-3 mb-4">
            <Package className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-blue-900 mb-1">Stock initial par composant</h3>
              <p className="text-xs text-blue-700">
                Définissez le stock par défaut pour chaque composant. Ces valeurs seront appliquées à toutes les variantes créées.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { key: 'glssa', label: 'Glssa (القلصة)' },
              { key: 'wsaydRegular', label: 'Wsayd Régulier' },
              { key: 'wsaydReduced', label: 'Wsayd Réduit' },
              { key: 'coudoir', label: 'Coudoir (كودوار)' },
              { key: 'zerbiya', label: 'Zerbiya (زربية)' },
            ].map(comp => (
              <div key={comp.key}>
                <label className="block text-[10px] font-bold text-blue-800 mb-1">{comp.label}</label>
                <input
                  type="number"
                  value={(defaultStock as any)[comp.key]}
                  onChange={e => setDefaultStock({ ...defaultStock, [comp.key]: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-white border border-blue-200 rounded-lg text-sm font-bold text-neutral-900 focus:ring-1 focus:ring-blue-400"
                  min="0"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Migration Button */}
      {notMigrated.length > 0 && (
        <div className="bg-white rounded-xl border border-neutral-200 p-6 mb-6">
          <button
            onClick={handleMigrate}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-[#B85C38] hover:bg-[#9A4D2E] text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed font-bold text-lg"
          >
            {isLoading ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                <span>Migration en cours...</span>
              </>
            ) : (
              <>
                <Zap className="w-5 h-5" />
                <span>Migrer {notMigrated.length} produits vers variantes de tissu</span>
              </>
            )}
          </button>
          <p className="text-xs text-neutral-500 text-center mt-3">
            Cette opération va créer une variante de tissu pour chaque produit majalis et les lier ensemble.
          </p>
        </div>
      )}

      {/* All Migrated State */}
      {notMigrated.length === 0 && majalisProducts.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-6 text-center">
          <CheckCircle className="w-10 h-10 text-green-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-green-900 mb-1">Migration complète!</h3>
          <p className="text-sm text-green-700 mb-4">
            Tous les {majalisProducts.length} produits majalis ont été migrés vers des variantes de tissu.
          </p>
          <a
            href="/dashboard/stock"
            className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold transition-colors"
          >
            <span>Gérer le stock</span>
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      )}

      {/* Existing Fabric Variants */}
      {fabricVariants.length > 0 && (
        <div className="bg-white rounded-xl border border-neutral-200 p-6 mb-6">
          <h3 className="text-sm font-bold text-neutral-900 mb-3">
            Variantes de tissu existantes ({fabricVariants.length})
          </h3>
          <div className="space-y-2">
            {fabricVariants.map((variant: any) => (
              <div key={variant._id} className="flex items-center gap-3 p-3 rounded-lg bg-green-50 border border-green-100">
                <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-neutral-200 flex-shrink-0">
                  <Image src={variant.image} alt={variant.name.fr} fill className="object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-neutral-900 truncate" dir="rtl">{variant.name.ar}</p>
                  <p className="text-xs text-neutral-500">
                    {variant.color} | G:{variant.stock.glssa} WR:{variant.stock.wsaydRegular} Wred:{variant.stock.wsaydReduced} C:{variant.stock.coudoir} Z:{variant.stock.zerbiya}
                  </p>
                </div>
                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded">
                  {variant.isActive ? 'Actif' : 'Inactif'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Result Display */}
      {result && !result.error && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-bold text-green-900 mb-2">Résultat de la migration</h3>
              <p className="text-sm text-green-700 font-bold mb-3">{result.message}</p>
              {result.created?.length > 0 && (
                <div className="space-y-1">
                  {result.created.map((item: any, i: number) => (
                    <p key={i} className="text-xs text-green-700">
                      ✓ {item.productName} → Couleur: {item.color}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {result?.error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-red-900 mb-1">Erreur</h3>
              <p className="text-sm text-red-700">{result.error}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
