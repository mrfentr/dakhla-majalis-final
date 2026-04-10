'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useUser, useClerk } from '@clerk/nextjs';
import {
  Package,
  ShoppingCart,
  Star,
  LogOut,
  LayoutDashboard,
  Users,
  Settings,
  Home,
  Menu,
  X,
  Warehouse,
  FileText,
  PenTool,
  Tag
} from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    async function checkAdminStatus() {
      if (!isLoaded) return;

      if (!user) {
        router.push('/login');
        return;
      }

      try {
        const response = await fetch('/api/check-admin');
        const data = await response.json();
        setIsAdmin(data.isAdmin);

        if (!data.isAdmin) {
          setIsChecking(false);
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
      } finally {
        setIsChecking(false);
      }
    }

    checkAdminStatus();
  }, [user, isLoaded, router]);

  // Sidebar navigation
  const sidebarItems = [
    { id: 'overview', label: 'Vue d\'ensemble', icon: LayoutDashboard, path: '/dashboard' },
    { id: 'orders', label: 'Commandes', icon: ShoppingCart, path: '/dashboard/orders' },
    { id: 'customers', label: 'Clients', icon: Users, path: '/dashboard/customers' },
    { id: 'products', label: 'Produits', icon: Package, path: '/dashboard/products' },
    { id: 'categories', label: 'Catégories', icon: Tag, path: '/dashboard/categories' },
    { id: 'reviews', label: 'Avis', icon: Star, path: '/dashboard/reviews' },
    { id: 'stock', label: 'Stock', icon: Warehouse, path: '/dashboard/stock' },
    { id: 'blog', label: 'Blog', icon: FileText, path: '/dashboard/blog' },
    { id: 'custom', label: 'Layout Personnalisé', icon: PenTool, path: '/dashboard/custom/new' },
  ];

  const handleNavigation = (path: string) => {
    router.push(path);
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  if (isChecking || !isLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#BD7C48] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-neutral-600 font-medium">Vérification des autorisations...</p>
        </div>
      </div>
    );
  }

  if (isAdmin === false) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white flex items-center justify-center px-6" dir="ltr">
        {/* Decorative elements */}
        <div className="absolute top-0 left-1/3 w-96 h-96 bg-[#BD7C48]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/3 w-80 h-80 bg-[#BD7C48]/5 rounded-full blur-3xl" />

        <div className="relative bg-white rounded-2xl shadow-2xl border border-neutral-200 p-12 max-w-md text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <LogOut className="w-10 h-10 text-red-600" />
          </div>
          <h1 className="text-3xl font-black text-neutral-900 mb-4">
            Accès refusé
          </h1>
          <p className="text-neutral-600 mb-8 leading-relaxed">
            Désolé, vous n'avez pas la permission d'accéder au tableau de bord. Cette page est réservée aux administrateurs uniquement.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => router.push('/')}
              className="w-full h-12 px-6 bg-[#BD7C48] hover:bg-[#A0673D] text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-xl"
            >
              Retour à l'accueil
            </button>
            <button
              onClick={() => signOut({ redirectUrl: '/login' })}
              className="w-full h-12 px-6 bg-neutral-200 hover:bg-neutral-300 text-neutral-800 font-bold rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Se déconnecter
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Check if we're on the custom layout page (full-screen editor)
  const isCustomPage = pathname?.startsWith('/dashboard/custom/') || pathname === '/dashboard/custom';

  // If on custom page, render children directly without sidebar
  if (isCustomPage) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-neutral-50" dir="ltr">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 h-full bg-white border-r border-neutral-200 transition-all duration-300 z-40 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      } w-64`}>
        {/* Logo & Toggle */}
        <div className="p-6 border-b border-neutral-200 flex items-center justify-between">
          <h2 className="text-xl font-black text-neutral-900">Dakhla Majalis</h2>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-neutral-100 transition-colors lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2 pb-24">
          {sidebarItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive
                    ? 'bg-[#BD7C48] text-white shadow-lg'
                    : 'text-neutral-700 hover:bg-neutral-100'
                }`}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                <span className="font-bold flex-1 text-left">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Sign Out Section */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-neutral-200 bg-white">
          <button
            onClick={() => signOut({ redirectUrl: '/login' })}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-lg transition-all border border-red-200"
          >
            <LogOut className="w-4 h-4" />
            <span>Se déconnecter</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64">
        {/* Header */}
        <header className="bg-white border-b border-neutral-200 sticky top-0 z-30">
          <div className="px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden w-10 h-10 flex items-center justify-center rounded-xl hover:bg-neutral-100 transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <button
              onClick={() => router.push('/')}
              className="ml-auto flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold text-neutral-700 hover:text-[#BD7C48] hover:bg-neutral-50 rounded-xl transition-all border border-neutral-200"
            >
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline">Site principal</span>
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="min-h-[calc(100vh-73px)]">
          {children}
        </div>
      </main>
    </div>
  );
}
