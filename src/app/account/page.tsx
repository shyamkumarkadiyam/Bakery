'use client';
import React, { useEffect, useState, useMemo } from 'react';
import CustomerNav from '@/components/CustomerNav';
import LandingFooter from '@/app/components/LandingFooter';
import { User, ShoppingBag, Heart, Settings, LogOut, ChevronRight, X, Package, MapPin } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

type OrderItem = { name: string; qty: number; price: number };
type Order = {
  id: string;
  status: string;
  total: number;
  placed_at: string;
  delivery_type: string;
  customer_address: string;
  order_items: OrderItem[];
};
type Favorite = {
  id: string;
  item_id: string;
  item_name: string;
  item_price: number;
  item_image: string;
  item_category: string;
};

type ActiveSection = 'menu' | 'orders' | 'favorites' | 'settings';

const statusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-blue-100 text-blue-700',
  packaging: 'bg-purple-100 text-purple-700',
  enroute: 'bg-orange-100 text-orange-700',
  delivered: 'bg-green-100 text-green-700',
  pickup: 'bg-teal-100 text-teal-700',
  cancelled: 'bg-red-100 text-red-700',
};

export default function AccountPage() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  // Stable supabase client — created once, not on every render
  const supabase = useMemo(() => createClient(), []);

  const [activeSection, setActiveSection] = useState<ActiveSection>('menu');
  const [orders, setOrders] = useState<Order[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [favoritesLoading, setFavoritesLoading] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');

  useEffect(() => {
    if (user) {
      setProfileName(user.user_metadata?.full_name || '');
    }
  }, [user]);

  // Auto-load orders when user is available and section is orders
  useEffect(() => {
    if (user && activeSection === 'orders') {
      loadOrders();
    }
    if (user && activeSection === 'favorites') {
      loadFavorites();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, activeSection]);

  const loadOrders = async () => {
    if (!user) return;
    setOrdersLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('id, status, total, placed_at, delivery_type, customer_address, order_items(name, qty, price)')
        .eq('user_id', user.id)
        .order('placed_at', { ascending: false })
        .limit(20);
      if (error) {
        console.error('Load orders error:', error.message, error.code);
      } else if (data) {
        setOrders(data as Order[]);
      }
    } catch (err) {
      console.error('Load orders exception:', err);
    } finally {
      setOrdersLoading(false);
    }
  };

  const loadFavorites = async () => {
    if (!user) return;
    setFavoritesLoading(true);
    try {
      const { data, error } = await supabase
        .from('favorites')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (!error && data) setFavorites(data as Favorite[]);
    } catch (err) {
      console.error('Load favorites error:', err);
    } finally {
      setFavoritesLoading(false);
    }
  };

  const handleSectionClick = (section: ActiveSection) => {
    setActiveSection(section);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/');
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  const handleRemoveFavorite = async (favId: string) => {
    try {
      await supabase.from('favorites').delete().eq('id', favId);
      setFavorites((prev) => prev.filter((f) => f.id !== favId));
    } catch (err) {
      console.error('Remove favorite error:', err);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setProfileSaving(true);
    setProfileMsg('');
    try {
      const { error: authError } = await supabase.auth.updateUser({
        data: { full_name: profileName },
      });
      const { error: dbError } = await supabase
        .from('user_profiles')
        .upsert({ id: user.id, email: user.email || '', full_name: profileName, phone: profilePhone, updated_at: new Date().toISOString() })
        .eq('id', user.id);
      if (!authError && !dbError) {
        setProfileMsg('Profile updated successfully!');
      } else {
        setProfileMsg('Update failed. Please try again.');
      }
    } catch (err) {
      setProfileMsg('Update failed. Please try again.');
    } finally {
      setProfileSaving(false);
    }
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return iso;
    }
  };

  // Not logged in
  if (!loading && !user) {
    return (
      <div className="min-h-screen bg-[#fdf8f2]">
        <CustomerNav />
        <main className="pt-20 pb-24 px-4 max-w-lg mx-auto">
          <div className="flex flex-col items-center py-8">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mb-3" style={{ background: '#f5e0e8' }}>
              <User size={36} style={{ color: '#7a2a3a' }} />
            </div>
            <h1 className="font-sans font-extrabold text-2xl" style={{ color: '#1a1a1a' }}>My Account</h1>
            <p className="font-body text-sm mt-1" style={{ color: '#6b5a5e' }}>Manage your Lolita Bakery experience</p>
          </div>
          <div className="rounded-2xl p-6 mb-6 text-center" style={{ background: '#f5e0e8' }}>
            <p className="font-body text-sm mb-4" style={{ color: '#3a2a2e' }}>
              Sign in to access your orders, favourites, and more.
            </p>
            <div className="flex gap-3 justify-center">
              <a href="/login" className="px-5 py-2.5 rounded-full text-white text-sm font-sans font-semibold transition-opacity hover:opacity-90" style={{ background: '#7a2a3a' }}>
                Sign In
              </a>
              <a href="/register" className="px-5 py-2.5 rounded-full text-sm font-sans font-semibold border transition-colors hover:bg-white" style={{ color: '#7a2a3a', borderColor: '#7a2a3a' }}>
                Register
              </a>
            </div>
            <div className="mt-4 pt-4 border-t border-[#e8c9d6]">
              <p className="font-body text-xs mb-1.5" style={{ color: '#6b5a5e' }}>Ordered as a guest?</p>
              <a href="/track-order" data-testid="account-track-order-link" className="text-sm font-semibold hover:underline" style={{ color: '#7a2a3a' }}>
                Track an order by number →
              </a>
            </div>
          </div>
        </main>
        <LandingFooter />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fdf8f2] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-[#7a2a3a] border-t-transparent animate-spin" />
      </div>
    );
  }

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'My Account';
  const displayEmail = user?.email || '';

  // Main menu view
  if (activeSection === 'menu') {
    return (
      <div className="min-h-screen bg-[#fdf8f2]">
        <CustomerNav />
        <main className="pt-20 pb-24 px-4 max-w-lg mx-auto">
          <div className="flex flex-col items-center py-8">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mb-3" style={{ background: '#f5e0e8' }}>
              <User size={36} style={{ color: '#7a2a3a' }} />
            </div>
            <h1 className="font-sans font-extrabold text-2xl" style={{ color: '#1a1a1a' }}>{displayName}</h1>
            <p className="font-body text-sm mt-1" style={{ color: '#6b5a5e' }}>{displayEmail}</p>
          </div>

          <div className="flex flex-col gap-3">
            <button onClick={() => handleSectionClick('orders')} className="flex items-center gap-4 bg-white rounded-2xl p-4 text-left hover:shadow-sm transition-shadow w-full">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#f5e0e8' }}>
                <ShoppingBag size={18} style={{ color: '#7a2a3a' }} />
              </div>
              <div className="flex-1">
                <p className="font-sans font-bold text-sm" style={{ color: '#1a1a1a' }}>My Orders</p>
                <p className="font-body text-xs mt-0.5" style={{ color: '#6b5a5e' }}>View your order history and track deliveries</p>
              </div>
              <ChevronRight size={16} style={{ color: '#6b5a5e' }} />
            </button>

            <button onClick={() => handleSectionClick('favorites')} className="flex items-center gap-4 bg-white rounded-2xl p-4 text-left hover:shadow-sm transition-shadow w-full">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#f5e0e8' }}>
                <Heart size={18} style={{ color: '#7a2a3a' }} />
              </div>
              <div className="flex-1">
                <p className="font-sans font-bold text-sm" style={{ color: '#1a1a1a' }}>Favourites</p>
                <p className="font-body text-xs mt-0.5" style={{ color: '#6b5a5e' }}>Your saved sweet treats and combos</p>
              </div>
              <ChevronRight size={16} style={{ color: '#6b5a5e' }} />
            </button>

            <button onClick={() => handleSectionClick('settings')} className="flex items-center gap-4 bg-white rounded-2xl p-4 text-left hover:shadow-sm transition-shadow w-full">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#f5e0e8' }}>
                <Settings size={18} style={{ color: '#7a2a3a' }} />
              </div>
              <div className="flex-1">
                <p className="font-sans font-bold text-sm" style={{ color: '#1a1a1a' }}>Settings</p>
                <p className="font-body text-xs mt-0.5" style={{ color: '#6b5a5e' }}>Manage your profile and preferences</p>
              </div>
              <ChevronRight size={16} style={{ color: '#6b5a5e' }} />
            </button>

            <button onClick={handleSignOut} className="flex items-center gap-4 bg-white rounded-2xl p-4 text-left hover:shadow-sm transition-shadow w-full">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#fde8e8' }}>
                <LogOut size={18} style={{ color: '#c0392b' }} />
              </div>
              <div className="flex-1">
                <p className="font-sans font-bold text-sm" style={{ color: '#c0392b' }}>Sign Out</p>
                <p className="font-body text-xs mt-0.5" style={{ color: '#6b5a5e' }}>Log out of your account</p>
              </div>
            </button>
          </div>
        </main>
        <LandingFooter />
      </div>
    );
  }

  // Orders section
  if (activeSection === 'orders') {
    return (
      <div className="min-h-screen bg-[#fdf8f2]">
        <CustomerNav />
        <main className="pt-20 pb-24 px-4 max-w-lg mx-auto">
          <div className="flex items-center gap-3 py-6">
            <button onClick={() => setActiveSection('menu')} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: '#f5e0e8' }}>
              <ChevronRight size={18} style={{ color: '#7a2a3a', transform: 'rotate(180deg)' }} />
            </button>
            <h1 className="font-sans font-extrabold text-xl" style={{ color: '#1a1a1a' }}>My Orders</h1>
          </div>

          {ordersLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 rounded-full border-4 border-[#7a2a3a] border-t-transparent animate-spin" />
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12">
              <Package size={40} className="mx-auto mb-3" style={{ color: '#c9a0b0' }} />
              <p className="font-sans font-bold text-base" style={{ color: '#1a1a1a' }}>No orders yet</p>
              <p className="font-body text-sm mt-1" style={{ color: '#6b5a5e' }}>Your order history will appear here</p>
              <a href="/menu-browser" className="inline-block mt-4 px-5 py-2.5 rounded-full text-white text-sm font-semibold" style={{ background: '#7a2a3a' }}>
                Browse Menu
              </a>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {orders.map((order) => (
                <div key={order.id} className="bg-white rounded-2xl p-4 border border-[#f0e0e8]">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-sans font-bold text-sm" style={{ color: '#1a1a1a' }}>{order.id}</p>
                      <p className="font-body text-xs mt-0.5" style={{ color: '#6b5a5e' }}>{formatDate(order.placed_at)}</p>
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full capitalize ${statusColors[order.status] || 'bg-gray-100 text-gray-600'}`}>
                      {order.status}
                    </span>
                  </div>
                  <div className="space-y-1 mb-3">
                    {order.order_items?.slice(0, 3).map((item, idx) => (
                      <p key={idx} className="font-body text-xs whitespace-pre-line" style={{ color: '#3a2a2e' }}>
                        {item.name} × {item.qty}
                      </p>
                    ))}
                    {(order.order_items?.length || 0) > 3 && (
                      <p className="font-body text-xs" style={{ color: '#6b5a5e' }}>+{(order.order_items?.length || 0) - 3} more items</p>
                    )}
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-[#f0e0e8]">
                    <div className="flex items-center gap-1.5">
                      {order.delivery_type === 'delivery' ? (
                        <MapPin size={12} style={{ color: '#6b5a5e' }} />
                      ) : (
                        <Package size={12} style={{ color: '#6b5a5e' }} />
                      )}
                      <span className="font-body text-xs capitalize" style={{ color: '#6b5a5e' }}>{order.delivery_type}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="font-sans font-extrabold text-sm" style={{ color: '#7a2a3a' }}>${order.total?.toFixed(2)}</p>
                      <a
                        href={`/order-status/${order.id}`}
                        className="text-xs font-semibold px-3 py-1 rounded-full border transition-colors hover:bg-[#f5e0e8]"
                        style={{ color: '#7a2a3a', borderColor: '#7a2a3a' }}
                      >
                        Track
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
        <LandingFooter />
      </div>
    );
  }

  // Favorites section
  if (activeSection === 'favorites') {
    return (
      <div className="min-h-screen bg-[#fdf8f2]">
        <CustomerNav />
        <main className="pt-20 pb-24 px-4 max-w-lg mx-auto">
          <div className="flex items-center gap-3 py-6">
            <button onClick={() => setActiveSection('menu')} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: '#f5e0e8' }}>
              <ChevronRight size={18} style={{ color: '#7a2a3a', transform: 'rotate(180deg)' }} />
            </button>
            <h1 className="font-sans font-extrabold text-xl" style={{ color: '#1a1a1a' }}>Favourites</h1>
          </div>

          {favoritesLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 rounded-full border-4 border-[#7a2a3a] border-t-transparent animate-spin" />
            </div>
          ) : favorites.length === 0 ? (
            <div className="text-center py-12">
              <Heart size={40} className="mx-auto mb-3" style={{ color: '#c9a0b0' }} />
              <p className="font-sans font-bold text-base" style={{ color: '#1a1a1a' }}>No favourites yet</p>
              <p className="font-body text-sm mt-1" style={{ color: '#6b5a5e' }}>Save items from the menu to see them here</p>
              <a href="/menu-browser" className="inline-block mt-4 px-5 py-2.5 rounded-full text-white text-sm font-semibold" style={{ background: '#7a2a3a' }}>
                Browse Menu
              </a>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {favorites.map((fav) => (
                <div key={fav.id} className="bg-white rounded-2xl p-4 border border-[#f0e0e8] flex items-center gap-3">
                  {fav.item_image ? (
                    <img src={fav.item_image} alt={fav.item_name} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-14 h-14 rounded-xl flex-shrink-0 flex items-center justify-center" style={{ background: '#f5e0e8' }}>
                      <Heart size={20} style={{ color: '#7a2a3a' }} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-sans font-bold text-sm truncate" style={{ color: '#1a1a1a' }}>{fav.item_name}</p>
                    <p className="font-body text-xs mt-0.5" style={{ color: '#6b5a5e' }}>{fav.item_category}</p>
                    <p className="font-sans font-bold text-sm mt-1" style={{ color: '#7a2a3a' }}>${fav.item_price?.toFixed(2)}</p>
                  </div>
                  <button onClick={() => handleRemoveFavorite(fav.id)} className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 hover:bg-red-50 transition-colors">
                    <X size={14} style={{ color: '#c0392b' }} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </main>
        <LandingFooter />
      </div>
    );
  }

  // Settings section
  return (
    <div className="min-h-screen bg-[#fdf8f2]">
      <CustomerNav />
      <main className="pt-20 pb-24 px-4 max-w-lg mx-auto">
        <div className="flex items-center gap-3 py-6">
          <button onClick={() => setActiveSection('menu')} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: '#f5e0e8' }}>
            <ChevronRight size={18} style={{ color: '#7a2a3a', transform: 'rotate(180deg)' }} />
          </button>
          <h1 className="font-sans font-extrabold text-xl" style={{ color: '#1a1a1a' }}>Profile Settings</h1>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-[#f0e0e8] space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: '#6b5a5e' }}>Full Name</label>
            <input
              type="text"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              placeholder="Your name"
              className="w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2"
              style={{ borderColor: '#e8d5de', background: '#fdf8f2', color: '#1a1a1a' }}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: '#6b5a5e' }}>Email</label>
            <input
              type="email"
              value={displayEmail}
              disabled
              className="w-full px-4 py-3 rounded-xl border text-sm opacity-60 cursor-not-allowed"
              style={{ borderColor: '#e8d5de', background: '#f5e0e8', color: '#1a1a1a' }}
            />
            <p className="text-xs mt-1" style={{ color: '#6b5a5e' }}>Email cannot be changed</p>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: '#6b5a5e' }}>Phone (optional)</label>
            <input
              type="tel"
              value={profilePhone}
              onChange={(e) => setProfilePhone(e.target.value)}
              placeholder="(305) 555-0000"
              className="w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2"
              style={{ borderColor: '#e8d5de', background: '#fdf8f2', color: '#1a1a1a' }}
            />
          </div>

          {profileMsg && (
            <p className={`text-xs font-semibold ${profileMsg.includes('success') ? 'text-green-700' : 'text-red-600'}`}>
              {profileMsg}
            </p>
          )}

          <button
            onClick={handleSaveProfile}
            disabled={profileSaving}
            className="w-full py-3 rounded-xl text-white text-sm font-bold transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ background: '#7a2a3a' }}
          >
            {profileSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
