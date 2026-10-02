'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { CalendarX, Plus, Trash2, RefreshCw, ChevronLeft, ChevronRight, Save, X } from 'lucide-react';

interface MenuItem {
  id: string;
  name: string;
  category: string;
}

interface AvailabilityRule {
  id: string;
  itemId: string;
  itemName: string;
  ruleDate: string;
  dailyLimit: number;
  ordersTaken: number;
  isBlocked: boolean;
  notes: string;
}

interface BlockedDate {
  id: string;
  blockedDate: string;
  reason: string;
}

const DEFAULT_DAILY_LIMIT = 5;

function formatDate(d: Date) {
  return d.toISOString().split('T')[0];
}

function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function getWeekDates(anchor: Date) {
  const start = new Date(anchor);
  start.setDate(start.getDate() - start.getDay()); // Sunday
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

const CATEGORY_LABELS: Record<string, string> = {
  arepa: 'Arepas', empanada: 'Empanadas', patacon: 'Patacones',
  cachapa: 'Cachapas', tequeno: 'Tequeños', sweet: 'Sweets',
};

export default function AvailabilityClient() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [rules, setRules] = useState<AvailabilityRule[]>([]);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekAnchor, setWeekAnchor] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
  const [editingRule, setEditingRule] = useState<{ itemId: string; limit: number; blocked: boolean; notes: string } | null>(null);
  const [savingRule, setSavingRule] = useState(false);
  const [blockDateInput, setBlockDateInput] = useState('');
  const [blockReasonInput, setBlockReasonInput] = useState('');
  const [addingBlock, setAddingBlock] = useState(false);
  const supabase = createClient();

  const weekDates = getWeekDates(weekAnchor);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [itemsRes, rulesRes, blockedRes] = await Promise.all([
        supabase.from('menu_items').select('id, name, category').order('category').order('name'),
        supabase.from('availability_rules').select('*').order('rule_date'),
        supabase.from('blocked_dates').select('*').order('blocked_date'),
      ]);

      if (itemsRes.data) setMenuItems(itemsRes.data);
      if (rulesRes.data) {
        setRules(rulesRes.data.map((r: any) => ({
          id: r.id,
          itemId: r.item_id,
          itemName: '',
          ruleDate: r.rule_date,
          dailyLimit: r.daily_limit,
          ordersTaken: r.orders_taken,
          isBlocked: r.is_blocked,
          notes: r.notes,
        })));
      }
      if (blockedRes.data) {
        setBlockedDates(blockedRes.data.map((b: any) => ({
          id: b.id,
          blockedDate: b.blocked_date,
          reason: b.reason,
        })));
      }
    } catch (err) {
      console.error('Fetch availability error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Real-time sync
    const channel = supabase
      .channel('availability_admin_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'availability_rules' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'blocked_dates' }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchData]);

  const getRuleForItem = (itemId: string, date: string) =>
    rules.find((r) => r.itemId === itemId && r.ruleDate === date);

  const isDateBlocked = (date: string) =>
    blockedDates.some((b) => b.blockedDate === date);

  const saveRule = async () => {
    if (!editingRule) return;
    setSavingRule(true);
    try {
      const existing = getRuleForItem(editingRule.itemId, selectedDate);
      if (existing) {
        await supabase
          .from('availability_rules')
          .update({
            daily_limit: editingRule.limit,
            is_blocked: editingRule.blocked,
            notes: editingRule.notes,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
      } else {
        await supabase.from('availability_rules').insert({
          item_id: editingRule.itemId,
          rule_date: selectedDate,
          daily_limit: editingRule.limit,
          orders_taken: 0,
          is_blocked: editingRule.blocked,
          notes: editingRule.notes,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }

      // If blocking/unblocking for today, sync menu_items.available
      const today = formatDate(new Date());
      if (selectedDate === today) {
        await supabase
          .from('menu_items')
          .update({ available: !editingRule.blocked, updated_at: new Date().toISOString() })
          .eq('id', editingRule.itemId);
        await supabase
          .from('menu_stock')
          .update({ is_available: !editingRule.blocked, updated_at: new Date().toISOString() })
          .eq('item_id', editingRule.itemId);
      }

      setEditingRule(null);
      fetchData();
    } catch (err) {
      console.error('Save rule error:', err);
    } finally {
      setSavingRule(false);
    }
  };

  const deleteRule = async (itemId: string, date: string) => {
    const rule = getRuleForItem(itemId, date);
    if (!rule) return;
    await supabase.from('availability_rules').delete().eq('id', rule.id);
    // If deleting today's rule, restore availability
    const today = formatDate(new Date());
    if (date === today) {
      await supabase
        .from('menu_items')
        .update({ available: true, updated_at: new Date().toISOString() })
        .eq('id', itemId);
      await supabase
        .from('menu_stock')
        .update({ is_available: true, updated_at: new Date().toISOString() })
        .eq('item_id', itemId);
    }
    fetchData();
  };

  const addBlockedDate = async () => {
    if (!blockDateInput) return;
    setAddingBlock(true);
    try {
      await supabase.from('blocked_dates').insert({
        blocked_date: blockDateInput,
        reason: blockReasonInput.trim() || 'Closed',
        created_at: new Date().toISOString(),
      });
      setBlockDateInput('');
      setBlockReasonInput('');
      fetchData();
    } catch (err) {
      console.error('Add blocked date error:', err);
    } finally {
      setAddingBlock(false);
    }
  };

  const removeBlockedDate = async (id: string) => {
    await supabase.from('blocked_dates').delete().eq('id', id);
    fetchData();
  };

  const selectedDateBlocked = isDateBlocked(selectedDate);
  const selectedDateItems = menuItems;

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-xs text-blue-700">
        <strong>How it works:</strong> Each item has a default availability of <strong>{DEFAULT_DAILY_LIMIT} units/day</strong>. 
        Set a custom daily limit or block individual items for a specific date. Blocking an item today marks it out-of-stock in the customer menu immediately.
      </div>

      {/* Week Navigator */}
      <div className="bg-white border border-border rounded-2xl shadow-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-foreground">Select Date</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setWeekAnchor((w) => addDays(w, -7))}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-semibold text-muted-foreground px-2">
              {weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} –{' '}
              {weekDates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
            <button
              onClick={() => setWeekAnchor((w) => addDays(w, 7))}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {weekDates.map((d, i) => {
            const ds = formatDate(d);
            const isSelected = ds === selectedDate;
            const isBlocked = isDateBlocked(ds);
            const isToday = ds === formatDate(new Date());
            return (
              <button
                key={ds}
                onClick={() => setSelectedDate(ds)}
                className={`flex flex-col items-center py-2 px-1 rounded-xl text-xs font-semibold transition-all ${
                  isSelected
                    ? 'bg-primary text-white'
                    : isBlocked
                    ? 'bg-red-100 text-red-700 border border-red-200'
                    : isToday
                    ? 'bg-pink-light text-primary border border-primary/20' :'hover:bg-muted text-muted-foreground'
                }`}
              >
                <span className="text-[10px] uppercase">{dayLabels[i]}</span>
                <span className="text-sm font-bold">{d.getDate()}</span>
                {isBlocked && <span className="text-[8px] mt-0.5">Closed</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Per-Item Limits for Selected Date */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-foreground">
              Item Limits —{' '}
              <span className="text-primary">
                {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </span>
            </h3>
            {selectedDateBlocked && (
              <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-semibold">
                🚫 Orders Blocked
              </span>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 rounded-full border-4 border-primary border-t-transparent animate-spin" />
            </div>
          ) : (
            <div className="bg-white border border-border rounded-2xl shadow-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Item</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Daily Limit</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Taken</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {selectedDateItems.map((item) => {
                    const rule = getRuleForItem(item.id, selectedDate);
                    const isEditing = editingRule?.itemId === item.id;
                    const taken = rule?.ordersTaken ?? 0;
                    // Default limit is 5 if no rule set
                    const limit = rule ? rule.dailyLimit : DEFAULT_DAILY_LIMIT;
                    const blocked = rule?.isBlocked ?? false;
                    const isFull = limit > 0 && taken >= limit;

                    return (
                      <tr key={item.id} className={`transition-colors ${isEditing ? 'bg-primary/5' : 'hover:bg-muted/30'}`}>
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-semibold text-foreground text-sm">{item.name}</p>
                            <p className="text-xs text-muted-foreground">{CATEGORY_LABELS[item.category] || item.category}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isEditing ? (
                            <input
                              type="number"
                              min={0}
                              value={editingRule.limit}
                              onChange={(e) => setEditingRule((r) => r ? { ...r, limit: parseInt(e.target.value) || 0 } : null)}
                              className="w-20 border border-border rounded-lg px-2 py-1 text-center text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                            />
                          ) : (
                            <span className="font-medium text-foreground">
                              {rule ? (
                                limit === 0 ? <span className="text-muted-foreground text-xs">Unlimited</span> : limit
                              ) : (
                                <span className="text-muted-foreground text-xs">{DEFAULT_DAILY_LIMIT} <span className="text-[10px]">(default)</span></span>
                              )}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`font-bold ${isFull ? 'text-red-500' : 'text-foreground'}`}>{taken}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isEditing ? (
                            <label className="flex items-center justify-center gap-1.5 cursor-pointer text-xs font-medium">
                              <input
                                type="checkbox"
                                checked={editingRule.blocked}
                                onChange={(e) => setEditingRule((r) => r ? { ...r, blocked: e.target.checked } : null)}
                                className="accent-red-500"
                              />
                              Block
                            </label>
                          ) : (
                            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                              blocked || selectedDateBlocked
                                ? 'bg-red-100 text-red-700'
                                : isFull
                                ? 'bg-amber-100 text-amber-700' :'bg-green-100 text-green-700'
                            }`}>
                              {blocked || selectedDateBlocked ? 'Blocked' : isFull ? 'Full' : 'Open'}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isEditing ? (
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={saveRule}
                                disabled={savingRule}
                                className="flex items-center gap-1 bg-primary text-white px-2.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-primary/90 disabled:opacity-50"
                              >
                                <Save size={11} />
                                {savingRule ? '…' : 'Save'}
                              </button>
                              <button
                                onClick={() => setEditingRule(null)}
                                className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => setEditingRule({ itemId: item.id, limit: rule ? limit : DEFAULT_DAILY_LIMIT, blocked: blocked, notes: rule?.notes || '' })}
                                className="text-xs text-primary hover:underline font-medium"
                              >
                                Set
                              </button>
                              {rule && (
                                <button
                                  onClick={() => deleteRule(item.id, selectedDate)}
                                  className="p-1 rounded text-muted-foreground hover:text-red-600 hover:bg-red-50"
                                  title="Reset to default"
                                >
                                  <Trash2 size={12} />
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Blocked Dates Panel */}
        <div className="space-y-4">
          <h3 className="font-bold text-foreground flex items-center gap-2">
            <CalendarX size={16} className="text-red-500" />
            Blocked Dates
          </h3>
          <div className="bg-white border border-border rounded-2xl shadow-card p-4 space-y-3">
            <p className="text-xs text-muted-foreground">Block an entire day — no orders will be accepted.</p>
            <div className="space-y-2">
              <input
                type="date"
                value={blockDateInput}
                onChange={(e) => setBlockDateInput(e.target.value)}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <input
                type="text"
                value={blockReasonInput}
                onChange={(e) => setBlockReasonInput(e.target.value)}
                placeholder="Reason (e.g. Holiday, Closed)"
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <button
                onClick={addBlockedDate}
                disabled={!blockDateInput || addingBlock}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                <Plus size={14} />
                {addingBlock ? 'Blocking…' : 'Block This Date'}
              </button>
            </div>

            {blockedDates.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-border">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Blocked Dates</p>
                {blockedDates.map((b) => (
                  <div key={b.id} className="flex items-center justify-between bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    <div>
                      <p className="text-xs font-bold text-red-700">
                        {new Date(b.blockedDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                      <p className="text-[10px] text-red-600">{b.reason}</p>
                    </div>
                    <button
                      onClick={() => removeBlockedDate(b.id)}
                      className="p-1 rounded text-red-400 hover:text-red-700 hover:bg-red-100"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={fetchData}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            <RefreshCw size={12} />
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
}
