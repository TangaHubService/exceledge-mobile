export const colors = {
  brand: {
    DEFAULT: '#00A85A',
    dark: '#007A49',
    darker: '#003D2C',
    light: '#E5F7ED',
    lighter: '#F2FBF6',
    solid: '#00A85A',
  },
  accent: '#1E88E5',
  surface: '#FFFFFF',
  background: '#F4F5F4',
  text: {
    primary: '#171A18',
    secondary: '#525A55',
    muted: '#8B948E',
    inverse: '#FFFFFF',
  },
  border: '#E1E5E2',
  borderStrong: '#CCD3CF',
  success: '#16A34A',
  warning: '#D97706',
  danger: '#DC2626',
  info: '#2563EB',
  overlay: 'rgba(15, 23, 42, 0.55)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
};

export const radius = {
  sm: 5,
  md: 7,
  lg: 10,
  xl: 14,
  '2xl': 18,
  full: 9999,
};

export const typography = {
  title: { fontSize: 22, fontWeight: '800' as const, color: colors.text.primary },
  heading: { fontSize: 16, fontWeight: '700' as const, color: colors.text.primary },
  subheading: { fontSize: 15, fontWeight: '700' as const, color: colors.text.primary },
  body: { fontSize: 14, color: colors.text.secondary },
  caption: { fontSize: 12, color: colors.text.muted },
  label: { fontSize: 12, fontWeight: '600' as const, color: colors.text.secondary },
};

export const shadows = {
  card: {
    shadowColor: '#0B241A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.035,
    shadowRadius: 5,
    elevation: 1,
  },
  floating: {
    shadowColor: '#003D2C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
};

export const currency = (amount: number | string | null | undefined, code = 'RWF'): string => {
  const value = Number(amount ?? 0);
  const formatted = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value);
  return `${formatted} ${code}`;
};

export const formatDate = (value: string | Date): string => {
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (isToday) return `Today, ${time}`;
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return `Yesterday, ${time}`;
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
};

export const formatTime = (value: string | Date): string => {
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};
