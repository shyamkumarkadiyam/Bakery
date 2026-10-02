import React from 'react';
import Link from 'next/link';

const steps = [
  {
    id: 'step-1',
    number: '01',
    title: 'Browse the Menu',
    description: 'Explore arepas, empanadas, patacones, and more — all made fresh today.',
  },
  {
    id: 'step-2',
    number: '02',
    title: 'Add to Cart',
    description: 'Pick your favorites and customize your order. Build a sweet box too.',
  },
  {
    id: 'step-3',
    number: '03',
    title: 'Delivery or Pickup',
    description: 'Choose delivery to your door or schedule a pickup at our Miami kitchen.',
  },
];

export default function HowItWorks() {
  return (
    <section className="py-16 bg-white">
      <div className="max-w-screen-xl mx-auto px-4 lg:px-8">
        <div className="text-center mb-10">
          <p className="font-sans text-xs font-semibold text-primary uppercase tracking-widest mb-2">
            How It Works
          </p>
          <h2 className="font-sans font-bold text-3xl text-foreground">
            Order in 3 simple steps
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {steps?.map((step, i) => (
            <div key={step?.id} className="relative">
              {/* Connector line */}
              {i < steps?.length - 1 && (
                <div className="hidden md:block absolute top-6 left-[calc(50%+2rem)] right-[-calc(50%-2rem)] h-px bg-border z-0" />
              )}
              <div className="relative z-10 flex flex-col items-center text-center p-6 rounded-xl bg-muted">
                <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center mb-4">
                  <span className="font-sans font-bold text-white text-sm">{step?.number}</span>
                </div>
                <h3 className="font-sans font-semibold text-foreground text-base mb-2">{step?.title}</h3>
                <p className="font-body text-sm text-muted-foreground leading-relaxed">{step?.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-10">
          <Link href="/menu-browser" className="btn-primary px-8 py-3 text-sm font-sans inline-block">
            Start Your Order
          </Link>
        </div>
      </div>
    </section>
  );
}