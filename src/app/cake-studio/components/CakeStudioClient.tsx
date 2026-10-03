'use client';
import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { ChevronRight, ChevronLeft, Calendar, Cake, Palette, Camera, Sparkles, FileText, Upload, X, Check, RefreshCw, Send, Heart } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface OccasionData {
  occasion: string;
  personName: string;
  milestone: string;
  eventDate: string;
  deliveryType: 'pickup' | 'delivery';
  preferredTime: string;
}

interface CakeBasicsData {
  servings: number;
  shape: string;
  tiers: number;
  flavor: string;
  filling: string;
  frosting: string;
}

interface DesignData {
  style: string;
  colors: string[];
  decorations: string[];
  inscription: string;
}

interface InspirationData {
  images: { file: File; preview: string; likes: string[] }[];
  mustHave: string;
  dontWant: string;
  extraNotes: string;
}

interface QuoteData {
  extraNotes: string;
  name: string;
  phone: string;
  email: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const OCCASIONS = ['Birthday', 'Anniversary', 'Baby Shower', 'Graduation', 'Wedding', 'Other'];
const SHAPES = [
  { id: 'round', label: 'Round', emoji: '⭕' },
  { id: 'square', label: 'Square', emoji: '⬛' },
  { id: 'heart', label: 'Heart', emoji: '❤️' },
  { id: 'rectangle', label: 'Rectangle', emoji: '▬' },
  { id: 'other', label: 'Other', emoji: '✨' },
];
const TIERS = [1, 2, 3];
const FLAVORS = ['Vanilla', 'Chocolate', 'Red Velvet', 'Lemon', 'Carrot', 'Funfetti', 'Marble'];
const FILLINGS = ['Vanilla Buttercream', 'Strawberry Jam', 'Chocolate Ganache', 'Lemon Curd', 'Cream Cheese', 'Nutella', 'Fresh Fruit'];
const FROSTINGS = ['Vanilla Buttercream', 'Chocolate Buttercream', 'Cream Cheese', 'Swiss Meringue', 'Fondant', 'Whipped Cream'];
const SERVINGS_OPTIONS = [6, 8, 10, 12, 15, 20, 25, 30, 40, 50];
const STYLES = [
  { id: 'minimal', label: 'Minimal', emoji: '🤍', desc: 'Clean & simple' },
  { id: 'vintage', label: 'Vintage', emoji: '🌸', desc: 'Retro & romantic' },
  { id: 'elegant', label: 'Elegant', emoji: '✨', desc: 'Refined & luxe' },
  { id: 'cute', label: 'Cute', emoji: '🎀', desc: 'Sweet & playful' },
  { id: 'floral', label: 'Floral', emoji: '🌺', desc: 'Blooms & petals' },
  { id: 'cartoon', label: 'Cartoon', emoji: '🎨', desc: 'Fun & illustrated' },
  { id: 'themed', label: 'Themed', emoji: '🎭', desc: 'Custom concept' },
  { id: 'other', label: 'Other', emoji: '💫', desc: 'Your own vision' },
];
const COLOR_PALETTES = [
  { id: 'pink-cream', label: 'Pink & Cream', colors: ['#F9A8C9', '#FFF5E4', '#E8B4CB'] },
  { id: 'lavender-gold', label: 'Lavender & Gold', colors: ['#C4B5FD', '#FCD34D', '#EDE9FE'] },
  { id: 'sage-white', label: 'Sage & White', colors: ['#86EFAC', '#F0FDF4', '#D1FAE5'] },
  { id: 'dusty-rose', label: 'Dusty Rose', colors: ['#FDA4AF', '#FFF1F2', '#FECDD3'] },
  { id: 'midnight-gold', label: 'Midnight & Gold', colors: ['#1E1B4B', '#FCD34D', '#312E81'] },
  { id: 'peach-coral', label: 'Peach & Coral', colors: ['#FDBA74', '#FB923C', '#FED7AA'] },
  { id: 'blue-silver', label: 'Blue & Silver', colors: ['#93C5FD', '#E2E8F0', '#BFDBFE'] },
  { id: 'custom', label: 'Custom', colors: ['#D63B5E', '#6b1a2e', '#fdf8f2'] },
];
const DECORATIONS = [
  { id: 'flowers', label: 'Flowers', emoji: '🌸' },
  { id: 'bows', label: 'Bows', emoji: '🎀' },
  { id: 'fruits', label: 'Fruits', emoji: '🍓' },
  { id: 'pearls', label: 'Pearls', emoji: '⚪' },
  { id: 'sprinkles', label: 'Sprinkles', emoji: '🌈' },
  { id: 'figurines', label: 'Figurines', emoji: '🧸' },
  { id: 'topper', label: 'Cake Topper', emoji: '⭐' },
  { id: 'chocolate', label: 'Chocolate', emoji: '🍫' },
  { id: 'macarons', label: 'Macarons', emoji: '🍬' },
  { id: 'drip', label: 'Drip', emoji: '💧' },
  { id: 'edible-gold', label: 'Edible Gold', emoji: '✨' },
  { id: 'butterflies', label: 'Butterflies', emoji: '🦋' },
];
const INSPIRATION_LIKES = ['Colors', 'Shape', 'Decorations', 'Piping', 'Flowers', 'Overall style'];

const STEPS = [
  { num: '01', label: 'The Occasion', icon: Calendar, emoji: '🎉' },
  { num: '02', label: 'The Cake', icon: Cake, emoji: '🍰' },
  { num: '03', label: 'The Look', icon: Palette, emoji: '🎨' },
  { num: '04', label: 'Your Inspiration', icon: Camera, emoji: '📸' },
  { num: '05', label: 'Bring It To Life', icon: Sparkles, emoji: '✨' },
  { num: '06', label: 'Your Cake Brief', icon: FileText, emoji: '💌' },
];

// ─── Step Progress Bar ────────────────────────────────────────────────────────

function StepProgress({ current }: { current: number }) {
  return (
    <div className="w-full max-w-2xl mx-auto px-4 mb-8">
      <div className="flex items-center justify-between relative">
        <div className="absolute left-0 right-0 top-4 h-0.5 bg-[#EDE8E8] z-0" />
        <div
          className="absolute left-0 top-4 h-0.5 bg-gradient-to-r from-[#D63B5E] to-[#6b1a2e] z-0 transition-all duration-500"
          style={{ width: `${(current / (STEPS.length - 1)) * 100}%` }}
        />
        {STEPS.map((step, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <div key={step.num} className="flex flex-col items-center z-10 gap-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold font-sans transition-all duration-300 ${
                  done
                    ? 'bg-[#D63B5E] text-white shadow-md'
                    : active
                    ? 'bg-[#6b1a2e] text-white shadow-lg scale-110'
                    : 'bg-white border-2 border-[#EDE8E8] text-[#9CA3AF]'
                }`}
              >
                {done ? <Check size={14} /> : <span>{step.num}</span>}
              </div>
              <span
                className={`text-[9px] font-bold font-sans uppercase tracking-wide hidden sm:block transition-colors ${
                  active ? 'text-[#6b1a2e]' : done ? 'text-[#D63B5E]' : 'text-[#9CA3AF]'
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Selector Chip ────────────────────────────────────────────────────────────

function Chip({
  label, selected, onClick, emoji,
}: { label: string; selected: boolean; onClick: () => void; emoji?: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold font-sans transition-all duration-150 border ${
        selected
          ? 'bg-[#6b1a2e] text-white border-[#6b1a2e] shadow-md scale-105'
          : 'bg-white text-[#3a2a2e] border-[#EDE8E8] hover:border-[#D63B5E] hover:bg-[#FFF0F3]'
      }`}
    >
      {emoji && <span>{emoji}</span>}
      {label}
    </button>
  );
}

// ─── Visual Card Selector ─────────────────────────────────────────────────────

function CardSelector({
  items, selected, onSelect, cols = 3,
}: {
  items: { id: string; label: string; emoji: string; desc?: string }[];
  selected: string;
  onSelect: (id: string) => void;
  cols?: number;
}) {
  return (
    <div className={`grid gap-3 ${cols === 4 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3'}`}>
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => onSelect(item.id)}
          className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all duration-150 ${
            selected === item.id
              ? 'border-[#D63B5E] bg-[#FFF0F3] shadow-md'
              : 'border-[#EDE8E8] bg-white hover:border-[#D63B5E]/50 hover:bg-[#FFF8F9]'
          }`}
        >
          <span className="text-3xl">{item.emoji}</span>
          <span className="text-sm font-bold font-sans text-[#1a1a1a]">{item.label}</span>
          {item.desc && <span className="text-[10px] text-[#9CA3AF] font-body">{item.desc}</span>}
        </button>
      ))}
    </div>
  );
}

// ─── Isometric Cake Shape SVGs ────────────────────────────────────────────────

function CakeShapeRound({ selected }: { selected: boolean }) {
  const c = selected ? '#D63B5E' : '#F9A8C9';
  const side = selected ? '#b02e4e' : '#e8849e';
  return (
    <svg viewBox="0 0 110 90" width="80" height="65" xmlns="http://www.w3.org/2000/svg">
      {/* Plate */}
      <ellipse cx="55" cy="78" rx="42" ry="10" fill="#f0f0f0" />
      <ellipse cx="55" cy="76" rx="42" ry="10" fill="#ffffff" stroke="#e0e0e0" strokeWidth="1" />
      {/* Cake side */}
      <path d="M18 55 Q18 76 55 76 Q92 76 92 55 L92 42 Q92 42 55 42 Q18 42 18 42 Z" fill={side} />
      {/* Cake top */}
      <ellipse cx="55" cy="42" rx="37" ry="13" fill={c} />
      {/* Frosting drip */}
      <ellipse cx="55" cy="42" rx="30" ry="8" fill="white" opacity="0.4" />
      {/* Berry decorations */}
      <circle cx="48" cy="39" r="3" fill="#c0392b" />
      <circle cx="58" cy="37" r="2.5" fill="#c0392b" />
      <circle cx="65" cy="40" r="2" fill="#27ae60" />
      {/* Leaf */}
      <ellipse cx="65" cy="39" rx="4" ry="2" fill="#27ae60" transform="rotate(-30 65 39)" />
    </svg>
  );
}

function CakeShapeSquare({ selected }: { selected: boolean }) {
  const c = selected ? '#D63B5E' : '#8B5E3C';
  const side = selected ? '#b02e4e' : '#6b4226';
  return (
    <svg viewBox="0 0 110 90" width="80" height="65" xmlns="http://www.w3.org/2000/svg">
      {/* Plate */}
      <ellipse cx="55" cy="78" rx="42" ry="10" fill="#f0f0f0" />
      <ellipse cx="55" cy="76" rx="42" ry="10" fill="#ffffff" stroke="#e0e0e0" strokeWidth="1" />
      {/* Cake body - isometric square */}
      <polygon points="20,55 55,68 90,55 90,40 55,53 20,40" fill={side} />
      <polygon points="20,40 55,53 90,40 55,27" fill={c} />
      {/* Top highlight */}
      <polygon points="30,40 55,50 80,40 55,30" fill="white" opacity="0.2" />
      {/* Chocolate drip */}
      <polygon points="35,40 55,50 75,40 55,32" fill="#3d1f0a" opacity="0.3" />
      {/* Berry */}
      <circle cx="55" cy="35" r="3" fill="#c0392b" />
      <circle cx="48" cy="38" r="2" fill="#27ae60" />
    </svg>
  );
}

function CakeShapeHeart({ selected }: { selected: boolean }) {
  const c = selected ? '#D63B5E' : '#FDA4AF';
  const side = selected ? '#b02e4e' : '#e07080';
  return (
    <svg viewBox="0 0 110 90" width="80" height="65" xmlns="http://www.w3.org/2000/svg">
      {/* Plate */}
      <ellipse cx="55" cy="78" rx="42" ry="10" fill="#f0f0f0" />
      <ellipse cx="55" cy="76" rx="42" ry="10" fill="#ffffff" stroke="#e0e0e0" strokeWidth="1" />
      {/* Heart cake side */}
      <path d="M22,52 C22,52 30,72 55,74 C80,72 88,52 88,52 L88,40 C88,40 80,60 55,62 C30,60 22,40 22,40 Z" fill={side} />
      {/* Heart top */}
      <path d="M55,52 C55,52 22,44 22,36 C22,28 30,24 38,28 C44,30 55,38 55,38 C55,38 66,30 72,28 C80,24 88,28 88,36 C88,44 55,52 55,52 Z" fill={c} />
      {/* Frosting */}
      <path d="M55,48 C55,48 30,42 30,36 C30,32 36,30 42,34 C48,36 55,42 55,42 C55,42 62,36 68,34 C74,30 80,32 80,36 C80,42 55,48 55,48 Z" fill="white" opacity="0.3" />
      {/* Berries */}
      <circle cx="50" cy="34" r="2.5" fill="#c0392b" />
      <circle cx="60" cy="33" r="2" fill="#c0392b" />
    </svg>
  );
}

function CakeShapeRectangle({ selected }: { selected: boolean }) {
  const c = selected ? '#D63B5E' : '#FCD34D';
  const side = selected ? '#b02e4e' : '#d4a017';
  return (
    <svg viewBox="0 0 110 90" width="80" height="65" xmlns="http://www.w3.org/2000/svg">
      {/* Plate */}
      <ellipse cx="55" cy="78" rx="46" ry="10" fill="#f0f0f0" />
      <ellipse cx="55" cy="76" rx="46" ry="10" fill="#ffffff" stroke="#e0e0e0" strokeWidth="1" />
      {/* Rectangle cake - wider */}
      <polygon points="12,55 55,68 98,55 98,42 55,55 12,42" fill={side} />
      <polygon points="12,42 55,55 98,42 55,29" fill={c} />
      {/* Top highlight */}
      <polygon points="22,42 55,52 88,42 55,32" fill="white" opacity="0.25" />
      {/* Small squares decoration */}
      <rect x="44" y="34" width="6" height="6" rx="1" fill="#f9a825" opacity="0.8" />
      <rect x="54" y="32" width="6" height="6" rx="1" fill="#f9a825" opacity="0.8" />
      <rect x="64" y="34" width="5" height="5" rx="1" fill="#f9a825" opacity="0.8" />
    </svg>
  );
}

function CakeShapeOther({ selected }: { selected: boolean }) {
  const c = selected ? '#D63B5E' : '#C4B5FD';
  const side = selected ? '#b02e4e' : '#9b7fe8';
  return (
    <svg viewBox="0 0 110 90" width="80" height="65" xmlns="http://www.w3.org/2000/svg">
      {/* Plate */}
      <ellipse cx="55" cy="78" rx="42" ry="10" fill="#f0f0f0" />
      <ellipse cx="55" cy="76" rx="42" ry="10" fill="#ffffff" stroke="#e0e0e0" strokeWidth="1" />
      {/* Star-ish cake side */}
      <path d="M20,55 Q20,72 55,74 Q90,72 90,55 L90,42 Q90,42 55,42 Q20,42 20,42 Z" fill={side} />
      {/* Star top */}
      <path d="M55,28 L60,38 L72,36 L64,44 L68,56 L55,50 L42,56 L46,44 L38,36 L50,38 Z" fill={c} />
      {/* Sparkles */}
      <text x="50" y="42" fontSize="8" fill="white" opacity="0.8">✦</text>
      <text x="58" y="38" fontSize="6" fill="white" opacity="0.6">✦</text>
      <text x="44" y="46" fontSize="5" fill="white" opacity="0.5">✦</text>
    </svg>
  );
}

// ─── Isometric Shape Selector ─────────────────────────────────────────────────

function ShapeSelector({ selected, onSelect }: { selected: string; onSelect: (id: string) => void }) {
  const shapes: { id: string; label: string; Svg: React.FC<{ selected: boolean }> }[] = [
    { id: 'round', label: 'Round', Svg: CakeShapeRound },
    { id: 'square', label: 'Square', Svg: CakeShapeSquare },
    { id: 'heart', label: 'Heart', Svg: CakeShapeHeart },
    { id: 'rectangle', label: 'Rectangle', Svg: CakeShapeRectangle },
    { id: 'other', label: 'Other', Svg: CakeShapeOther },
  ];
  return (
    <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
      {shapes.map(({ id, label, Svg: ShapeSvg }) => (
        <button
          key={id}
          onClick={() => onSelect(id)}
          className={`flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all duration-150 ${
            selected === id
              ? 'border-[#D63B5E] bg-[#FFF0F3] shadow-md'
              : 'border-[#EDE8E8] bg-white hover:border-[#D63B5E]/50 hover:bg-[#FFF8F9]'
          }`}
        >
          <ShapeSvg selected={selected === id} />
          <span className="text-xs font-bold font-sans text-[#1a1a1a]">{label}</span>
        </button>
      ))}
    </div>
  );
}

// ─── Step 1: Occasion ─────────────────────────────────────────────────────────

function Step1Occasion({ data, onChange }: { data: OccasionData; onChange: (d: OccasionData) => void }) {
  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="text-center mb-8">
        <div className="text-5xl mb-3">🎉</div>
        <h2 className="text-2xl font-extrabold font-sans text-[#1a1a1a]">What are we celebrating?</h2>
        <p className="text-sm text-[#6b5a5e] mt-1 font-body">Tell us about the special occasion</p>
      </div>

      {/* Occasion Type */}
      <div>
        <label className="block text-xs font-bold font-sans text-[#6b1a2e] uppercase tracking-wider mb-3">Occasion</label>
        <div className="flex flex-wrap gap-2">
          {OCCASIONS.map((o) => (
            <Chip key={o} label={o} selected={data.occasion === o} onClick={() => onChange({ ...data, occasion: o })} />
          ))}
        </div>
      </div>

      {/* Person Name */}
      <div>
        <label className="block text-xs font-bold font-sans text-[#6b1a2e] uppercase tracking-wider mb-2">Name of person</label>
        <input
          type="text"
          value={data.personName}
          onChange={(e) => onChange({ ...data, personName: e.target.value })}
          placeholder="e.g. Sarah"
          className="w-full px-4 py-3 rounded-xl border border-[#EDE8E8] bg-white text-sm font-body text-[#1a1a1a] focus:outline-none focus:border-[#D63B5E] transition-colors"
        />
      </div>

      {/* Milestone */}
      <div>
        <label className="block text-xs font-bold font-sans text-[#6b1a2e] uppercase tracking-wider mb-2">Age / Milestone</label>
        <input
          type="text"
          value={data.milestone}
          onChange={(e) => onChange({ ...data, milestone: e.target.value })}
          placeholder="e.g. 30th birthday, 10 year anniversary"
          className="w-full px-4 py-3 rounded-xl border border-[#EDE8E8] bg-white text-sm font-body text-[#1a1a1a] focus:outline-none focus:border-[#D63B5E] transition-colors"
        />
      </div>

      {/* Event Date */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold font-sans text-[#6b1a2e] uppercase tracking-wider mb-2">Event Date</label>
          <input
            type="date"
            value={data.eventDate}
            onChange={(e) => onChange({ ...data, eventDate: e.target.value })}
            className="w-full px-4 py-3 rounded-xl border border-[#EDE8E8] bg-white text-sm font-body text-[#1a1a1a] focus:outline-none focus:border-[#D63B5E] transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs font-bold font-sans text-[#6b1a2e] uppercase tracking-wider mb-2">Preferred Time</label>
          <input
            type="time"
            value={data.preferredTime}
            onChange={(e) => onChange({ ...data, preferredTime: e.target.value })}
            className="w-full px-4 py-3 rounded-xl border border-[#EDE8E8] bg-white text-sm font-body text-[#1a1a1a] focus:outline-none focus:border-[#D63B5E] transition-colors"
          />
        </div>
      </div>

      {/* Delivery Type */}
      <div>
        <label className="block text-xs font-bold font-sans text-[#6b1a2e] uppercase tracking-wider mb-3">Pickup or Delivery?</label>
        <div className="grid grid-cols-2 gap-3">
          {(['pickup', 'delivery'] as const).map((type) => (
            <button
              key={type}
              onClick={() => onChange({ ...data, deliveryType: type })}
              className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                data.deliveryType === type
                  ? 'border-[#D63B5E] bg-[#FFF0F3]'
                  : 'border-[#EDE8E8] bg-white hover:border-[#D63B5E]/50'
              }`}
            >
              <span className="text-2xl">{type === 'pickup' ? '🏪' : '🚗'}</span>
              <span className="text-sm font-bold font-sans text-[#1a1a1a] capitalize">{type}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Step 2: Cake Basics ──────────────────────────────────────────────────────

function Step2CakeBasics({ data, onChange }: { data: CakeBasicsData; onChange: (d: CakeBasicsData) => void }) {
  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="text-center mb-8">
        <div className="text-5xl mb-3">🍰</div>
        <h2 className="text-2xl font-extrabold font-sans text-[#1a1a1a]">Let's start with the cake.</h2>
        <p className="text-sm text-[#6b5a5e] mt-1 font-body">Choose the size, shape and flavors</p>
      </div>

      {/* Live Cake Preview */}
      <div className="bg-gradient-to-br from-[#FFF0F3] to-[#FFF8F9] rounded-2xl p-4 flex items-center justify-center gap-4 border border-[#FFCDD5]">
        <div className="flex flex-col items-center gap-1">
          {Array.from({ length: data.tiers }).map((_, i) => {
            const tierIndex = data.tiers - 1 - i;
            return (
              <div
                key={i}
                className="rounded-full bg-gradient-to-b from-[#FFCDD5] to-[#D63B5E] transition-all duration-300"
                style={{
                  width: `${80 - tierIndex * 16}px`,
                  height: '28px',
                  opacity: 0.85 + tierIndex * 0.05,
                }}
              />
            );
          })}
        </div>
        <div className="text-left">
          <p className="text-xs font-bold font-sans text-[#6b1a2e] uppercase tracking-wide">Your Cake</p>
          <p className="text-sm font-body text-[#3a2a2e] mt-0.5">{data.servings} servings · {data.shape || 'Round'}</p>
          <p className="text-sm font-body text-[#3a2a2e]">{data.tiers} tier{data.tiers > 1 ? 's' : ''}</p>
          <p className="text-xs text-[#9CA3AF] font-body mt-0.5">{data.flavor || 'Choose flavor'}</p>
        </div>
      </div>

      {/* Servings */}
      <div>
        <label className="block text-xs font-bold font-sans text-[#6b1a2e] uppercase tracking-wider mb-3">Number of Servings</label>
        <div className="flex flex-wrap gap-2">
          {SERVINGS_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => onChange({ ...data, servings: s })}
              className={`w-12 h-12 rounded-xl text-sm font-bold font-sans border-2 transition-all ${
                data.servings === s
                  ? 'bg-[#6b1a2e] text-white border-[#6b1a2e] shadow-md'
                  : 'bg-white text-[#3a2a2e] border-[#EDE8E8] hover:border-[#D63B5E]'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Shape */}
      <div>
        <label className="block text-xs font-bold font-sans text-[#6b1a2e] uppercase tracking-wider mb-3">Shape</label>
        <ShapeSelector selected={data.shape} onSelect={(v) => onChange({ ...data, shape: v })} />
      </div>

      {/* Tiers */}
      <div>
        <label className="block text-xs font-bold font-sans text-[#6b1a2e] uppercase tracking-wider mb-3">Number of Tiers</label>
        <div className="flex gap-3">
          {TIERS.map((t) => (
            <button
              key={t}
              onClick={() => onChange({ ...data, tiers: t })}
              className={`flex-1 flex flex-col items-center gap-2 py-4 rounded-2xl border-2 transition-all ${
                data.tiers === t
                  ? 'border-[#D63B5E] bg-[#FFF0F3]'
                  : 'border-[#EDE8E8] bg-white hover:border-[#D63B5E]/50'
              }`}
            >
              <div className="flex flex-col items-center gap-0.5">
                {Array.from({ length: t }).map((_, i) => {
                  const tierIndex = t - 1 - i;
                  return (
                    <div
                      key={i}
                      className="rounded-full bg-[#D63B5E] opacity-80"
                      style={{ width: `${28 - tierIndex * 6}px`, height: '8px' }}
                    />
                  );
                })}
              </div>
              <span className="text-sm font-bold font-sans text-[#1a1a1a]">{t} Tier{t > 1 ? 's' : ''}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Flavor, Filling, Frosting */}
      {[
        { label: 'Cake Flavor', key: 'flavor' as const, options: FLAVORS },
        { label: 'Filling', key: 'filling' as const, options: FILLINGS },
        { label: 'Frosting', key: 'frosting' as const, options: FROSTINGS },
      ].map(({ label, key, options }) => (
        <div key={key}>
          <label className="block text-xs font-bold font-sans text-[#6b1a2e] uppercase tracking-wider mb-3">{label}</label>
          <div className="flex flex-wrap gap-2">
            {options.map((o) => (
              <Chip key={o} label={o} selected={data[key] === o} onClick={() => onChange({ ...data, [key]: o })} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Step 3: Design ───────────────────────────────────────────────────────────

function Step3Design({ data, onChange }: { data: DesignData; onChange: (d: DesignData) => void }) {
  const toggleDecoration = (id: string) => {
    const next = data.decorations.includes(id)
      ? data.decorations.filter((d) => d !== id)
      : [...data.decorations, id];
    onChange({ ...data, decorations: next });
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="text-center mb-8">
        <div className="text-5xl mb-3">🎨</div>
        <h2 className="text-2xl font-extrabold font-sans text-[#1a1a1a]">What should it look like?</h2>
        <p className="text-sm text-[#6b5a5e] mt-1 font-body">Design the style, colors and decorations</p>
      </div>

      {/* Style */}
      <div>
        <label className="block text-xs font-bold font-sans text-[#6b1a2e] uppercase tracking-wider mb-3">Style</label>
        <CardSelector items={STYLES} selected={data.style} onSelect={(v) => onChange({ ...data, style: v })} />
      </div>

      {/* Color Palettes */}
      <div>
        <label className="block text-xs font-bold font-sans text-[#6b1a2e] uppercase tracking-wider mb-3">Color Palette</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {COLOR_PALETTES.map((palette) => (
            <button
              key={palette.id}
              onClick={() => onChange({ ...data, colors: palette.colors })}
              className={`flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all ${
                JSON.stringify(data.colors) === JSON.stringify(palette.colors)
                  ? 'border-[#D63B5E] bg-[#FFF0F3] shadow-md'
                  : 'border-[#EDE8E8] bg-white hover:border-[#D63B5E]/50'
              }`}
            >
              <div className="flex gap-1">
                {palette.colors.map((c, i) => (
                  <div key={i} className="w-5 h-5 rounded-full border border-white shadow-sm" style={{ backgroundColor: c }} />
                ))}
              </div>
              <span className="text-[10px] font-bold font-sans text-[#3a2a2e] text-center leading-tight">{palette.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Decorations */}
      <div>
        <label className="block text-xs font-bold font-sans text-[#6b1a2e] uppercase tracking-wider mb-3">Decorations</label>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {DECORATIONS.map((dec) => {
            const selected = data.decorations.includes(dec.id);
            return (
              <button
                key={dec.id}
                onClick={() => toggleDecoration(dec.id)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                  selected
                    ? 'border-[#D63B5E] bg-[#FFF0F3] shadow-sm'
                    : 'border-[#EDE8E8] bg-white hover:border-[#D63B5E]/50'
                }`}
              >
                <span className="text-2xl">{dec.emoji}</span>
                <span className="text-[10px] font-bold font-sans text-[#3a2a2e] text-center">{dec.label}</span>
                {selected && <Check size={10} className="text-[#D63B5E]" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Inscription */}
      <div>
        <label className="block text-xs font-bold font-sans text-[#6b1a2e] uppercase tracking-wider mb-2">Inscription / Message</label>
        <input
          type="text"
          value={data.inscription}
          onChange={(e) => onChange({ ...data, inscription: e.target.value })}
          placeholder="e.g. Happy Birthday Sarah! 🎉"
          className="w-full px-4 py-3 rounded-xl border border-[#EDE8E8] bg-white text-sm font-body text-[#1a1a1a] focus:outline-none focus:border-[#D63B5E] transition-colors"
        />
      </div>
    </div>
  );
}

// ─── Step 4: Inspiration ──────────────────────────────────────────────────────

function Step4Inspiration({ data, onChange }: { data: InspirationData; onChange: (d: InspirationData) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const remaining = 5 - data.images.length;
    const toAdd = Array.from(files).slice(0, remaining).map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      likes: [] as string[],
    }));
    onChange({ ...data, images: [...data.images, ...toAdd] });
  };

  const removeImage = (i: number) => {
    const next = [...data.images];
    URL.revokeObjectURL(next[i].preview);
    next.splice(i, 1);
    onChange({ ...data, images: next });
  };

  const toggleLike = (imgIdx: number, like: string) => {
    const next = data.images.map((img, i) => {
      if (i !== imgIdx) return img;
      const likes = img.likes.includes(like) ? img.likes.filter((l) => l !== like) : [...img.likes, like];
      return { ...img, likes };
    });
    onChange({ ...data, images: next });
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="text-center mb-8">
        <div className="text-5xl mb-3">📸</div>
        <h2 className="text-2xl font-extrabold font-sans text-[#1a1a1a]">Show us what you're imagining.</h2>
        <p className="text-sm text-[#6b5a5e] mt-1 font-body">Upload up to 5 inspiration photos</p>
      </div>

      {/* Upload Area */}
      {data.images.length < 5 && (
        <div
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-[#FFCDD5] rounded-2xl p-8 flex flex-col items-center gap-3 cursor-pointer hover:bg-[#FFF8F9] transition-colors"
        >
          <div className="w-14 h-14 rounded-full bg-[#FFF0F3] flex items-center justify-center">
            <Upload size={24} className="text-[#D63B5E]" />
          </div>
          <p className="text-sm font-bold font-sans text-[#3a2a2e]">Drop your inspiration photos here</p>
          <p className="text-xs text-[#9CA3AF] font-body">{data.images.length}/5 photos added · Click to browse</p>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>
      )}

      {/* Image Previews */}
      {data.images.length > 0 && (
        <div className="space-y-4">
          {data.images.map((img, i) => (
            <div key={i} className="bg-white rounded-2xl border border-[#EDE8E8] overflow-hidden">
              <div className="relative">
                <img src={img.preview} alt={`Inspiration ${i + 1}`} className="w-full h-40 object-cover" />
                <button
                  onClick={() => removeImage(i)}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="p-4">
                <p className="text-xs font-bold font-sans text-[#6b1a2e] uppercase tracking-wide mb-2">What do you like about it?</p>
                <div className="flex flex-wrap gap-2">
                  {INSPIRATION_LIKES.map((like) => (
                    <button
                      key={like}
                      onClick={() => toggleLike(i, like)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold font-sans border transition-all ${
                        img.likes.includes(like)
                          ? 'bg-[#6b1a2e] text-white border-[#6b1a2e]'
                          : 'bg-white text-[#3a2a2e] border-[#EDE8E8] hover:border-[#D63B5E]'
                      }`}
                    >
                      {img.likes.includes(like) && <Check size={10} />}
                      {like}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Must Have / Don't Want */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold font-sans text-green-700 uppercase tracking-wider mb-2">✅ Must Have</label>
          <textarea
            value={data.mustHave}
            onChange={(e) => onChange({ ...data, mustHave: e.target.value })}
            placeholder="e.g. Large pink bow, vintage piping"
            rows={3}
            className="w-full px-4 py-3 rounded-xl border border-[#EDE8E8] bg-white text-sm font-body text-[#1a1a1a] focus:outline-none focus:border-green-400 transition-colors resize-none"
          />
        </div>
        <div>
          <label className="block text-xs font-bold font-sans text-red-600 uppercase tracking-wider mb-2">🚫 Don't Want</label>
          <textarea
            value={data.dontWant}
            onChange={(e) => onChange({ ...data, dontWant: e.target.value })}
            placeholder="e.g. No gold, no fondant"
            rows={3}
            className="w-full px-4 py-3 rounded-xl border border-[#EDE8E8] bg-white text-sm font-body text-[#1a1a1a] focus:outline-none focus:border-red-300 transition-colors resize-none"
          />
        </div>
      </div>

      {/* Extra Notes */}
      <div>
        <label className="block text-xs font-bold font-sans text-[#6b1a2e] uppercase tracking-wider mb-2">Anything else we should know?</label>
        <textarea
          value={data.extraNotes}
          onChange={(e) => onChange({ ...data, extraNotes: e.target.value })}
          placeholder="Share any other details, themes, or ideas..."
          rows={3}
          className="w-full px-4 py-3 rounded-xl border border-[#EDE8E8] bg-white text-sm font-body text-[#1a1a1a] focus:outline-none focus:border-[#D63B5E] transition-colors resize-none"
        />
      </div>
    </div>
  );
}

// ─── Step 5: AI Studio ────────────────────────────────────────────────────────

function Step5AIStudio({
  occasion, cake, design, inspiration, imageUrl, isLoading, onGenerate, error,
}: {
  occasion: OccasionData;
  cake: CakeBasicsData;
  design: DesignData;
  inspiration: InspirationData;
  imageUrl: string | null;
  isLoading: boolean;
  onGenerate: (prompt: string) => void;
  error?: Error | null;
}) {
  const [editPrompt, setEditPrompt] = useState('');
  const [hasGenerated, setHasGenerated] = useState(false);

  const buildPrompt = (extra = '') => {
    const colorNames = COLOR_PALETTES.find((p) => JSON.stringify(p.colors) === JSON.stringify(design.colors))?.label || 'custom colors';
    const decoLabels = design.decorations.map((id) => DECORATIONS.find((d) => d.id === id)?.label).filter(Boolean).join(', ');
    const styleItem = STYLES.find((s) => s.id === design.style);
    return [
      `A beautiful ${design.style || 'elegant'} custom celebration cake`,
      cake.tiers > 1 ? `with ${cake.tiers} tiers` : '',
      cake.shape ? `in a ${cake.shape} shape` : '',
      `for ${occasion.personName || 'a special occasion'}'s ${occasion.occasion || 'celebration'}`,
      `${cake.servings} servings`,
      `${cake.flavor || 'vanilla'} cake with ${cake.filling || 'buttercream'} filling`,
      `frosted with ${cake.frosting || 'vanilla buttercream'}`,
      `color palette: ${colorNames}`,
      decoLabels ? `decorated with ${decoLabels}` : '',
      design.inscription ? `inscription reads "${design.inscription}"` : '',
      inspiration.mustHave ? `must include: ${inspiration.mustHave}` : '',
      inspiration.dontWant ? `avoid: ${inspiration.dontWant}` : '',
      extra || '',
      'professional bakery photography, soft studio lighting, white background, photorealistic, highly detailed',
    ].filter(Boolean).join(', ');
  };

  const handleGenerate = () => {
    const prompt = buildPrompt();
    onGenerate(prompt);
    setHasGenerated(true);
  };

  const handleRegenerate = () => {
    const prompt = buildPrompt(editPrompt);
    onGenerate(prompt);
    setEditPrompt('');
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="text-center mb-8">
        <div className="text-5xl mb-3">✨</div>
        <h2 className="text-2xl font-extrabold font-sans text-[#1a1a1a]">Bring It To Life</h2>
        <p className="text-sm text-[#6b5a5e] mt-1 font-body">We've got your idea. Let's bring it to life.</p>
      </div>

      {/* AI Summary Banner */}
      <div className="bg-gradient-to-br from-[#6b1a2e] to-[#D63B5E] rounded-2xl p-5 text-white">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={16} />
          <span className="text-xs font-bold font-sans uppercase tracking-wider">AI is combining your choices</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs font-body opacity-90">
          {occasion.personName && <span>👤 {occasion.personName}'s {occasion.occasion}</span>}
          {cake.flavor && <span>🍰 {cake.flavor} · {cake.tiers} tier</span>}
          {design.style && <span>🎨 {design.style} style</span>}
          {design.decorations.length > 0 && <span>✨ {design.decorations.length} decorations</span>}
          {inspiration.mustHave && <span>❤️ {inspiration.mustHave.slice(0, 30)}</span>}
          {inspiration.images.length > 0 && <span>📸 {inspiration.images.length} reference{inspiration.images.length > 1 ? 's' : ''}</span>}
        </div>
      </div>

      {/* Generate Button */}
      {!hasGenerated && !imageUrl && (
        <button
          onClick={handleGenerate}
          disabled={isLoading}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#6b1a2e] to-[#D63B5E] text-white font-bold font-sans text-base flex items-center justify-center gap-3 hover:opacity-90 transition-opacity disabled:opacity-60 shadow-lg"
        >
          {isLoading ? (
            <>
              <RefreshCw size={18} className="animate-spin" />
              Generating your cake concept...
            </>
          ) : (
            <>
              <Sparkles size={18} />
              Generate My Cake Concept
            </>
          )}
        </button>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="rounded-2xl bg-[#FFF5F5] border border-red-200 p-6 flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
            <span className="text-2xl">⚠️</span>
          </div>
          <div>
            <p className="text-sm font-bold font-sans text-red-700 mb-1">
              {error.message.includes('429') ? 'AI Generation Unavailable' : 'Generation Failed'}
            </p>
            <p className="text-xs text-red-500 font-body">
              {error.message.includes('429')
                ? 'The AI image service is temporarily at capacity. Please try again in a minute or two.' :'Something went wrong generating your cake concept. Please try again.'}
            </p>
          </div>
          <button
            onClick={() => { setHasGenerated(false); }}
            className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-bold font-sans hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="rounded-2xl bg-[#FFF0F3] border border-[#FFCDD5] p-8 flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-md">
            <Sparkles size={28} className="text-[#D63B5E] animate-pulse" />
          </div>
          <p className="text-sm font-bold font-sans text-[#6b1a2e]">Creating your cake concept...</p>
          <p className="text-xs text-[#9CA3AF] font-body text-center">Our AI is combining your style, flavors, and inspiration</p>
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full bg-[#D63B5E]"
                style={{ animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Generated Image */}
      {imageUrl && (
        <div className="space-y-4">
          <div className="rounded-2xl overflow-hidden border-2 border-[#FFCDD5] shadow-xl">
            <div className="bg-gradient-to-b from-[#FFF0F3] to-white p-3 flex items-center gap-2">
              <Sparkles size={14} className="text-[#D63B5E]" />
              <span className="text-xs font-bold font-sans text-[#6b1a2e] uppercase tracking-wide">Your Cake Concept</span>
            </div>
            <img
              src={imageUrl}
              alt="AI-generated cake concept"
              className="w-full object-cover"
            />
          </div>

          {/* Quick Edit Controls */}
          <div>
            <p className="text-xs font-bold font-sans text-[#6b1a2e] uppercase tracking-wider mb-3">Want to change something?</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {['Change Colors', 'Change Decorations', 'Change Shape', 'Add Something', 'Remove Something'].map((ctrl) => (
                <button
                  key={ctrl}
                  onClick={() => setEditPrompt((prev) => prev ? `${prev}, ${ctrl.toLowerCase()}` : ctrl.toLowerCase())}
                  className="px-3 py-1.5 rounded-xl bg-white border border-[#EDE8E8] text-xs font-semibold font-sans text-[#3a2a2e] hover:border-[#D63B5E] hover:bg-[#FFF0F3] transition-all"
                >
                  {ctrl}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={editPrompt}
                onChange={(e) => setEditPrompt(e.target.value)}
                placeholder='"Make the bow smaller and add strawberries."'
                className="flex-1 px-4 py-3 rounded-xl border border-[#EDE8E8] bg-white text-sm font-body text-[#1a1a1a] focus:outline-none focus:border-[#D63B5E] transition-colors"
              />
              <button
                onClick={handleRegenerate}
                disabled={isLoading}
                className="px-4 py-3 rounded-xl bg-[#6b1a2e] text-white font-bold font-sans text-sm flex items-center gap-2 hover:bg-[#D63B5E] transition-colors disabled:opacity-60"
              >
                <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                Regenerate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Regenerate from scratch */}
      {hasGenerated && !isLoading && (
        <button
          onClick={handleGenerate}
          className="w-full py-3 rounded-xl border-2 border-[#D63B5E] text-[#D63B5E] font-bold font-sans text-sm flex items-center justify-center gap-2 hover:bg-[#FFF0F3] transition-colors"
        >
          <RefreshCw size={14} />
          Generate New Concept
        </button>
      )}
    </div>
  );
}

// ─── Step 6: Quote Brief ──────────────────────────────────────────────────────

function Step6Quote({
  occasion, cake, design, inspiration, aiImageUrl, quoteData, onChange, onSubmit, submitting, submitted, trackingCode,
}: {
  occasion: OccasionData;
  cake: CakeBasicsData;
  design: DesignData;
  inspiration: InspirationData;
  aiImageUrl: string | null;
  quoteData: QuoteData;
  onChange: (d: QuoteData) => void;
  onSubmit: () => void;
  submitting: boolean;
  submitted: boolean;
  trackingCode: string;
}) {
  const colorPalette = COLOR_PALETTES.find((p) => JSON.stringify(p.colors) === JSON.stringify(design.colors));
  const decoLabels = design.decorations.map((id) => DECORATIONS.find((d) => d.id === id)?.label).filter(Boolean).join(', ');
  const styleItem = STYLES.find((s) => s.id === design.style);

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-6 animate-fadeIn">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#D63B5E] to-[#6b1a2e] flex items-center justify-center shadow-xl">
          <Check size={36} className="text-white" />
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-extrabold font-sans text-[#1a1a1a] mb-2">Quote Request Sent! 🎉</h2>
          <p className="text-sm text-[#6b5a5e] font-body max-w-xs mx-auto">
            Lolita will review your cake design and send you a personalized quote soon.
          </p>
        </div>
        <div className="bg-[#FFF0F3] rounded-2xl p-5 w-full max-w-sm text-center border border-[#FFCDD5]">
          <p className="text-xs font-bold font-sans text-[#6b1a2e] uppercase tracking-wide mb-1">Your Cake Tracking Number</p>
          <p data-testid="cake-tracking-code" className="text-2xl font-extrabold font-sans text-[#6b1a2e] tracking-wider my-2">{trackingCode}</p>
          <p className="text-sm font-body text-[#3a2a2e]">Save this number. Track your cake anytime on the <a href="/track-order" className="underline font-semibold">Track Order</a> page. We'll review your design and send a personalized quote.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fadeIn">
      <div className="text-center mb-8">
        <div className="text-5xl mb-3">💌</div>
        <h2 className="text-2xl font-extrabold font-sans text-[#1a1a1a]">Your Cake Brief</h2>
        <p className="text-sm text-[#6b5a5e] mt-1 font-body">Everything in one beautiful summary</p>
      </div>

      {/* Summary Card */}
      <div className="bg-white rounded-2xl border border-[#EDE8E8] overflow-hidden shadow-sm">
        <div className="bg-gradient-to-r from-[#6b1a2e] to-[#D63B5E] px-5 py-3">
          <p className="text-white font-bold font-sans text-sm">Your Cake Brief</p>
        </div>
        <div className="p-5 space-y-4">
          {occasion.personName && (
            <div className="flex gap-3">
              <span className="text-lg">🎉</span>
              <div>
                <p className="text-xs font-bold font-sans text-[#9CA3AF] uppercase tracking-wide">Occasion</p>
                <p className="text-sm font-body text-[#1a1a1a]">
                  {occasion.personName}'s {occasion.milestone || occasion.occasion}
                  {occasion.eventDate && ` · ${new Date(occasion.eventDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                </p>
              </div>
            </div>
          )}
          <div className="flex gap-3">
            <span className="text-lg">🍰</span>
            <div>
              <p className="text-xs font-bold font-sans text-[#9CA3AF] uppercase tracking-wide">Cake</p>
              <p className="text-sm font-body text-[#1a1a1a]">
                {cake.servings} servings · {cake.shape || 'Round'} · {cake.tiers} tier{cake.tiers > 1 ? 's' : ''}
              </p>
              {cake.flavor && (
                <p className="text-xs text-[#6b5a5e] font-body mt-0.5">
                  {cake.flavor} · {cake.filling} filling · {cake.frosting}
                </p>
              )}
            </div>
          </div>
          {design.style && (
            <div className="flex gap-3">
              <span className="text-lg">🎨</span>
              <div>
                <p className="text-xs font-bold font-sans text-[#9CA3AF] uppercase tracking-wide">Design</p>
                <p className="text-sm font-body text-[#1a1a1a]">
                  {styleItem?.label || design.style}
                  {colorPalette && ` · ${colorPalette.label}`}
                  {decoLabels && ` · ${decoLabels}`}
                </p>
              </div>
            </div>
          )}
          {design.inscription && (
            <div className="flex gap-3">
              <span className="text-lg">✍️</span>
              <div>
                <p className="text-xs font-bold font-sans text-[#9CA3AF] uppercase tracking-wide">Message</p>
                <p className="text-sm font-body text-[#1a1a1a] italic">"{design.inscription}"</p>
              </div>
            </div>
          )}
          {inspiration.mustHave && (
            <div className="flex gap-3">
              <span className="text-lg">❤️</span>
              <div>
                <p className="text-xs font-bold font-sans text-[#9CA3AF] uppercase tracking-wide">Must Have</p>
                <p className="text-sm font-body text-[#1a1a1a]">{inspiration.mustHave}</p>
              </div>
            </div>
          )}
          {inspiration.dontWant && (
            <div className="flex gap-3">
              <span className="text-lg">🚫</span>
              <div>
                <p className="text-xs font-bold font-sans text-[#9CA3AF] uppercase tracking-wide">Avoid</p>
                <p className="text-sm font-body text-[#1a1a1a]">{inspiration.dontWant}</p>
              </div>
            </div>
          )}
          {inspiration.images.length > 0 && (
            <div className="flex gap-3">
              <span className="text-lg">📸</span>
              <div>
                <p className="text-xs font-bold font-sans text-[#9CA3AF] uppercase tracking-wide">References</p>
                <div className="flex gap-2 mt-1">
                  {inspiration.images.map((img, i) => (
                    <img key={i} src={img.preview} alt={`Reference ${i + 1}`} className="w-12 h-12 rounded-lg object-cover border border-[#EDE8E8]" />
                  ))}
                </div>
              </div>
            </div>
          )}
          {aiImageUrl && (
            <div className="flex gap-3">
              <span className="text-lg">🤖</span>
              <div className="flex-1">
                <p className="text-xs font-bold font-sans text-[#9CA3AF] uppercase tracking-wide mb-2">AI Concept</p>
                <img
                  src={aiImageUrl}
                  alt="AI cake concept"
                  className="w-full rounded-xl border border-[#EDE8E8] max-h-48 object-cover"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Contact details */}
      <div className="bg-white rounded-2xl border border-[#EDE8E8] p-5 space-y-3">
        <p className="text-xs font-bold font-sans text-[#6b1a2e] uppercase tracking-wider">Your contact details</p>
        <input data-testid="cake-contact-name" type="text" value={quoteData.name} onChange={(e)=>onChange({ ...quoteData, name: e.target.value })} placeholder="Your name *" className="w-full px-4 py-3 rounded-xl border border-[#EDE8E8] bg-white text-sm font-body focus:outline-none focus:border-[#D63B5E]" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input data-testid="cake-contact-phone" type="tel" value={quoteData.phone} onChange={(e)=>onChange({ ...quoteData, phone: e.target.value })} placeholder="Phone *" className="w-full px-4 py-3 rounded-xl border border-[#EDE8E8] bg-white text-sm font-body focus:outline-none focus:border-[#D63B5E]" />
          <input data-testid="cake-contact-email" type="email" value={quoteData.email} onChange={(e)=>onChange({ ...quoteData, email: e.target.value })} placeholder="Email (optional)" className="w-full px-4 py-3 rounded-xl border border-[#EDE8E8] bg-white text-sm font-body focus:outline-none focus:border-[#D63B5E]" />
        </div>
      </div>

      {/* Extra Notes */}
      <div>
        <label className="block text-xs font-bold font-sans text-[#6b1a2e] uppercase tracking-wider mb-2">Anything we missed?</label>
        <textarea
          value={quoteData.extraNotes}
          onChange={(e) => onChange({ ...quoteData, extraNotes: e.target.value })}
          placeholder="Any final details or special requests..."
          rows={3}
          className="w-full px-4 py-3 rounded-xl border border-[#EDE8E8] bg-white text-sm font-body text-[#1a1a1a] focus:outline-none focus:border-[#D63B5E] transition-colors resize-none"
        />
      </div>

      {/* CTA */}
      <div className="bg-gradient-to-br from-[#FFF0F3] to-[#FFF8F9] rounded-2xl p-5 border border-[#FFCDD5] text-center">
        <p className="text-sm font-bold font-sans text-[#1a1a1a] mb-1">Ready to send it to Lolita Bake?</p>
        <p className="text-xs text-[#6b5a5e] font-body mb-4">I'll review your design and send you a personalized quote.</p>
        <button
          onClick={onSubmit}
          disabled={submitting}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#6b1a2e] to-[#D63B5E] text-white font-bold font-sans text-base flex items-center justify-center gap-3 hover:opacity-90 transition-opacity disabled:opacity-60 shadow-lg"
        >
          {submitting ? (
            <>
              <RefreshCw size={18} className="animate-spin" />
              Sending your request...
            </>
          ) : (
            <>
              <Send size={18} />
              Request My Quote →
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Main Client ──────────────────────────────────────────────────────────────

export default function CakeStudioClient() {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [occasion, setOccasion] = useState<OccasionData>({
    occasion: '', personName: '', milestone: '', eventDate: '', deliveryType: 'pickup', preferredTime: '',
  });
  const [cake, setCake] = useState<CakeBasicsData>({
    servings: 10, shape: 'round', tiers: 1, flavor: '', filling: '', frosting: '',
  });
  const [design, setDesign] = useState<DesignData>({
    style: '', colors: COLOR_PALETTES[0].colors, decorations: [], inscription: '',
  });
  const [inspiration, setInspiration] = useState<InspirationData>({
    images: [], mustHave: '', dontWant: '', extraNotes: '',
  });
  const [quoteData, setQuoteData] = useState<QuoteData>({ extraNotes: '', name: '', phone: '', email: '' });
  const [trackingCode, setTrackingCode] = useState('');

  const [aiImageUrl, setAiImageUrl] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<Error | null>(null);

  useEffect(() => {
    if (aiError) {
      toast.error('Something went wrong generating your cake concept. Please try again.');
    }
  }, [aiError]);

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep((s) => s - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleGenerate = async (prompt: string) => {
    setAiImageUrl(null);
    setAiError(null);
    setAiLoading(true);
    try {
      const res = await fetch('/api/stable-horde', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (!res.ok || !data.imageUrl) {
        throw new Error(data.error || 'Failed to generate image');
      }
      setAiImageUrl(data.imageUrl);
    } catch (err) {
      setAiError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!quoteData.name.trim() || !quoteData.phone.trim()) {
      toast.error('Please add your name and phone number.');
      return;
    }
    setSubmitting(true);
    try {
      const supabase = createClient();
      const urls: string[] = [];
      for (const img of inspiration.images) {
        const ext = (img.file.name.split('.').pop() || 'jpg').toLowerCase();
        const path = `${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from('cake-inspiration').upload(path, img.file, { contentType: img.file.type });
        if (!error) { const { data } = supabase.storage.from('cake-inspiration').getPublicUrl(path); urls.push(data.publicUrl); }
      }
      const payload = {
        customer_name: quoteData.name, customer_phone: quoteData.phone, customer_email: quoteData.email,
        event_date: occasion.eventDate || null, ai_image_url: aiImageUrl || '', inspiration_images: urls,
        brief: {
          occasion, cake, design,
          inspiration: { mustHave: inspiration.mustHave, dontWant: inspiration.dontWant, extraNotes: inspiration.extraNotes },
          likes: inspiration.images.map((i) => i.likes), notes: quoteData.extraNotes,
        },
      };
      const { data, error } = await supabase.rpc('submit_cake_quote', { p_payload: payload });
      if (error) throw error;
      setTrackingCode((data as { tracking_code: string }).tracking_code);
      setSubmitted(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not send your request. Please retry.');
    } finally {
      setSubmitting(false);
    }
  };

  const isLastStep = step === STEPS.length - 1;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 bg-gradient-to-r from-[#6b1a2e] to-[#D63B5E] text-white px-4 py-1.5 rounded-full text-xs font-bold font-sans uppercase tracking-widest mb-3">
          <Sparkles size={12} />
          Cake Studio
        </div>
        <h1 className="text-3xl font-extrabold font-sans text-[#1a1a1a]">Create Your Cake</h1>
        <p className="text-sm text-[#6b5a5e] font-body mt-1">Design your perfect custom cake in 6 steps</p>
      </div>

      {/* Step Progress */}
      <StepProgress current={step} />

      {/* Step Label */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6b1a2e] to-[#D63B5E] flex items-center justify-center shadow-md">
          <span className="text-white font-bold font-sans text-sm">{STEPS[step].num}</span>
        </div>
        <div>
          <p className="text-xs font-bold font-sans text-[#D63B5E] uppercase tracking-widest">{STEPS[step].num}</p>
          <h2 className="text-lg font-extrabold font-sans text-[#1a1a1a]">{STEPS[step].label}</h2>
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-white rounded-3xl border border-[#EDE8E8] p-6 shadow-sm mb-6">
        {step === 0 && <Step1Occasion data={occasion} onChange={setOccasion} />}
        {step === 1 && <Step2CakeBasics data={cake} onChange={setCake} />}
        {step === 2 && <Step3Design data={design} onChange={setDesign} />}
        {step === 3 && <Step4Inspiration data={inspiration} onChange={setInspiration} />}
        {step === 4 && (
          <Step5AIStudio
            occasion={occasion}
            cake={cake}
            design={design}
            inspiration={inspiration}
            imageUrl={aiImageUrl}
            isLoading={aiLoading}
            onGenerate={handleGenerate}
            error={aiError}
          />
        )}
        {step === 5 && (
          <Step6Quote
            occasion={occasion}
            cake={cake}
            design={design}
            inspiration={inspiration}
            aiImageUrl={aiImageUrl}
            quoteData={quoteData}
            onChange={setQuoteData}
            onSubmit={handleSubmit}
            submitting={submitting}
            submitted={submitted}
            trackingCode={trackingCode}
          />
        )}
      </div>

      {/* Navigation Buttons */}
      {!submitted && (
        <div className="flex gap-3">
          {step > 0 && (
            <button
              onClick={handleBack}
              className="flex items-center gap-2 px-5 py-3 rounded-xl border-2 border-[#EDE8E8] text-[#3a2a2e] font-bold font-sans text-sm hover:border-[#D63B5E] hover:bg-[#FFF0F3] transition-all"
            >
              <ChevronLeft size={16} />
              Back
            </button>
          )}
          {!isLastStep && (
            <button
              onClick={handleNext}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-[#6b1a2e] to-[#D63B5E] text-white font-bold font-sans text-sm hover:opacity-90 transition-opacity shadow-md"
            >
              Continue
              <ChevronRight size={16} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
