'use client';
import React from 'react';
import { Search } from 'lucide-react';

const filterTabs = [
  { id: 'all', label: 'All Orders' },
  { id: 'pending', label: 'Pending' },
  { id: 'confirmed', label: 'Confirmed' },
  { id: 'packaging', label: 'Packaging' },
  { id: 'enroute', label: 'En Route' },
  { id: 'delivered', label: 'Delivered' },
  { id: 'pickup', label: 'Pickup Ready' },
];

interface OrderFiltersProps {
  activeFilter: string;
  setActiveFilter: (f: string) => void;
  counts: Record<string, number>;
  search: string;
  setSearch: (s: string) => void;
}

export default function OrderFilters({
  activeFilter,
  setActiveFilter,
  counts,
  search,
  setSearch,
}: OrderFiltersProps) {
  return (
    <div className="bg-white rounded-3xl border border-border shadow-card p-4 space-y-3">
      {/* Search */}
      <div className="relative w-full sm:max-w-sm">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by order ID or customer name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 bg-input border border-border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Status Tabs */}
      <div className="flex flex-wrap gap-2">
        {filterTabs.map((tab) => {
          const count = counts[tab.id] ?? 0;
          const isActive = activeFilter === tab.id;
          return (
            <button
              key={`filter-${tab.id}`}
              onClick={() => setActiveFilter(tab.id)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                isActive
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-muted text-muted-foreground hover:bg-pink-mid hover:text-foreground'
              }`}
            >
              {tab.label}
              <span
                className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full ${
                  isActive ? 'bg-white/30 text-white' : 'bg-white text-foreground'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}