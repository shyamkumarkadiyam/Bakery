'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import AppImage from '@/components/ui/AppImage';
import { createClient } from '@/lib/supabase/client';

interface Offer {
  id: string;
  title: string;
  description: string;
  image: string;
  category: string;
  badge: string;
  badge_color: string;
}

export default function PhilosophySection({ initialOffers = [] }: { initialOffers?: Offer[] }) {
  const [offers, setOffers] = useState<Offer[]>(initialOffers);

  useEffect(() => {
    const supabase = createClient();
    const load = async () => {
      const { data } = await supabase
        .from('special_offers')
        .select('id,title,description,image,category,badge,badge_color')
        .eq('active', true)
        .order('sort');
      setOffers((data as Offer[]) || []);
    };
    load();
    const channel = supabase
      .channel(`offers-${crypto.randomUUID()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'special_offers' }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  if (offers.length === 0) return null;

  return (
    <section className="py-14 bg-[#fdf8f2]">
      <div className="max-w-screen-xl mx-auto px-4 lg:px-8">
        <h2 className="font-sans font-extrabold text-2xl md:text-3xl mb-8" style={{ color: '#7a2a3a' }}>
          Special Offers
        </h2>

        <div className="grid md:grid-cols-2 gap-6">
          {offers.map((offer) => (
            <Link
              key={offer.id}
              href={`/menu-browser?category=${offer.category}`}
              data-testid={`offer-card-${offer.id}`}
              className="relative rounded-2xl overflow-hidden aspect-[16/9] md:aspect-[4/3] cursor-pointer group block"
            >
              <AppImage
                src={offer.image}
                alt={offer.title}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                quality={75}
                className="object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-black/55" />
              <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-8">
                {offer.badge && (
                  <span className="inline-block self-start px-3 py-1 rounded-full text-xs font-sans font-semibold text-white mb-3" style={{ background: offer.badge_color }}>
                    {offer.badge}
                  </span>
                )}
                <h3 className="font-sans font-extrabold text-white text-2xl md:text-3xl leading-tight mb-2">{offer.title}</h3>
                <p className="font-body text-white/80 text-sm leading-relaxed max-w-sm">{offer.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
