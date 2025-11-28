import { Project, GroupedProject } from '../types';
import { clamp } from './math';

export const BAR_COLORS = [
  { bg: 'bg-blue-100', border: 'border-blue-200', text: 'text-blue-800', bar: 'bg-blue-500' },
  { bg: 'bg-green-100', border: 'border-green-200', text: 'text-green-800', bar: 'bg-green-500' },
  { bg: 'bg-purple-100', border: 'border-purple-200', text: 'text-purple-800', bar: 'bg-purple-500' },
  { bg: 'bg-orange-100', border: 'border-orange-200', text: 'text-orange-800', bar: 'bg-orange-500' },
  { bg: 'bg-pink-100', border: 'border-pink-200', text: 'text-pink-800', bar: 'bg-pink-500' },
  { bg: 'bg-indigo-100', border: 'border-indigo-200', text: 'text-indigo-800', bar: 'bg-indigo-500' },
  { bg: 'bg-yellow-100', border: 'border-yellow-200', text: 'text-yellow-800', bar: 'bg-yellow-500' },
  { bg: 'bg-gray-100', border: 'border-gray-200', text: 'text-gray-800', bar: 'bg-gray-500' },
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
export const getReadableTextColor = (hex: string) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return '#111827';
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.6 ? '#111827' : '#f8fafc';
};
export const getRandomHexColor = () => {
  const colors = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#f43f5e'];
  return colors[Math.floor(Math.random() * colors.length)];
};

export const getColorSet = (proj: Project | GroupedProject | (Project & { row: number })) => {
  if (proj.customColor) {
    const base = proj.customColor;
    const bg = lightenColor(base, 0.8);
    const border = lightenColor(base, 0.7);
    const text = getReadableTextColor(base);
    return { bg: '', border: '', textClass: '', barClass: '', customBg: bg, customBorder: border, customText: text, barColor: base };
  }
  const set = BAR_COLORS[proj.colorIdx % BAR_COLORS.length];
  return { ...set, textClass: set.text, barClass: set.bar, customBg: undefined, customBorder: undefined, customText: undefined, barColor: undefined };
};
