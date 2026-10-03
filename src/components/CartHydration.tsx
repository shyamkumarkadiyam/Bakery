'use client';
import { useEffect } from 'react';
import { useCartStore } from '@/store/cartStore';
export const CartHydration = () => {
  useEffect(() => {
    Promise.resolve(useCartStore.persist.rehydrate()).finally(()=>useCartStore.setState({hydrated:true}));
  }, []);
  return null;
};