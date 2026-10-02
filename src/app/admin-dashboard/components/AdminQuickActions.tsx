'use client';
import React, { useState } from 'react';
import { PauseCircle, PlayCircle, Plus, Bell, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

export default function AdminQuickActions() {
  const [paused, setPaused] = useState(false);

  const handlePauseToggle = () => {
    setPaused(!paused);
    toast(paused ? '✅ Orders resumed — accepting new orders' : '⏸️ Orders paused — no new orders will be accepted', {
      duration: 3000,
    });
  };

  const handleJustBaked = () => {
    toast?.success('🔔 Just Baked alert sent to 87 opted-in customers!');
  };

  return (
    <div className="bg-white rounded-3xl border border-border shadow-card p-5">
      <h3 className="font-bold text-foreground mb-4">Quick Actions</h3>
      <div className="flex flex-wrap gap-3">
        <button
          onClick={handlePauseToggle}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-bold transition-all border-2 ${
            paused
              ? 'bg-green-soft text-green-text border-green-text/30 hover:bg-green-100' :'bg-red-soft text-red-text border-red-text/30 hover:bg-red-100'
          }`}
        >
          {paused ? <PlayCircle size={16} /> : <PauseCircle size={16} />}
          {paused ? 'Resume Orders' : 'Pause Orders'}
        </button>

        <Link
          href="/admin-menu"
          className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-bold bg-pink-light text-primary border-2 border-primary/20 hover:bg-pink-mid transition-all"
        >
          <Plus size={16} />
          Add Menu Item
        </Link>

        <button
          onClick={handleJustBaked}
          className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-bold bg-amber-soft text-amber-text border-2 border-amber-text/20 hover:bg-amber-100 transition-all"
        >
          <Bell size={16} />
          Send Just Baked Alert
        </button>

        <Link
          href="/order-management"
          className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-bold bg-muted text-foreground border-2 border-border hover:bg-pink-light transition-all"
        >
          <ShoppingBag size={16} />
          View All Orders
        </Link>
      </div>

      {paused && (
        <div className="mt-4 bg-red-soft border border-red-text/20 rounded-2xl px-4 py-3 flex items-center gap-2">
          <PauseCircle size={16} className="text-red-text flex-shrink-0" />
          <p className="text-xs text-red-text font-semibold">
            Orders are paused. Customers cannot place new orders until you resume.
          </p>
        </div>
      )}
    </div>
  );
}