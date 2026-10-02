'use client';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import MenuItemCard from './MenuItemCard';
import FloatingCart from './FloatingCart';
import { Search } from 'lucide-react';

interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  description: string;
  image: string;
  alt: string;
  available: boolean;
  popular: boolean;
  badges: string[];
  calories: number | null;
  dailyLimit?: number;
  ordersTaken?: number;
  isBlockedToday?: boolean;
}

const CATEGORIES = [
  { id: 'all', label: 'All Dishes', emoji: '🍽️' },
  { id: 'arepa', label: 'Arepas', emoji: '🫓' },
  { id: 'empanada', label: 'Empanadas', emoji: '🥟' },
  { id: 'patacon', label: 'Patacones', emoji: '🍌' },
  { id: 'cachapa', label: 'Cachapas', emoji: '🌽' },
  { id: 'tequeno', label: 'Tequeños', emoji: '🧀' },
  { id: 'sweet', label: 'Sweets', emoji: '🍮' },
];

const DEFAULT_DAILY_LIMIT = 5;

function formatDate(d: Date) {
  return d.toISOString().split('T')[0];
}

export default function MenuBrowserClient() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  const fetchMenu = useCallback(async () => {
    try {
      const today = formatDate(new Date());

      const [menuRes, rulesRes, blockedRes] = await Promise.all([
        supabase.from('menu_items').select('*').order('category').order('name'),
        supabase.from('availability_rules').select('item_id, daily_limit, orders_taken, is_blocked').eq('rule_date', today),
        supabase.from('blocked_dates').select('blocked_date').eq('blocked_date', today),
      ]);

      const isTodayBlocked = (blockedRes.data || []).length > 0;
      const rulesMap: Record<string, { dailyLimit: number; ordersTaken: number; isBlocked: boolean }> = {};
      (rulesRes.data || []).forEach((r: any) => {
        rulesMap[r.item_id] = {
          dailyLimit: r.daily_limit,
          ordersTaken: r.orders_taken,
          isBlocked: r.is_blocked,
        };
      });

      if (!menuRes.error && menuRes.data) {
        setMenuItems(menuRes.data.map((row: any) => {
          const rule = rulesMap[row.id];
          const dailyLimit = rule ? rule.daily_limit ?? DEFAULT_DAILY_LIMIT : DEFAULT_DAILY_LIMIT;
          const ordersTaken = rule?.ordersTaken ?? 0;
          const isBlockedToday = isTodayBlocked || (rule?.isBlocked ?? false);
          const isFull = dailyLimit > 0 && ordersTaken >= dailyLimit;

          return {
            id: row.id,
            name: row.name,
            category: row.category,
            price: Number(row.price),
            description: row.description,
            image: row.image,
            alt: row.alt,
            // available = false if: item marked unavailable, blocked today, or fully booked
            available: row.available && !isBlockedToday && !isFull,
            popular: row.popular,
            badges: row.badges || [],
            calories: row.calories,
            dailyLimit,
            ordersTaken,
            isBlockedToday,
          };
        }));
      }
    } catch (err) {
      console.error('Menu fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMenu();
    // Subscribe to menu_items, availability_rules, and blocked_dates changes
    const channel = supabase
      .channel('menu_browser_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items' }, () => fetchMenu())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'availability_rules' }, () => fetchMenu())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'blocked_dates' }, () => fetchMenu())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchMenu, supabase]);

  const filtered = menuItems?.filter((item) => {
    const matchCat = activeCategory === 'all' || item?.category === activeCategory;
    const matchSearch =
      search?.trim() === '' ||
      item?.name?.toLowerCase()?.includes(search?.toLowerCase()) ||
      item?.description?.toLowerCase()?.includes(search?.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="pt-14 pb-24 md:pb-8 min-h-screen bg-background">
      {/* Page Header */}
      <div className="bg-white border-b border-border px-4 lg:px-8 py-6">
        <div className="max-w-screen-xl mx-auto">
          <h1 className="font-sans font-bold text-2xl text-foreground">Our Menu</h1>
          <p className="font-body text-sm text-muted-foreground mt-1">
            Everything made fresh this morning.
          </p>
          {/* Search */}
          <div className="mt-4 relative max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search arepas, tequeños..."
              value={search}
              onChange={(e) => setSearch(e?.target?.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-muted border border-border rounded-lg text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="sticky top-14 z-30 bg-white border-b border-border">
        <div className="max-w-screen-xl mx-auto px-4 lg:px-8 overflow-x-auto">
          <div className="flex gap-1 py-3 min-w-max">
            {CATEGORIES?.map((cat) => (
              <button
                key={`cat-${cat?.id}`}
                onClick={() => setActiveCategory(cat?.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-sans font-semibold transition-all whitespace-nowrap ${
                  activeCategory === cat?.id
                    ? 'bg-primary text-white' :'bg-muted text-muted-foreground hover:bg-pink-mid hover:text-foreground'
                }`}
              >
                <span>{cat?.emoji}</span>
                {cat?.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Items Grid */}
      <div className="max-w-screen-xl mx-auto px-4 lg:px-8 py-6">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          </div>
        ) : filtered?.length === 0 ? (
          <div className="text-center py-20">
            <p className="font-body text-4xl mb-4">🔍</p>
            <h3 className="font-sans font-bold text-xl text-foreground mb-2">No items found</h3>
            <p className="font-body text-muted-foreground text-sm">
              Try a different category or search term.
            </p>
            <button
              onClick={() => { setActiveCategory('all'); setSearch(''); }}
              className="mt-4 btn-outline px-6 py-2.5 text-sm font-sans"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <>
            <p className="font-body text-sm text-muted-foreground mb-5">
              {filtered?.length} item{filtered?.length !== 1 ? 's' : ''} available
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered?.map((item) => (
                <MenuItemCard key={item?.id} item={item} />
              ))}
            </div>
          </>
        )}
      </div>

      <FloatingCart />
    </div>
  );
}