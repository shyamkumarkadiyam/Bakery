'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ClipboardList,
  UtensilsCrossed,
  CalendarClock,
  Package,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Home,
} from 'lucide-react';



const navGroups = [
  {
    label: 'Operations',
    items: [
      { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
      { label: 'Orders', href: '/admin/orders', icon: ClipboardList, badge: 0 },
      { label: 'Menu', href: '/admin/menu', icon: UtensilsCrossed },
    ],
  },
  {
    label: 'Business',
    items: [
      { label: 'Availability', href: '/admin/availability', icon: CalendarClock },
      { label: 'Inventory', href: '/admin/inventory', icon: Package },
    ],
  },
];

interface AdminLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export default function AdminLayout({ children, title }: AdminLayoutProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={`hidden lg:flex flex-col fixed top-0 left-0 h-full z-40 bg-white border-r border-border transition-all duration-300 ease-in-out ${
          collapsed ? 'w-16' : 'w-60'
        }`}
      >
        {/* Brand */}
        <div className={`flex items-center gap-2 p-4 border-b border-border ${collapsed ? 'justify-center' : ''}`}>
          {!collapsed && (
            <span className="font-sans font-bold text-base text-foreground tracking-tight">
              Lolita Admin
            </span>
          )}
          {collapsed && (
            <span className="font-sans font-bold text-sm text-primary">LA</span>
          )}
        </div>

        {/* Nav Groups */}
        <nav className="flex-1 overflow-y-auto py-4 px-2">
          {navGroups.map((group) => (
            <div key={`group-${group.label}`} className="mb-4">
              {!collapsed && (
                <p className="font-sans text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-3 mb-1.5">
                  {group.label}
                </p>
              )}
              {group.items.map((item) => {
                const active = pathname === item.href;
                const NavIcon = item.icon;
                return (
                  <Link
                    key={`admin-nav-${item.href}`}
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 transition-all font-sans text-sm font-semibold ${
                      active
                        ? 'sidebar-active' :'text-muted-foreground hover:bg-muted hover:text-foreground'
                    } ${collapsed ? 'justify-center' : ''}`}
                  >
                    <NavIcon size={17} className="flex-shrink-0" />
                    {!collapsed && <span className="flex-1">{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Bottom */}
        <div className="p-2 border-t border-border space-y-1">
          <Link
            href="/"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-sans text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors ${collapsed ? 'justify-center' : ''}`}
            title={collapsed ? 'Customer View' : undefined}
          >
            <Home size={17} />
            {!collapsed && <span>Customer View</span>}
          </Link>
          <button
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-sans text-sm font-semibold text-muted-foreground hover:bg-red-soft hover:text-red-text transition-colors ${collapsed ? 'justify-center' : ''}`}
            title={collapsed ? 'Sign Out' : undefined}
          >
            <LogOut size={17} />
            {!collapsed && <span>Sign Out</span>}
          </button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center p-2 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main
        className={`flex-1 min-h-screen transition-all duration-300 ${
          collapsed ? 'lg:ml-16' : 'lg:ml-60'
        }`}
      >
        {title && (
          <div className="bg-white border-b border-border px-6 lg:px-8 py-4 sticky top-0 z-30">
            <h1 className="font-sans font-bold text-xl text-foreground">{title}</h1>
          </div>
        )}
        <div className="p-4 lg:p-8 max-w-screen-2xl mx-auto">{children}</div>
      </main>
    </div>
  );
}