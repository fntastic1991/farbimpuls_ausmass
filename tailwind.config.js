/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0e7490', // cyan-700
          dark: '#155e75',
          light: '#22b8cf',
        },
        secondary: {
          DEFAULT: '#f59e0b', // amber-500
          dark: '#d97706',
          light: '#fbbf24',
        },
        accent: {
          DEFAULT: '#10b981', // emerald-500
          dark: '#059669',
          light: '#34d399',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'Apple Color Emoji', 'Segoe UI Emoji'],
      },
    },
  },
  plugins: [],
};
