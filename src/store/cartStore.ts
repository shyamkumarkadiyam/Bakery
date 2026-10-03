'use client';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  qty: number;
  image: string;
  category: string;
  isBox?: boolean;
  boxLabel?: string;
  components?: { id: string; qty: number; name: string }[];
}

interface CartStore {
  items: CartItem[];
  hydrated: boolean;
  mode: 'now' | 'later';
  date: string;
  time: string;
  setSchedule: (schedule: Partial<Pick<CartStore, 'mode' | 'date' | 'time'>>) => void;
  addItem: (item: Omit<CartItem, 'qty'>) => void;
  addBox: (box: Omit<CartItem, 'qty'>) => void;
  removeItem: (id: string) => void;
  updateQty: (id: string, qty: number) => void;
  clearCart: () => void;
}

export const useCartStore = create<CartStore>()(persist((set) => ({
  items: [],
  hydrated: false,
  mode: 'now', date: '', time: '',
  setSchedule: (schedule) => set(schedule),
  addItem: (item) =>
    set((state) => {
      const existing = state.items.find((i) => i.id === item.id);
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.id === item.id ? { ...i, qty: i.qty + 1 } : i
          ),
        };
      }
      return { items: [...state.items, { ...item, qty: 1 }] };
    }),
  addBox: (box) => set((state) => ({ items: [...state.items, { ...box, qty: 1 }] })),
  removeItem: (id) =>
    set((state) => ({ items: state.items.filter((i) => i.id !== id) })),
  updateQty: (id, qty) =>
    set((state) => ({
      items:
        qty <= 0
          ? state.items.filter((i) => i.id !== id)
          : state.items.map((i) => (i.id === id ? { ...i, qty } : i)),
    })),
  clearCart: () => set({ items: [] }),
}), { name: 'lolita-cart-v2', storage: createJSONStorage(() => sessionStorage), skipHydration: true,
  partialize: state => ({items:state.items,mode:state.mode,date:state.date,time:state.time}),
}));