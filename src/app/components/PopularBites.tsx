'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import AppImage from '@/components/ui/AppImage';
import { ShoppingCart, Check } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';

const bites = [
{
  id: 'bite-arepa',
  name: 'Arepas',
  tagline: 'The heart of Venezuela',
  price: 'From $8.50',
  priceValue: 8.50,
  image: 'https://img.rocket.new/generatedImages/rocket_gen_img_16460d06b-1773095810884.png',
  alt: 'Golden arepa stuffed with chicken and avocado on a wooden board',
  href: '/menu-browser?category=arepa'
},
{
  id: 'bite-empanada',
  name: 'Empanadas',
  tagline: 'Crispy fried pockets of joy',
  price: 'From $5.00',
  priceValue: 5.00,
  image: 'https://images.unsplash.com/photo-1685591626168-f6caa5fcbe7f',
  alt: 'Crispy golden empanadas on a plate with dipping sauce',
  href: '/menu-browser?category=empanada'
},
{
  id: 'bite-patacon',
  name: 'Patacones',
  tagline: 'Fried plantain sandwiches',
  price: 'From $11.50',
  priceValue: 11.50,
  image: 'https://img.rocket.new/generatedImages/rocket_gen_img_1c531bb93-1765291114488.png',
  alt: 'Patacon sandwich made from crispy fried plantains with beef filling',
  href: '/menu-browser?category=patacon'
},
{
  id: 'bite-cachapa',
  name: 'Cachapas',
  tagline: 'Sweet corn pancakes',
  price: 'From $8.00',
  priceValue: 8.00,
  image: 'https://img.rocket.new/generatedImages/rocket_gen_img_154ecb8da-1772058235093.png',
  alt: 'Sweet golden cachapa corn pancake folded over white cheese',
  href: '/menu-browser?category=cachapa'
},
{
  id: 'bite-tequeno',
  name: 'Tequeños',
  tagline: 'Fried cheese sticks',
  price: 'From $7.00',
  priceValue: 7.00,
  image: 'https://img.rocket.new/generatedImages/rocket_gen_img_125c7fa97-1772058236283.png',
  alt: 'Six golden fried tequeños cheese sticks on a pink serving plate',
  href: '/menu-browser?category=tequeno'
},
{
  id: 'bite-sweets',
  name: 'Sweets',
  tagline: 'Venezuelan desserts',
  price: 'From $4.50',
  priceValue: 4.50,
  image: 'https://img.rocket.new/generatedImages/rocket_gen_img_141ceddb0-1765232175619.png',
  alt: 'Venezuelan quesillo flan with golden caramel sauce on a white plate',
  href: '/menu-browser?category=sweet'
}];

function AddToCartButton({ bite }: { bite: typeof bites[0] }) {
  return <span data-testid={`popular-browse-${bite.id}`} className="block text-center text-primary text-xs font-semibold mt-2">Choose a dish →</span>;
}

export default function PopularBites() {
  return (
    <section className="py-12 bg-white">
      <div className="max-w-screen-xl mx-auto px-4 lg:px-8">
        {/* Section header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-sans font-bold text-2xl text-foreground">Popular Bites</h2>
            <p className="font-body text-sm text-muted-foreground mt-1">
              Made fresh every morning — no shortcuts.
            </p>
          </div>
          <Link
            href="/menu-browser"
            className="hidden md:inline-flex text-sm font-sans font-semibold text-primary hover:underline">
            See all
          </Link>
        </div>

        {/* Single horizontal sliding row */}
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide snap-x">
          {bites?.map((bite) =>
          <Link
            key={bite?.id}
            href={bite?.href}
            data-testid={`popular-bite-${bite?.id}`}
            className="flex-shrink-0 w-44 snap-start group block rounded-xl overflow-hidden bg-white border border-border card-hover">
            
              <div className="relative aspect-square overflow-hidden bg-muted">
                <AppImage
                src={bite?.image}
                alt={bite?.alt}
                fill
                sizes="(max-width: 640px) 160px, (max-width: 1024px) 33vw, 16vw"
                quality={75}
                className="object-cover group-hover:scale-105 transition-transform duration-500" />
              </div>
              <div className="p-3">
                <h3 className="font-sans font-semibold text-foreground text-sm">{bite?.name}</h3>
                <p className="font-body text-xs text-muted-foreground mt-0.5 leading-tight">{bite?.tagline}</p>
                <p className="font-sans font-bold text-primary text-sm mt-1.5">{bite?.price}</p>
                <AddToCartButton bite={bite} />
              </div>
            </Link>
          )}
        </div>

        <div className="flex justify-center mt-6 md:hidden">
          <Link href="/menu-browser" className="btn-primary px-8 py-2.5 text-sm font-sans">
            View Full Menu
          </Link>
        </div>
      </div>
    </section>);
}