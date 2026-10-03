'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import {
  LayoutDashboard,
  ClipboardList,
  UtensilsCrossed,
  Package,
  ShieldCheck,
  Tag,
  Cake,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Home,
  Lock,
} from 'lucide-react';



const navGroups = [
  {
    label: 'Operations',
    items: [
      { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
      { label: 'Orders', href: '/admin/orders', icon: ClipboardList, badge: 0 },
      { label: 'Menu', href: '/admin/menu', icon: UtensilsCrossed },
      { label: 'Cake Quotes', href: '/admin/quotes', icon: Cake },
    ],
  },
  {
    label: 'Business',
    items: [
      { label: 'Offers', href: '/admin/offers', icon: Tag },
      { label: 'Inventory', href: '/admin/inventory', icon: Package },
      { label: 'Admins', href: '/admin/admins', icon: ShieldCheck },
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
  const router=useRouter(); const {user,loading,signOut}=useAuth(); const [signingOut,setSigningOut]=useState(false);
  const [access,setAccess]=useState<'checking'|'denied'|'ok'>('checking');
  const handleSignOut=async()=>{
    setSigningOut(true);
    try{await signOut();router.push('/login');router.refresh();}
    catch{toast.error('Unable to sign out. Please retry.');}
    finally{setSigningOut(false);}
  };

  useEffect(()=>{
    let active=true;
    if(loading)return;
    if(!user){router.replace('/login?redirect='+encodeURIComponent(pathname||'/admin'));return;}
    (async()=>{
      const supabase=createClient();
      const {data}=await supabase.from('user_profiles').select('role').eq('id',user.id).single();
      if(!active)return;
      setAccess(data?.role==='admin'?'ok':'denied');
    })();
    return ()=>{active=false;};
  },[user,loading,pathname,router]);

  if(loading||access==='checking'){
    return <div data-testid="admin-auth-checking" className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin"/>
    </div>;
  }

  if(access==='denied'){
    return <div data-testid="admin-access-denied" className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-sm w-full bg-white border border-border rounded-2xl shadow-card p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4"><Lock size={22}/></div>
        <h2 className="font-bold text-lg text-foreground mb-1">Administrator access required</h2>
        <p className="text-sm text-muted-foreground mb-6">Your account doesn’t have admin permissions. Sign in with an admin account to continue.</p>
        <div className="flex gap-3 justify-center">
          <Link data-testid="admin-denied-home" href="/" className="px-4 py-2 rounded-lg border border-border text-sm font-semibold text-muted-foreground hover:bg-muted">Go home</Link>
          <button data-testid="admin-denied-signout" onClick={handleSignOut} disabled={signingOut} className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-50">Sign in as admin</button>
        </div>
      </div>
    </div>;
  }

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
                    data-testid={`admin-nav-${item.label.toLowerCase()}`}
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
            data-testid="admin-customer-view"
            href="/"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-sans text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors ${collapsed ? 'justify-center' : ''}`}
            title={collapsed ? 'Customer View' : undefined}
          >
            <Home size={17} />
            {!collapsed && <span>Customer View</span>}
          </Link>
          <button
            data-testid="admin-sign-out"
            onClick={handleSignOut}
            disabled={signingOut}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-sans text-sm font-semibold text-muted-foreground hover:bg-red-soft hover:text-red-text transition-colors ${collapsed ? 'justify-center' : ''}`}
            title={collapsed ? 'Sign Out' : undefined}
          >
            <LogOut size={17} />
            {!collapsed && <span>Sign Out</span>}
          </button>
          <button
            data-testid="admin-sidebar-collapse"
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center p-2 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main
        className={`flex-1 min-w-0 min-h-screen transition-all duration-300 ${
          collapsed ? 'lg:ml-16' : 'lg:ml-60'
        }`}
      >
        <nav aria-label="Admin navigation" className="lg:hidden flex flex-wrap items-center gap-2 p-3 border-b border-border bg-white">
          {navGroups.flatMap(group=>group.items).map(item=><Link key={item.href} href={item.href} data-testid={`admin-mobile-${item.label.toLowerCase()}`}
            className={`px-2 py-2 rounded-lg text-xs font-semibold ${pathname===item.href?'bg-primary text-white':'hover:bg-muted'}`}>{item.label}</Link>)}
          <button data-testid="admin-mobile-sign-out" disabled={signingOut} onClick={handleSignOut} aria-label="Sign out" title="Sign out" className="p-2 text-muted-foreground hover:text-red-600"><LogOut size={16}/></button>
        </nav>
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