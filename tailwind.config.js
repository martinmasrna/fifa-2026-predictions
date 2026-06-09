/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Outfit', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        // "Pitch" theme — see memory/design_direction.md
        canvas: '#FBF8EF',  // warm cream page background
        ink: {
          DEFAULT: '#10261C', // primary text (deep green-black)
          soft: '#3D4D45',
        },
        pitch: {
          DEFAULT: '#138A52',
          dark: '#0E6E41',
          soft: '#E4F3EA',
        },
        gold: {
          DEFAULT: '#D99B27',
          dark: '#A8741A',
          soft: '#FBF1DC',
        },
      },
      boxShadow: {
        card: '0 1px 2px rgba(16,38,28,.05), 0 10px 28px -14px rgba(16,38,28,.18)',
        lift: '0 2px 4px rgba(16,38,28,.06), 0 18px 40px -16px rgba(16,38,28,.28)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pop': {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '60%': { transform: 'scale(1.04)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out both',
        'pop': 'pop 0.35s cubic-bezier(0.2, 0.9, 0.3, 1.2) both',
      },
    },
  },
  plugins: [],
}
