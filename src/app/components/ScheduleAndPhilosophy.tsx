'use client';
import React, { useState, useEffect } from 'react';
import { CalendarClock, ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const philosophySlides = [
  {
    id: 'slide-1',
    quote: '"We believe food should look as sweet as it tastes. Each arepa is a canvas, each cachapa a warm hug, and every customer a guest in our Venezuelan dream."',
  },
  {
    id: 'slide-2',
    quote: '"Every bite we craft carries the warmth of home — made with love, tradition, and the finest ingredients from our roots."',
  },
  {
    id: 'slide-3',
    quote: '"From our kitchen to your table, we pour our hearts into every sweet creation, because you deserve nothing less than extraordinary."',
  },
];

interface DayAvailability {
  date: string;
  isBlocked: boolean;
  hasLimits: boolean;
  fullyBooked: boolean;
}

function formatDate(d: Date) {
  return d.toISOString().split('T')[0];
}

function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export default function ScheduleAndPhilosophy() {
  const [activeSlide, setActiveSlide] = useState(0);
  const [showScheduler, setShowScheduler] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [monthOffset, setMonthOffset] = useState(0);
  const [availability, setAvailability] = useState<DayAvailability[]>([]);
  const [loadingAvail, setLoadingAvail] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const today = new Date();
  const viewMonth = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();
  const firstDayOfWeek = viewMonth.getDay();

  useEffect(() => {
    if (!showScheduler) return;
    const fetchAvailability = async () => {
      setLoadingAvail(true);
      try {
        const supabase = createClient();
        const monthStart = formatDate(viewMonth);
        const monthEnd = formatDate(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0));

        const [blockedRes, rulesRes] = await Promise.all([
          supabase.from('blocked_dates').select('blocked_date').gte('blocked_date', monthStart).lte('blocked_date', monthEnd),
          supabase.from('availability_rules').select('item_id, rule_date, daily_limit, orders_taken, is_blocked').gte('rule_date', monthStart).lte('rule_date', monthEnd),
        ]);

        const blockedSet = new Set((blockedRes.data || []).map((b: any) => b.blocked_date));
        const rulesByDate: Record<string, any[]> = {};
        (rulesRes.data || []).forEach((r: any) => {
          if (!rulesByDate[r.rule_date]) rulesByDate[r.rule_date] = [];
          rulesByDate[r.rule_date].push(r);
        });

        const avail: DayAvailability[] = [];
        for (let d = 1; d <= daysInMonth; d++) {
          const date = formatDate(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), d));
          const isBlocked = blockedSet.has(date);
          const dayRules = rulesByDate[date] || [];
          const hasLimits = dayRules.some((r) => r.daily_limit > 0);
          const fullyBooked = dayRules.length > 0 && dayRules.every((r) => r.is_blocked || (r.daily_limit > 0 && r.orders_taken >= r.daily_limit));
          avail.push({ date, isBlocked, hasLimits, fullyBooked });
        }
        setAvailability(avail);
      } catch (err) {
        console.error('Fetch availability error:', err);
      } finally {
        setLoadingAvail(false);
      }
    };
    fetchAvailability();
  }, [showScheduler, monthOffset]);

  const getDayAvail = (date: string) => availability.find((a) => a.date === date);

  const handleConfirm = () => {
    if (!selectedDate) return;
    setConfirmed(true);
    setTimeout(() => {
      setShowScheduler(false);
      setConfirmed(false);
    }, 2000);
  };

  const monthName = viewMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const dayLabels = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  return (
    <section className="py-10 bg-[#fdf8f2]">
      <div className="max-w-screen-xl mx-auto px-4 lg:px-8">
        <div className="grid md:grid-cols-2 gap-6 items-start">

          {/* Schedule for Later Card */}
          <div className="relative bg-[#f5f0f2] rounded-3xl p-7 overflow-hidden">
            <div className="absolute right-4 top-4 opacity-10">
              <CalendarClock size={110} strokeWidth={1} className="text-[#7a2a3a]" />
            </div>

            <h2 className="font-sans font-extrabold text-2xl md:text-3xl text-[#1a1a1a] mb-2 relative z-10">
              Schedule for Later
            </h2>
            <p className="font-body text-[#6b5a5e] text-sm mb-6 relative z-10">
              Skip the queue. Pick a time that suits your joy.
            </p>

            {!showScheduler ? (
              <button
                onClick={() => setShowScheduler(true)}
                className="relative z-10 flex items-center gap-2 px-5 py-2.5 rounded-full text-white text-sm font-sans font-semibold transition-opacity hover:opacity-90"
                style={{ background: '#2a6a7a' }}
              >
                <CalendarClock size={15} />
                Set Schedule
              </button>
            ) : (
              <div className="relative z-10 bg-white rounded-2xl p-4 shadow-sm border border-[#e8dde2]">
                {/* Month Nav */}
                <div className="flex items-center justify-between mb-3">
                  <button
                    onClick={() => setMonthOffset((m) => m - 1)}
                    disabled={monthOffset <= 0}
                    className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-30 transition-colors"
                  >
                    <ChevronLeft size={15} />
                  </button>
                  <span className="text-sm font-bold text-foreground">{monthName}</span>
                  <button
                    onClick={() => setMonthOffset((m) => m + 1)}
                    className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                  >
                    <ChevronRight size={15} />
                  </button>
                </div>

                {/* Day Labels */}
                <div className="grid grid-cols-7 mb-1">
                  {dayLabels.map((d) => (
                    <div key={d} className="text-center text-[10px] font-semibold text-muted-foreground py-1">{d}</div>
                  ))}
                </div>

                {/* Calendar Grid */}
                {loadingAvail ? (
                  <div className="flex justify-center py-6">
                    <div className="w-5 h-5 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                  </div>
                ) : (
                  <div className="grid grid-cols-7 gap-0.5">
                    {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                      <div key={`empty-${i}`} />
                    ))}
                    {Array.from({ length: daysInMonth }, (_, i) => {
                      let d = i + 1;
                      const date = formatDate(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), d));
                      const avail = getDayAvail(date);
                      const isPast = new Date(date) < new Date(formatDate(today));
                      const isBlocked = avail?.isBlocked || false;
                      const isFull = avail?.fullyBooked || false;
                      const isSelected = selectedDate === date;
                      const isDisabled = isPast || isBlocked || isFull;

                      return (
                        <button
                          key={date}
                          disabled={isDisabled}
                          onClick={() => setSelectedDate(date)}
                          className={`aspect-square flex items-center justify-center rounded-lg text-xs font-semibold transition-all ${
                            isSelected
                              ? 'bg-[#2a6a7a] text-white'
                              : isDisabled
                              ? 'text-muted-foreground/40 cursor-not-allowed line-through'
                              : avail?.hasLimits
                              ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200' :'hover:bg-[#f5f0f2] text-foreground'
                          }`}
                          title={isBlocked ? 'Closed' : isFull ? 'Fully booked' : undefined}
                        >
                          {d}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Legend */}
                <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-border">
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <span className="w-3 h-3 rounded bg-amber-100 border border-amber-200 inline-block" />
                    Limited slots
                  </span>
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <span className="w-3 h-3 rounded bg-muted inline-block opacity-40" />
                    Unavailable
                  </span>
                </div>

                {/* Selected Date + Confirm */}
                {selectedDate && !confirmed && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <p className="text-xs text-muted-foreground mb-2">
                      Selected:{' '}
                      <span className="font-bold text-foreground">
                        {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                      </span>
                    </p>
                    <button
                      onClick={handleConfirm}
                      className="w-full py-2 rounded-xl text-white text-sm font-semibold transition-opacity hover:opacity-90"
                      style={{ background: '#2a6a7a' }}
                    >
                      Confirm Date
                    </button>
                  </div>
                )}

                {confirmed && (
                  <div className="mt-3 flex items-center gap-2 text-green-700 bg-green-50 rounded-xl px-3 py-2">
                    <CheckCircle size={15} />
                    <span className="text-xs font-semibold">Date scheduled!</span>
                  </div>
                )}

                <button
                  onClick={() => { setShowScheduler(false); setSelectedDate(null); }}
                  className="mt-2 w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {/* The Lolita Philosophy Carousel Card */}
          <div className="relative bg-[#ede8ec] rounded-3xl p-7 overflow-hidden min-h-[320px] flex flex-col justify-between">
            <span className="absolute left-3 top-2 text-[120px] leading-none font-serif text-[#c8b8c0] opacity-30 select-none">&ldquo;</span>
            <span className="absolute right-3 bottom-10 text-[120px] leading-none font-serif text-[#c8b8c0] opacity-30 select-none">&rdquo;</span>

            <div className="relative z-10 flex flex-col items-center text-center flex-1">
              <span className="text-[#7a2a3a] text-2xl mb-3">★</span>
              <h2 className="font-sans font-extrabold text-2xl md:text-3xl text-[#1a1a1a] mb-4 leading-tight">
                The Lolita<br />Philosophy
              </h2>
              <p className="font-body text-[#3a2a2e] text-sm md:text-base leading-relaxed max-w-xs">
                {philosophySlides?.[activeSlide]?.quote}
              </p>
            </div>

            <div className="relative z-10 flex items-center justify-center gap-2 mt-6">
              {philosophySlides?.map((slide, idx) => (
                <button
                  key={slide?.id}
                  onClick={() => setActiveSlide(idx)}
                  aria-label={`Go to slide ${idx + 1}`}
                  className={`rounded-full transition-all duration-300 ${
                    idx === activeSlide ? 'w-7 h-2 bg-[#c0607a]' : 'w-2 h-2 bg-[#c0a0aa]'
                  }`}
                />
              ))}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
