export type AtmosphereId = 'studio' | 'arcade' | 'lounge' | 'guild' | 'orbit'

export interface AtmosphereConfig {
  id: AtmosphereId
  name: string
  description: string
  accentPrimary: string
  accentSecondary: string
  surfaceBase: string
  radiusMd: string
  motionIntensity: 'low' | 'medium' | 'high'
}

export const ATMOSPHERES: Record<AtmosphereId, AtmosphereConfig> = {
  studio: {
    id: 'studio',
    name: 'Studio',
    description: 'Clean, creator-focused, productivity vibe',
    accentPrimary: '#7C5CFF',
    accentSecondary: '#39D5FF',
    surfaceBase: '#0B1020',
    radiusMd: '16px',
    motionIntensity: 'medium',
  },
  arcade: {
    id: 'arcade',
    name: 'Arcade',
    description: 'Energetic, neon, playful',
    accentPrimary: '#FF4088',
    accentSecondary: '#FFE040',
    surfaceBase: '#0D0B1A',
    radiusMd: '8px',
    motionIntensity: 'high',
  },
  lounge: {
    id: 'lounge',
    name: 'Lounge',
    description: 'Warm, cozy, conversational',
    accentPrimary: '#C97B3F',
    accentSecondary: '#E8A85A',
    surfaceBase: '#130F0B',
    radiusMd: '20px',
    motionIntensity: 'low',
  },
  guild: {
    id: 'guild',
    name: 'Guild',
    description: 'Fantasy-inspired, structured, role-heavy',
    accentPrimary: '#9B6AFF',
    accentSecondary: '#D4AF37',
    surfaceBase: '#0C0B14',
    radiusMd: '12px',
    motionIntensity: 'medium',
  },
  orbit: {
    id: 'orbit',
    name: 'Orbit',
    description: 'Futuristic, minimal, tech-forward',
    accentPrimary: '#00E5FF',
    accentSecondary: '#3EE6B5',
    surfaceBase: '#060D16',
    radiusMd: '22px',
    motionIntensity: 'low',
  },
}
