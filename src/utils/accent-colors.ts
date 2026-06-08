export const ACCENT_COLORS = [
  { name: 'Blue', value: '#2AABEE' },
  { name: 'Green', value: '#4DB86E' },
  { name: 'Violet', value: '#A855F7' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Amber', value: '#F59E0B' },
  { name: 'Red', value: '#EF4444' },
  { name: 'Cyan', value: '#06B6D4' },
  { name: 'Indigo', value: '#6366F1' },
  { name: 'Rose', value: '#F43F5E' },
];

const COLOR_MAP: Record<string, [string, string, string]> = {
  '#2AABEE': ['#2AABEE', '#1E96D4', 'rgba(42, 171, 238, 0.12)'],
  '#4DB86E': ['#4DB86E', '#3DA05E', 'rgba(77, 184, 110, 0.12)'],
  '#A855F7': ['#A855F7', '#9333EA', 'rgba(168, 85, 247, 0.12)'],
  '#EC4899': ['#EC4899', '#DB2777', 'rgba(236, 72, 153, 0.12)'],
  '#F59E0B': ['#F59E0B', '#D97706', 'rgba(245, 158, 11, 0.12)'],
  '#EF4444': ['#EF4444', '#DC2626', 'rgba(239, 68, 68, 0.12)'],
  '#06B6D4': ['#06B6D4', '#0891B2', 'rgba(6, 182, 212, 0.12)'],
  '#6366F1': ['#6366F1', '#4F46E5', 'rgba(99, 102, 241, 0.12)'],
  '#F43F5E': ['#F43F5E', '#E11D48', 'rgba(244, 63, 94, 0.12)'],
  '#10B981': ['#10B981', '#059669', 'rgba(16, 185, 129, 0.12)'],
  '#F97316': ['#F97316', '#EA580C', 'rgba(249, 115, 22, 0.12)'],
};

export function applyAccentColor(color: string) {
  const c = COLOR_MAP[color] || [color, color, 'rgba(255,255,255,0.1)'];
  document.documentElement.style.setProperty('--tg-accent', c[0]);
  document.documentElement.style.setProperty('--tg-accent-dark', c[1]);
  document.documentElement.style.setProperty('--tg-accent-dim', c[2]);
  document.documentElement.style.setProperty('--tg-blue', c[0]);
  document.documentElement.style.setProperty('--tg-blue-dark', c[1]);
  document.documentElement.style.setProperty('--tg-blue-dim', c[2]);
}
