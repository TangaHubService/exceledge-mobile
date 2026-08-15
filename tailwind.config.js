/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.tsx', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#00A85A',
          dark: '#007A49',
          darker: '#003D2C',
          light: '#E5F7ED',
          lighter: '#F2FBF6',
        },
        border: '#E1E5E2',
        'border-strong': '#CCD3CF',
        background: '#F4F5F4',
      },
    },
  },
  plugins: [],
};
