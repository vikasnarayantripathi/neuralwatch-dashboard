/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand palette
        'nw-bg': '#F5F7FA',
        'nw-sidebar': '#0D1B2A',
        'nw-sidebar-hover': '#152438',
        'nw-sidebar-active': '#1B2D44',
        'nw-accent': '#0057FF',
        'nw-accent-hover': '#0047D6',
        'nw-accent-light': '#E6EEFF',

        // Surface & text
        'nw-card': '#FFFFFF',
        'nw-border': '#E5E9F0',
        'nw-text-primary': '#0D1B2A',
        'nw-text-secondary': '#5A6478',
        'nw-text-muted': '#8B94A6',

        // Status colors
        'nw-success': '#10B981',
        'nw-success-light': '#D1FAE5',
        'nw-warning': '#F59E0B',
        'nw-warning-light': '#FEF3C7',
        'nw-danger': '#EF4444',
        'nw-danger-light': '#FEE2E2',
        'nw-info': '#3B82F6',
        'nw-info-light': '#DBEAFE',

        // Keep old tokens for backward compatibility during migration
        primary: "#0057FF",
        dark: "#0D1B2A",
        card: "#FFFFFF",
        border: "#E5E9F0",
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'nw-card': '0 1px 3px rgba(13, 27, 42, 0.04), 0 1px 2px rgba(13, 27, 42, 0.06)',
        'nw-card-hover': '0 4px 12px rgba(13, 27, 42, 0.08), 0 2px 4px rgba(13, 27, 42, 0.06)',
        'nw-elevated': '0 10px 25px rgba(13, 27, 42, 0.1), 0 4px 10px rgba(13, 27, 42, 0.06)',
        'nw-modal': '0 25px 50px rgba(13, 27, 42, 0.15)',
      },
      borderRadius: {
        'nw': '10px',
        'nw-lg': '14px',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.25s ease-out',
        'pulse-dot': 'pulseDot 1.5s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseDot: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.6', transform: 'scale(1.15)' },
        },
      },
    },
  },
  plugins: [],
}
