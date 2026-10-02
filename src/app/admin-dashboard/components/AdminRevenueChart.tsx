'use client';
import React from 'react';
import dynamic from 'next/dynamic';

const RevenueChartInner = dynamic(() => import('./RevenueChartInner'), { ssr: false });

export default function AdminRevenueChart() {
  return (
    <div className="bg-white rounded-3xl border border-border shadow-card p-5 h-full">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="font-bold text-foreground">Weekly Order Volume</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Orders per day — this week</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground bg-muted rounded-full px-3 py-1.5">
          Sep 15–21
        </div>
      </div>
      <RevenueChartInner />
    </div>
  );
}