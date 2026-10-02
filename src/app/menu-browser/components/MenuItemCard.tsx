'use client';
import React, { useState } from 'react';
import AppImage from '@/components/ui/AppImage';
import { ShoppingCart, Check, AlertCircle } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';

interface MenuItemCardProps {
  item: {
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
    calories?: number | null;
  };
}

export default function MenuItemCard({ item }: MenuItemCardProps) {
  const addItem = useCartStore((s) => s.addItem);
  const cartItems = useCartStore((s) => s.items);
  const inCart = cartItems.find((i) => i.id === item.id);
  const [adding, setAdding] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  const handleAdd = () => {
    if (!item.available || adding) return;
    setAdding(true);
    setJustAdded(true);
    addItem({
      id: item.id,
      name: item.name,
      price: item.price,
      image: item.image,
      category: item.category,
    });
    setTimeout(() => {
      setAdding(false);
      setTimeout(() => setJustAdded(false), 1500);
    }, 400);
  };

  return (
    <div
      className={`group rounded-2xl overflow-hidden bg-white border border-[#e8d5b0] shadow-sm hover:shadow-md transition-shadow flex flex-col ${
        !item.available ? 'opacity-60' : ''
      }`}
      style={{ background: '#fdf8f2' }}
    >
      {/* Circular food image — centered on top */}
      <div className="flex justify-center pt-5 pb-2 px-4">
        <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-md flex-shrink-0">
          <AppImage
            src={item.image}
            alt={item.alt}
            fill
            sizes="128px"
            quality={75}
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
          {!item.available && (
            <div className="absolute inset-0 bg-white/70 flex items-center justify-center rounded-full">
              <AlertCircle size={20} className="text-neutral-500" />
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-4 flex flex-col flex-1 text-center">
        <h3 className="font-sans font-bold text-foreground text-base leading-tight mb-1">
          {item.name}
        </h3>
        <p className="font-body text-xs text-muted-foreground leading-relaxed flex-1 mb-4">
          {item.description}
        </p>

        {/* Price + Add to Cart */}
        <div className="flex items-center justify-between gap-2 mt-auto">
          <span className="font-sans font-bold text-foreground text-base">
            ${item.price.toFixed(2)}
          </span>
          <button
            onClick={handleAdd}
            disabled={!item.available || adding}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-sans font-semibold transition-all ${
              justAdded
                ? 'bg-green-500 text-white' :'text-white'
            } ${!item.available ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90 active:scale-95'}`}
            style={
              justAdded
                ? {}
                : { background: '#c07a2a' }
            }
          >
            {justAdded ? (
              <>
                <Check size={14} />
                Added
              </>
            ) : (
              <>
                <ShoppingCart size={14} />
                {inCart ? `In Cart (${inCart.qty})` : 'Add To Cart'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}