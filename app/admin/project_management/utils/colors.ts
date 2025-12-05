import { Project, GroupedProject } from '../types';
import { clamp } from './math';

export const BAR_COLORS = [
  { bgHex: '#dbeafe', borderHex: '#bfdbfe', textHex: '#1e3a8a', barHex: '#3b82f6' },
  { bgHex: '#dcfce7', borderHex: '#bbf7d0', textHex: '#166534', barHex: '#22c55e' },
  { bgHex: '#f3e8ff', borderHex: '#e9d5ff', textHex: '#6b21a8', barHex: '#a855f7' },
  { bgHex: '#ffedd5', borderHex: '#fed7aa', textHex: '#9a3412', barHex: '#f97316' },
  { bgHex: '#fce7f3', borderHex: '#fbcfe8', textHex: '#9d174d', barHex: '#ec4899' },
  { bgHex: '#e0e7ff', borderHex: '#c7d2fe', textHex: '#3730a3', barHex: '#6366f1' },
  { bgHex: '#fef9c3', borderHex: '#fde68a', textHex: '#854d0e', barHex: '#eab308' },
  { bgHex: '#f3f4f6', borderHex: '#e5e7eb', textHex: '#1f2937', barHex: '#6b7280' },
  { bgHex: '#fef3c7', borderHex: '#fde68a', textHex: '#92400e', barHex: '#f59e0b' },
  { bgHex: '#ecfccb', borderHex: '#d9f99d', textHex: '#3f6212', barHex: '#84cc16' },
  { bgHex: '#d1fae5', borderHex: '#a7f3d0', textHex: '#065f46', barHex: '#10b981' },
  { bgHex: '#ccfbf1', borderHex: '#99f6e4', textHex: '#115e59', barHex: '#14b8a6' },
  { bgHex: '#cffafe', borderHex: '#a5f3fc', textHex: '#0e7490', barHex: '#06b6d4' },
  { bgHex: '#e0f2fe', borderHex: '#bae6fd', textHex: '#075985', barHex: '#0ea5e9' },
  { bgHex: '#ffe4e6', borderHex: '#fecdd3', textHex: '#9f1239', barHex: '#f43f5e' },
  { bgHex: '#ede9fe', borderHex: '#ddd6fe', textHex: '#43302a', barHex: '#78716c' },
  { bgHex: '#e2e8f0', borderHex: '#cbd5e1', textHex: '#1e293b', barHex: '#64748b' },
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
    return {
      bgHex: bg,
      borderHex: border,
      textHex: text,
      barHex: base,
      customBg: bg,
      customBorder: border,
      customText: text,
      barColor: base,
    };
  }
  const set = BAR_COLORS[proj.colorIdx % BAR_COLORS.length];
  return { ...set, customBg: undefined, customBorder: undefined, customText: undefined, barColor: undefined };
};
