'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import AppImage from '@/components/ui/AppImage';
import { Plus, Minus, Gift, ShoppingCart, Star, Sparkles, X } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { toast } from 'sonner';

const BOX_SIZE = 6;

const treats = [
{
  id: 'treat-001',
  name: 'Reina Pepiada Arepa',
  price: 9.5,
  image: "https://img.rocket.new/generatedImages/rocket_gen_img_155a77c26-1772058234588.png",
  alt: 'Reina pepiada arepa with chicken avocado filling',
  badges: ['⭐ Best Seller'],
  category: 'Arepa'
},
{
  id: 'treat-002',
  name: 'Beef Empanada',
  price: 5.5,
  image: "https://images.unsplash.com/photo-1619926340139-9a2e2245a64e",
  alt: 'Crispy golden beef empanada',
  badges: ['⭐ Best Seller'],
  category: 'Empanada'
},
{
  id: 'treat-003',
  name: 'Classic Tequeños (2pc)',
  price: 3.5,
  image: "https://img.rocket.new/generatedImages/rocket_gen_img_1875bddb0-1772985541333.png",
  alt: 'Two golden fried tequeños cheese sticks',
  badges: ['🎉 Party Fave'],
  category: 'Tequeño'
},
{
  id: 'treat-004',
  name: 'Nutella Tequeño (1pc)',
  price: 2.5,
  image: "https://img.rocket.new/generatedImages/rocket_gen_img_4a323a3a8-1789982806197.png",
  alt: 'Sweet Nutella tequeño dusted with powdered sugar',
  badges: ['✨ New', '🍫 Sweet'],
  category: 'Tequeño'
},
{
  id: 'treat-005',
  name: 'Classic Cachapa (half)',
  price: 5.0,
  image: "https://img.rocket.new/generatedImages/rocket_gen_img_1287547ce-1772058237100.png",
  alt: 'Half portion of sweet corn cachapa with white cheese',
  badges: ['🌽 Sweet Corn'],
  category: 'Cachapa'
},
{
  id: 'treat-006',
  name: 'Pabellón Patacón (half)',
  price: 7.0,
  image: "https://img.rocket.new/generatedImages/rocket_gen_img_1bd4e859c-1766030285365.png",
  alt: 'Half patacon sandwich with shredded beef and plantain',
  badges: ['🍌 Plantain'],
  category: 'Patacón'
},
{
  id: 'treat-007',
  name: 'Quesillo Slice',
  price: 5.0,
  image: "https://img.rocket.new/generatedImages/rocket_gen_img_1c13d7e7d-1765232173537.png",
  alt: 'Slice of Venezuelan quesillo flan with caramel sauce',
  badges: ['🍮 Flan', '⭐ Best Seller'],
  category: 'Sweet'
},
{
  id: 'treat-008',
  name: 'Bienmesabe Cup',
  price: 4.5,
  image: "https://img.rocket.new/generatedImages/rocket_gen_img_112deaa89-1784728434209.png",
  alt: 'Creamy coconut bienmesabe in a small cup with cinnamon',
  badges: ['🥥 Traditional'],
  category: 'Sweet'
},
{
  id: 'treat-009',
  name: 'Cheese & Jalapeño Empanada',
  price: 5.0,
  image: "https://img.rocket.new/generatedImages/rocket_gen_img_1a4c3ca04-1784672786827.png",
  alt: 'Empanada with cheese and jalapeño filling',
  badges: ['🔥 Spicy', '🌱 Veggie'],
  category: 'Empanada'
},
{
  id: 'treat-010',
  name: 'Pelúa Arepa',
  price: 10.0,
  image: "https://images.unsplash.com/photo-1592409418448-15e846d61f75",
  alt: 'Arepa with shredded beef and melted yellow cheese',
  badges: ['🧀 Cheesy'],
  category: 'Arepa'
},
{
  id: 'treat-011',
  name: 'Domino Arepa',
  price: 8.5,
  image: "https://images.unsplash.com/photo-1619683815168-a8081fae39f3",
  alt: 'Arepa filled with black beans and white cheese',
  badges: ['🌱 Veggie'],
  category: 'Arepa'
},
{
  id: 'treat-012',
  name: 'Shrimp Empanada',
  price: 6.5,
  image: "https://images.unsplash.com/photo-1548228586-171fb0887ac0",
  alt: 'Shrimp and cilantro empanada on a wooden board',
  badges: ['🦐 Seafood'],
  category: 'Empanada'
}];


interface SelectedTreat {
  treatId: string;
  name: string;
  price: number;
  image: string;
  alt: string;
}

export default function SweetBoxBuilderClient() {
  const [selected, setSelected] = useState<SelectedTreat[]>([]);
  const addItem = useCartStore((s) => s.addItem);

  const toggleTreat = (treat: typeof treats[0]) => {
    const alreadySelected = selected.find((s) => s.treatId === treat.id);
    if (alreadySelected) {
      setSelected(selected.filter((s) => s.treatId !== treat.id));
    } else {
      if (selected.length >= BOX_SIZE) {
        toast.error('Your Sweet Box is full! Remove a treat to swap it. 🎁');
        return;
      }
      setSelected([...selected, {
        treatId: treat.id,
        name: treat.name,
        price: treat.price,
        image: treat.image,
        alt: treat.alt
      }]);
    }
  };

  const removeTreat = (treatId: string) => {
    setSelected(selected.filter((s) => s.treatId !== treatId));
  };

  const total = selected.reduce((sum, s) => sum + s.price, 0);
  const remaining = BOX_SIZE - selected.length;

  const handleAddToCart = () => {
    if (selected.length < BOX_SIZE) {
      toast.error(`Pick ${remaining} more treat${remaining !== 1 ? 's' : ''} to complete your box!`);
      return;
    }
    // Backend integration point: create sweet box order
    addItem({
      id: `sweet-box-${Date.now()}`,
      name: 'Custom Sweet Box (6 treats)',
      price: total,
      image: treats[0].image,
      category: 'sweet'
    });
    toast.success('Sweet Box added to cart! 🎁🌸');
  };

  return (
    <div className="pt-14 pb-24 md:pb-8 min-h-screen bg-background">
      {/* Header */}
      <div className="bg-white border-b border-border px-4 lg:px-8 py-6">
        <div className="max-w-screen-xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-pink-light flex items-center justify-center">
              <Gift size={18} className="text-primary" />
            </div>
            <p className="font-sans text-xs font-semibold text-primary uppercase tracking-widest">
              Sweet Box Builder
            </p>
          </div>
          <h1 className="font-sans font-bold text-2xl text-foreground">
            Build Your Custom Box
          </h1>
          <p className="font-body text-sm text-muted-foreground mt-1 max-w-lg">
            Pick any 6 treats from our menu. Mix and match — arepas, empanadas, tequeños, sweets.
          </p>

          {/* Progress */}
          <div className="mt-4 flex items-center gap-4">
            <div className="flex-1 max-w-xs h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${selected.length / BOX_SIZE * 100}%`,
                  background: selected.length === BOX_SIZE ? '#22C55E' : '#FF8DA1'
                }}
              />
            </div>
            <span className="font-sans text-sm font-semibold text-foreground font-tabular">
              {selected.length}/{BOX_SIZE} treats
            </span>
            {selected.length === BOX_SIZE && (
              <span className="flex items-center gap-1 text-green-text font-sans text-sm font-semibold">
                <Sparkles size={13} />
                Box complete!
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-4 lg:px-8 py-6">
        <div className="grid lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {/* Treat Grid */}
          <div className="lg:col-span-2 xl:col-span-3">
            <h2 className="font-sans font-semibold text-base text-foreground mb-4">
              Choose your treats
              {remaining > 0 && (
                <span className="ml-2 font-body text-sm font-normal text-muted-foreground">
                  ({remaining} more to go)
                </span>
              )}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {treats.map((treat) => {
                const isSelected = !!selected.find((s) => s.treatId === treat.id);
                const isFull = selected.length >= BOX_SIZE && !isSelected;

                return (
                  <button
                    key={treat.id}
                    onClick={() => toggleTreat(treat)}
                    disabled={isFull}
                    className={`relative rounded-xl overflow-hidden text-left transition-all duration-200 border-2 ${
                      isSelected
                        ? 'treat-selected shadow-kawaii scale-[1.02]'
                        : isFull
                        ? 'treat-unselected opacity-50 cursor-not-allowed' :'treat-unselected hover:border-primary/50 hover:shadow-card'
                    }`}
                  >
                    
                    {/* Image */}
                    <div className="relative aspect-square overflow-hidden bg-muted">
                      <AppImage
                        src={treat.image}
                        alt={treat.alt}
                        fill
                        sizes="(max-width: 640px) 50vw, 25vw"
                        className="object-cover" />
                      
                      {/* Selected overlay */}
                      {isSelected &&
                      <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-kawaii">
                            <Minus size={16} className="text-white" />
                          </div>
                        </div>
                      }
                      {!isSelected && !isFull &&
                      <div className="absolute inset-0 bg-black/0 hover:bg-black/5 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                            <Plus size={16} className="text-white" />
                          </div>
                        </div>
                      }
                      {/* Badge removed */}
                    </div>

                    {/* Info */}
                    <div className="p-2.5">
                      <p className="text-xs font-bold text-foreground leading-tight mb-0.5">{treat.name}</p>
                      <p className="text-[10px] text-muted-foreground">{treat.category}</p>
                      <p className="text-primary font-extrabold text-xs mt-1 font-tabular">
                        ${treat.price.toFixed(2)}
                      </p>
                    </div>
                  </button>);

              })}
            </div>
          </div>

          {/* Box Preview Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <div className="bg-white border border-border rounded-3xl shadow-kawaii overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-primary to-secondary p-5 text-white">
                  <div className="flex items-center gap-2 mb-1">
                    <Gift size={18} />
                    <h3 className="font-bold text-base">Your Sweet Box</h3>
                  </div>
                  <p className="text-white/80 text-xs">
                    {selected.length === 0 ?
                    'Start picking treats!' :
                    selected.length < BOX_SIZE ?
                    `${remaining} more treat${remaining !== 1 ? 's' : ''} to go` :
                    '🎉 Box complete!'}
                  </p>
                </div>

                {/* Slots */}
                <div className="p-4 space-y-2">
                  {Array.from({ length: BOX_SIZE }).map((_, i) => {
                    const treat = selected[i];
                    return (
                      <div
                        key={`slot-${i}`}
                        className={`flex items-center gap-3 p-2.5 rounded-2xl transition-all ${
                        treat ? 'box-slot-filled' : 'box-slot-empty'}`
                        }>
                        
                        {treat ?
                        <>
                            <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0">
                              <AppImage
                              src={treat.image}
                              alt={treat.alt}
                              width={40}
                              height={40}
                              className="object-cover w-full h-full" />
                            
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-foreground truncate">{treat.name}</p>
                              <p className="text-[10px] text-primary font-bold font-tabular">
                                ${treat.price.toFixed(2)}
                              </p>
                            </div>
                            <button
                            onClick={() => removeTreat(treat.treatId)}
                            className="w-6 h-6 rounded-full bg-white flex items-center justify-center hover:bg-red-soft transition-colors flex-shrink-0">
                            
                              <X size={12} className="text-muted-foreground hover:text-red-text" />
                            </button>
                          </> :

                        <div className="flex items-center gap-2 w-full">
                            <div className="w-10 h-10 rounded-xl bg-border flex items-center justify-center">
                              <Plus size={16} className="text-muted-foreground" />
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Slot {i + 1} — empty
                            </p>
                          </div>
                        }
                      </div>);

                  })}
                </div>

                {/* Total & CTA */}
                <div className="p-4 border-t border-border">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm font-semibold text-muted-foreground">Box Total</span>
                    <span className="text-xl font-extrabold text-foreground font-tabular">
                      ${total.toFixed(2)}
                    </span>
                  </div>

                  {selected.length === BOX_SIZE ?
                  <button
                    onClick={handleAddToCart}
                    className="w-full btn-primary py-3.5 text-sm flex items-center justify-center gap-2">
                    
                      <ShoppingCart size={16} />
                      Add Box to Cart
                    </button> :

                  <button
                    disabled
                    className="w-full py-3.5 rounded-full bg-muted text-muted-foreground text-sm font-bold cursor-not-allowed">
                    
                      Pick {remaining} more treat{remaining !== 1 ? 's' : ''}
                    </button>
                  }

                  <Link
                    href="/menu-browser"
                    className="block text-center text-xs text-muted-foreground mt-3 hover:text-primary transition-colors">
                    
                    Or browse the full menu →
                  </Link>
                </div>
              </div>

              {/* Tips */}
              <div className="mt-4 bg-yellow-light border border-yellow rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Star size={14} className="text-amber-text" />
                  <p className="text-xs font-bold text-amber-text">Sweet Box Tips</p>
                </div>
                <ul className="space-y-1 text-xs text-amber-text/80">
                  <li>🎁 Great for gifting or group orders</li>
                  <li>🧀 Mix savory + sweet for the full experience</li>
                  <li>⭐ Try the Reina Pepiada — our #1 best seller</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>);

}