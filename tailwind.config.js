/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Outfit', 'sans-serif'],
        tech: ['Space Grotesk', 'sans-serif'],
      },
      colors: {
        background: '#F9FAFB',
        surface: '#ffffff',
        primary: '#18181b',
        muted: '#6B7280',
        accent: '#94A3B8',
      },
      animation: {
        'slide-in': 'slideIn 0.3s cubic-bezier(0.2, 0.9, 0.2, 1)',
      },
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        }
      },
      spacing: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-left': 'env(safe-area-inset-left)',
        'safe-right': 'env(safe-area-inset-right)',
      }
    },
  },
  plugins: [
    function ({ addUtilities }) {
      addUtilities({
        '.pt-safe': { 'padding-top': 'env(safe-area-inset-top)' },
        '.pb-safe': { 'padding-bottom': 'env(safe-area-inset-bottom)' },
        '.pl-safe': { 'padding-left': 'env(safe-area-inset-left)' },
        '.pr-safe': { 'padding-right': 'env(safe-area-inset-right)' },
        '.mt-safe': { 'margin-top': 'env(safe-area-inset-top)' },
        '.mb-safe': { 'margin-bottom': 'env(safe-area-inset-bottom)' },
        '.perspective-1000': { 'perspective': '1000px' },
        '.perspective-none': { 'perspective': 'none' },
        '.transform-style-3d': { 'transform-style': 'preserve-3d' },
        '.backface-hidden': { 'backface-visibility': 'hidden' },
        '.rotate-x-90': { 'transform': 'rotateX(90deg)' },
      })
    }
  ],
}
