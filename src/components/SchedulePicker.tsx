'use client';
import { useEffect } from 'react';
import { CalendarClock, Clock } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { useBakeryToday } from '@/lib/hooks/useAvailability';
import { bakeryTimezone } from '@/lib/inventory';

export const SchedulePicker = ({ prefix = 'schedule', disabled = false, scheduleOnly = false }: { prefix?: string; disabled?: boolean; scheduleOnly?: boolean }) => {
  const { mode, date, time, setSchedule, hydrated } = useCartStore();
  const today = useBakeryToday();
  useEffect(() => {
    if (scheduleOnly && hydrated && mode !== 'later') setSchedule({ mode: 'later', date: date || today });
  }, [scheduleOnly, hydrated, mode, date, today, setSchedule]);
  const maximum = new Date(`${today}T12:00:00`); maximum.setDate(maximum.getDate() + 365);
  const maxDate = `${maximum.getFullYear()}-${String(maximum.getMonth() + 1).padStart(2,'0')}-${String(maximum.getDate()).padStart(2,'0')}`;
  const showFields = scheduleOnly || mode === 'later';
  return <fieldset disabled={disabled || !hydrated} data-ready={hydrated} data-mode={mode} className="space-y-3 min-w-0" data-testid={`${prefix}-picker`}>
    <legend className="font-semibold text-sm mb-3">{scheduleOnly ? 'Pick a date & time' : 'Order time'}</legend>
    {!scheduleOnly && <div className="flex flex-wrap gap-2">
      {(['now','later'] as const).map(value => <button key={value} type="button" data-testid={`${prefix}-${value}`} aria-pressed={mode === value}
        onClick={() => setSchedule({ mode: value, date: date || today })}
        className={`inline-flex items-center gap-2 border rounded-lg px-3 py-2 text-sm transition-colors ${mode === value ? 'border-primary bg-pink-light text-primary' : 'border-border bg-white hover:bg-muted'}`}>
        {value === 'now' ? <Clock size={15} /> : <CalendarClock size={15} />}{value === 'now' ? 'Order now' : 'Schedule for Later'}
      </button>)}
    </div>}
    {showFields && <div className="flex flex-wrap gap-3 items-end">
      <label className="text-xs font-medium min-w-0">Date
        <input data-testid={`${prefix}-date`} aria-label="Order date" type="date" min={today} max={maxDate} value={date}
          onChange={e => setSchedule({ date: e.target.value })} className="block border border-border rounded-lg p-2 mt-1 w-full bg-white text-sm" />
      </label>
      <label className="text-xs font-medium min-w-0">Time
        <input data-testid={`${prefix}-time`} aria-label="Order time" type="time" value={time} onChange={e => setSchedule({ time: e.target.value })}
          className="block border border-border rounded-lg p-2 mt-1 w-full bg-white text-sm" />
      </label>
      <span data-testid={`${prefix}-timezone`} className="text-xs text-muted-foreground pb-2">{bakeryTimezone.replace('_',' ')}</span>
    </div>}
  </fieldset>;
};