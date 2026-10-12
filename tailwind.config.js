/** @type {import('tailwindcss').Config} */
// Colours are CSS variables (see src/index.css) so the light/dark theme switch is a single class on <html>.
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        page: v('page'),
        card: v('card'),
        ink: v('ink'),
        muted: v('muted'),
        line: v('line'),
        soft: v('soft'),
        brand: { DEFAULT: v('brand'), soft: v('brand-soft'), ink: v('brand-ink') },
        pos: { DEFAULT: v('pos'), soft: v('pos-soft') },
        neg: { DEFAULT: v('neg'), soft: v('neg-soft') },
        sun: { DEFAULT: v('sun'), soft: v('sun-soft') },
        lilac: { DEFAULT: v('lilac'), soft: v('lilac-soft') },
      },
      fontFamily: {
        display: ['"Baloo 2"', 'ui-rounded', '"Nunito"', 'system-ui', 'sans-serif'],
        sans: ['Nunito', 'ui-sans-serif', 'system-ui', '-apple-system', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgb(60 40 20 / 0.05), 0 6px 20px -8px rgb(60 40 20 / 0.12)',
      },
      keyframes: {
        pop: { '0%': { transform: 'scale(0.96)', opacity: '0' }, '100%': { transform: 'scale(1)', opacity: '1' } },
        rise: { '0%': { transform: 'translateY(8px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
        bump: { '0%': { transform: 'scale(1)' }, '40%': { transform: 'scale(1.08)' }, '100%': { transform: 'scale(1)' } },
        fade: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
      },
      animation: {
        pop: 'pop 0.18s ease-out',
        rise: 'rise 0.25s ease-out',
        bump: 'bump 0.45s ease-out',
        fade: 'fade 0.15s ease-out',
      },
    },
  },
  plugins: [],
};
