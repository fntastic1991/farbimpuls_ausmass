/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#336d78',
          dark: '#2a5960',
          light: '#4a8793',
        },
        secondary: {
          DEFAULT: '#c4574e',
          dark: '#a8453e',
          light: '#d87069',
        },
        accent: {
          DEFAULT: '#a0c7c4',
          dark: '#8ab3b0',
          light: '#b8d7d5',
        },
      },
    },
  },
  plugins: [],
};
