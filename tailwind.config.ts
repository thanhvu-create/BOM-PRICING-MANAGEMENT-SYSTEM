import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'bg-base':    '#F0EBE4',
        'bg-surface': '#FAFAF7',
        'bg-muted':   '#DDD8CF',
        'bg-hover':   '#E8E3DC',
        'text-primary':   '#1A1814',
        'text-secondary': '#6B645C',
        'text-muted':     '#A09890',
        'border-strong':  '#1A1814',
        'border-base':    '#C8C3BB',
        'border-light':   '#DDD8CF',
        'success': '#4A7C59',
        'danger':  '#9B4040',
        'warning': '#8C7340',
        'info':    '#4A6B8C',
      },
      fontFamily: {
        heading: ['Cormorant Garamond', 'Playfair Display', 'Georgia', 'serif'],
        body:    ['Jost', 'DM Sans', 'Helvetica Neue', 'Arial', 'sans-serif'],
        mono:    ['JetBrains Mono', 'Consolas', 'monospace'],
      },
      borderRadius: {
        none: '0',
        sm:   '2px',
        md:   '4px',
      },
    },
  },
  plugins: [],
}

export default config
