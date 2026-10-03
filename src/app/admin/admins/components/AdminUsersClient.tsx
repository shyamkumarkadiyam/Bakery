'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ShieldCheck, ShieldOff, UserPlus, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface UserRow {
  id: string;
  email: string;
  role: string;
  created_at: string;
}

export default function AdminUsersClient() {
  const supabase = createClient();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [promoting, setPromoting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const { data, error } = await supabase.rpc('admin_list_users');
    if (error) setError(error.message || 'Could not load users.');
    else setUsers((data as UserRow[]) || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  const setRole = async (targetEmail: string, newRole: 'admin' | 'customer', id?: string) => {
    if (id) setBusyId(id); else setPromoting(true);
    const { error } = await supabase.rpc('admin_set_user_role', { target_email: targetEmail, new_role: newRole });
    if (error) {
      toast.error(error.message || 'Could not update role.');
    } else {
      toast.success(newRole === 'admin' ? `${targetEmail} is now an admin.` : `${targetEmail} is now a customer.`);
      if (!id) setEmail('');
      await load();
    }
    setBusyId(null);
    setPromoting(false);
  };

  const handlePromote = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    await setRole(trimmed, 'admin');
  };

  return (
    <div className="space-y-6" data-testid="admin-users-panel">
      <form onSubmit={handlePromote} className="bg-white border border-border rounded-2xl shadow-card p-5">
        <h3 className="font-bold text-foreground mb-1">Make someone an admin</h3>
        <p className="text-sm text-muted-foreground mb-4">Enter the email of an existing registered account to grant admin access.</p>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            data-testid="admin-promote-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="person@example.com"
            className="flex-1 border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <button
            data-testid="admin-promote-submit"
            type="submit"
            disabled={promoting}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            <UserPlus size={15} />
            {promoting ? 'Granting…' : 'Grant admin'}
          </button>
        </div>
      </form>

      <div className="flex items-center justify-between">
        <h3 className="font-bold text-foreground">All accounts ({users.length})</h3>
        <button data-testid="admin-users-refresh" onClick={load} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary px-3 py-2 rounded-lg border border-border bg-white">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {error && <div data-testid="admin-users-error" role="alert" className="text-red-700 bg-red-50 p-3 rounded-lg text-sm">{error}</div>}

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-7 h-7 rounded-full border-4 border-primary border-t-transparent animate-spin" /></div>
      ) : (
        <div className="bg-white border border-border rounded-2xl shadow-card overflow-hidden divide-y divide-border">
          {users.map((u) => (
            <div key={u.id} data-testid={`admin-user-${u.id}`} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{u.email}</p>
                <span className={`inline-block mt-0.5 text-[11px] font-bold px-2 py-0.5 rounded-full ${u.role === 'admin' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                  {u.role}
                </span>
              </div>
              {u.role === 'admin' ? (
                <button
                  data-testid={`admin-user-demote-${u.id}`}
                  onClick={() => setRole(u.email, 'customer', u.id)}
                  disabled={busyId === u.id}
                  className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-red-600 border border-border rounded-lg px-3 py-1.5 disabled:opacity-50"
                >
                  <ShieldOff size={13} /> Revoke
                </button>
              ) : (
                <button
                  data-testid={`admin-user-promote-${u.id}`}
                  onClick={() => setRole(u.email, 'admin', u.id)}
                  disabled={busyId === u.id}
                  className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:bg-primary/10 border border-border rounded-lg px-3 py-1.5 disabled:opacity-50"
                >
                  <ShieldCheck size={13} /> Make admin
                </button>
              )}
            </div>
          ))}
          {users.length === 0 && <div className="px-4 py-10 text-center text-sm text-muted-foreground">No accounts found.</div>}
        </div>
      )}
    </div>
  );
}
