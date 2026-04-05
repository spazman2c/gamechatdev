import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class', '[data-theme="dark"]'],
  content: [
    './src/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Surfaces
        surface: {
          base:    'var(--surface-base)',
          raised:  'var(--surface-raised)',
          panel:   'var(--surface-panel)',
          overlay: 'var(--surface-overlay)',
          hover:   'var(--surface-hover)',
          active:  'var(--surface-active)',
        },
        // Text
        text: {
          primary:   'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted:     'var(--text-muted)',
          disabled:  'var(--text-disabled)',
          inverse:   'var(--text-inverse)',
          link:      'var(--text-link)',
        },
        // Accent
        accent: {
          primary:        'var(--accent-primary)',
          'primary-light':'var(--accent-primary-light)',
          secondary:      'var(--accent-secondary)',
          mint:           'var(--accent-mint)',
          rose:           'var(--accent-rose)',
        },
        // Functional
        success: 'var(--functional-success)',
        warning: 'var(--functional-warning)',
        error:   'var(--functional-error)',
        info:    'var(--functional-info)',
        // Border
        border: {
          subtle:  'var(--border-subtle)',
          DEFAULT: 'var(--border-default)',
          strong:  'var(--border-strong)',
        },
      },
      fontFamily: {
        brand: ['var(--font-sora)', 'Sora', 'system-ui', 'sans-serif'],
        ui:    ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
        mono:  ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        'xs':   ['11px', { lineHeight: '1.5' }],
        'sm':   ['13px', { lineHeight: '1.5' }],
        'base': ['15px', { lineHeight: '1.6' }],
        'md':   ['16px', { lineHeight: '1.5' }],
        'lg':   ['18px', { lineHeight: '1.4' }],
        'xl':   ['22px', { lineHeight: '1.35' }],
        '2xl':  ['28px', { lineHeight: '1.2' }],
        '3xl':  ['36px', { lineHeight: '1.15' }],
        '4xl':  ['48px', { lineHeight: '1.1' }],
        '5xl':  ['64px', { lineHeight: '1.05' }],
      },
      borderRadius: {
        xs:   'var(--radius-xs)',
        sm:   'var(--radius-sm)',
        md:   'var(--radius-md)',
        lg:   'var(--radius-lg)',
        xl:   'var(--radius-xl)',
        full: 'var(--radius-full)',
      },
      boxShadow: {
        sm:          'var(--shadow-sm)',
        md:          'var(--shadow-md)',
        lg:          'var(--shadow-lg)',
        'glow-violet': 'var(--shadow-glow-violet)',
        'glow-cyan':   'var(--shadow-glow-cyan)',
      },
      transitionDuration: {
        fast:   '120',
        normal: '200',
        slow:   '350',
      },
      backgroundImage: {
        'gradient-brand':        'var(--gradient-brand)',
        'gradient-brand-subtle': 'var(--gradient-brand-subtle)',
        'gradient-depth':        'var(--gradient-depth)',
        'gradient-warm':         'var(--gradient-warm)',
        'gradient-cool':         'var(--gradient-cool)',
      },
      animation: {
        'pulse-soft':  'pulse-soft 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow-pulse':  'glow-pulse 3s ease-in-out infinite',
        'fade-in':     'fade-in 200ms ease',
        'slide-up':    'slide-up 200ms ease',
        'slide-down':  'slide-down 200ms ease',
      },
      keyframes: {
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%':       { opacity: '0.6' },
        },
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 8px rgba(124, 92, 255, 0.2)' },
          '50%':       { boxShadow: '0 0 24px rgba(124, 92, 255, 0.5)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-down': {
          from: { opacity: '0', transform: 'translateY(-8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}

export default config
