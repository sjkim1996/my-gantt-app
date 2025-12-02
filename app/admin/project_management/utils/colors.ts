import { Project, GroupedProject } from '../types';
import { clamp } from './math';

export const BAR_COLORS = [
  { bg: 'bg-blue-100', border: 'border-blue-200', text: 'text-blue-800', bar: 'bg-blue-500', barHex: '#3b82f6' },
  { bg: 'bg-green-100', border: 'border-green-200', text: 'text-green-800', bar: 'bg-green-500', barHex: '#22c55e' },
  { bg: 'bg-purple-100', border: 'border-purple-200', text: 'text-purple-800', bar: 'bg-purple-500', barHex: '#a855f7' },
  { bg: 'bg-orange-100', border: 'border-orange-200', text: 'text-orange-800', bar: 'bg-orange-500', barHex: '#f97316' },
  { bg: 'bg-pink-100', border: 'border-pink-200', text: 'text-pink-800', bar: 'bg-pink-500', barHex: '#ec4899' },
  { bg: 'bg-indigo-100', border: 'border-indigo-200', text: 'text-indigo-800', bar: 'bg-indigo-500', barHex: '#6366f1' },
  { bg: 'bg-yellow-100', border: 'border-yellow-200', text: 'text-yellow-800', bar: 'bg-yellow-500', barHex: '#eab308' },
  { bg: 'bg-gray-100', border: 'border-gray-200', text: 'text-gray-800', bar: 'bg-gray-500', barHex: '#6b7280' },
  { bg: 'bg-amber-100', border: 'border-amber-200', text: 'text-amber-800', bar: 'bg-amber-500', barHex: '#f59e0b' },
  { bg: 'bg-lime-100', border: 'border-lime-200', text: 'text-lime-800', bar: 'bg-lime-500', barHex: '#84cc16' },
  { bg: 'bg-emerald-100', border: 'border-emerald-200', text: 'text-emerald-800', bar: 'bg-emerald-500', barHex: '#10b981' },
  { bg: 'bg-teal-100', border: 'border-teal-200', text: 'text-teal-800', bar: 'bg-teal-500', barHex: '#14b8a6' },
  { bg: 'bg-cyan-100', border: 'border-cyan-200', text: 'text-cyan-800', bar: 'bg-cyan-500', barHex: '#06b6d4' },
  { bg: 'bg-sky-100', border: 'border-sky-200', text: 'text-sky-800', bar: 'bg-sky-500', barHex: '#0ea5e9' },
  { bg: 'bg-rose-100', border: 'border-rose-200', text: 'text-rose-800', bar: 'bg-rose-500', barHex: '#f43f5e' },
  { bg: 'bg-stone-100', border: 'border-stone-200', text: 'text-stone-800', bar: 'bg-stone-500', barHex: '#78716c' },
  { bg: 'bg-slate-100', border: 'border-slate-200', text: 'text-slate-800', bar: 'bg-slate-500', barHex: '#64748b' },
];

export const hexToRgb = (hex: string) => {
  const cleaned = hex.replace('#', '');
  if (cleaned.length !== 6) return null;
  const num = parseInt(cleaned, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
};
export const rgbToHex = (r: number, g: number, b: number) => {
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
};
export const lightenColor = (hex: string, amount = 0.85) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const r = clamp(Math.round(rgb.r + (255 - rgb.r) * (1 - amount)), 0, 255);
  const g = clamp(Math.round(rgb.g + (255 - rgb.g) * (1 - amount)), 0, 255);
  const b = clamp(Math.round(rgb.b + (255 - rgb.b) * (1 - amount)), 0, 255);
  return rgbToHex(r, g, b);
};
export const darkenColor = (hex: string, amount = 0.2) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const r = clamp(Math.round(rgb.r * (1 - amount)), 0, 255);
  const g = clamp(Math.round(rgb.g * (1 - amount)), 0, 255);
  const b = clamp(Math.round(rgb.b * (1 - amount)), 0, 255);
  return rgbToHex(r, g, b);
};
export const getReadableTextColor = (hex: string) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return '#111827';
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.6 ? '#111827' : '#f8fafc';
};
export const getRandomHexColor = () => {
  const colors = BAR_COLORS.map((c) => c.barHex).filter(Boolean) as string[];
  const idx = Math.floor(Math.random() * colors.length);
  return colors[idx] || '#3b82f6';
};

export const getColorSet = (proj: Project | GroupedProject | (Project & { row: number })) => {
  if (proj.customColor) {
    const base = proj.customColor;
    const bg = lightenColor(base, 0.8);
    const border = lightenColor(base, 0.7);
    const text = getReadableTextColor(base);
    return { bg: '', border: '', textClass: '', barClass: '', customBg: bg, customBorder: border, customText: text, barColor: base, barHex: base };
  }
  const set = BAR_COLORS[proj.colorIdx % BAR_COLORS.length];
  return { ...set, textClass: set.text, barClass: set.bar, customBg: undefined, customBorder: undefined, customText: undefined, barColor: undefined, barHex: set.barHex };
};
