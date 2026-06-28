// Central theme tokens + a deterministic avatar color picker.

export const theme = {
  // backgrounds
  bgFrom: '#0f172a',
  bgTo: '#1e1b4b',
  bg: '#0f172a',
  surface: '#1e293b',
  surface2: '#273449',

  // header gradient
  headerFrom: '#7c3aed',
  headerTo: '#4f46e5',

  // accents / text
  accent: '#7c3aed',
  accentSoft: '#8b5cf6',
  onAccent: '#ffffff',
  text: '#e2e8f0',
  textDim: '#cbd5e1',
  muted: '#94a3b8',
  border: '#334155',
  online: '#22c55e',
  danger: '#ef4444',
}

// Stable, pleasant color derived from a name so each user keeps the same avatar hue.
const PALETTE = [
  '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#a855f7',
]

export function avatarColor(name = '') {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return PALETTE[Math.abs(hash) % PALETTE.length]
}
