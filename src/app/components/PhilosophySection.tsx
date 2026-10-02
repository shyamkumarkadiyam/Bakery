import React from 'react';
import AppImage from '@/components/ui/AppImage';

const offers = [
{
  id: 'offer-arepa-tuesday',
  badge: 'Every Tuesday',
  badgeColor: '#2a7a8a',
  title: 'Arepa 2×1 Tuesdays',
  description: 'Buy any Arepa and get the second one for free! Venezuelan traditions meant for sharing.',
  image: "https://images.unsplash.com/photo-1634750188038-d0f806ebe6c5",
  alt: 'Steaming golden arepa stuffed with shredded beef and black beans on a dark background'
},
{
  id: 'offer-bundle',
  badge: 'Summer Deal',
  badgeColor: '#7a6a2a',
  title: 'Bundle Deals',
  description: 'Mix & match 5 pastries + 2 coffees for only $25. Perfect for your afternoon merienda.',
  image: "https://img.rocket.new/generatedImages/rocket_gen_img_104c93e91-1772214527119.png",
  alt: 'Assorted Venezuelan pastries and sweets arranged in a gift box with coffee'
}];


export default function PhilosophySection() {
  return (
    <section className="py-14 bg-[#fdf8f2]">
      <div className="max-w-screen-xl mx-auto px-4 lg:px-8">
        {/* Section heading */}
        <h2
          className="font-sans font-extrabold text-2xl md:text-3xl mb-8"
          style={{ color: '#7a2a3a' }}>
          
          Special Offers
        </h2>

        {/* Two large dark cards */}
        <div className="grid md:grid-cols-2 gap-6">
          {offers?.map((offer) =>
          <div
            key={offer?.id}
            className="relative rounded-2xl overflow-hidden aspect-[16/9] md:aspect-[4/3] cursor-pointer group">
            
              {/* Background image */}
              <AppImage
              src={offer?.image}
              alt={offer?.alt}
              fill
              priority={offer?.id === 'offer-arepa-tuesday'}
              sizes="(max-width: 768px) 100vw, 50vw"
              quality={75}
              className="object-cover group-hover:scale-105 transition-transform duration-700" />
            

              {/* Dark overlay */}
              <div className="absolute inset-0 bg-black/55" />

              {/* Content overlay */}
              <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-8">
                {/* Badge */}
                <span
                className="inline-block self-start px-3 py-1 rounded-full text-xs font-sans font-semibold text-white mb-3"
                style={{ background: offer?.badgeColor }}>
                
                  {offer?.badge}
                </span>

                {/* Title */}
                <h3 className="font-sans font-extrabold text-white text-2xl md:text-3xl leading-tight mb-2">
                  {offer?.title}
                </h3>

                {/* Description */}
                <p className="font-body text-white/80 text-sm leading-relaxed max-w-sm">
                  {offer?.description}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>);

}