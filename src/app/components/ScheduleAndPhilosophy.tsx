'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Star, CalendarCheck, Quote } from 'lucide-react';
import { SchedulePicker } from '@/components/SchedulePicker';

const quotes = [
  '“Every bite we craft carries the warmth of home — made with love, tradition, and the finest ingredients from our roots.”',
  '“We don’t rush the dough. Good food, like good company, is always worth the wait.”',
  '“From our family kitchen to your table — a little taste of Venezuela in every arepa.”',
];

export default function ScheduleAndPhilosophy() {
  const [active, setActive] = useState(0);
  return (
    <section className="py-12 bg-[#fdf8f2]">
      <div className="max-w-screen-xl mx-auto px-4 lg:px-8 grid md:grid-cols-2 gap-6 items-stretch">
        {/* Schedule card */}
        <div className="bg-white rounded-2xl shadow-card p-7 md:p-8 flex flex-col">
          <h2 className="font-sans font-extrabold text-xl text-foreground">Schedule for Later</h2>
          <p className="font-body text-sm text-muted-foreground mt-1.5 mb-5">Skip the queue. Pick a time that suits your joy.</p>
          <div className="flex-1"><SchedulePicker prefix="home-schedule" scheduleOnly /></div>
          <Link
            data-testid="home-scheduled-menu"
            href="/menu-browser"
            className="inline-flex items-center justify-center gap-2 self-start bg-primary text-white px-5 py-3 rounded-xl text-sm font-semibold mt-6 hover:opacity-90 transition-opacity"
          >
            <CalendarCheck size={16} /> Set Schedule
          </Link>
        </div>

        {/* Philosophy card */}
        <div className="bg-white rounded-2xl shadow-card p-7 md:p-8 flex flex-col">
          <span className="inline-flex items-center justify-center w-9 h-9 rounded-full mb-3" style={{ background: '#f6e8ec', color: '#7a2a3a' }}>
            <Star size={16} fill="#7a2a3a" />
          </span>
          <h2 className="font-sans font-extrabold text-xl text-foreground mb-4">The Lolita Philosophy</h2>
          <div className="relative flex-1">
            <Quote size={44} className="absolute -top-2 -left-1 text-foreground opacity-[0.07]" />
            <p data-testid="philosophy-quote" className="relative font-body text-muted-foreground leading-relaxed px-2">{quotes[active]}</p>
          </div>
          <div className="flex gap-2 mt-6">
            {quotes.map((_, i) => (
              <button
                key={i}
                data-testid={`philosophy-dot-${i}`}
                aria-label={`Quote ${i + 1}`}
                onClick={() => setActive(i)}
                className={`w-2.5 h-2.5 rounded-full transition-colors ${i === active ? 'bg-primary' : 'bg-border hover:bg-primary/40'}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
