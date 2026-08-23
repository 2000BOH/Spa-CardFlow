/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0a0b0d',
        muted: '#5b616e',
        brand: '#0052ff',
        'brand-hover': '#578bfa',
        surface: '#eef0f3',
        'surface-2': '#e2e5ea',
        line: 'rgba(91,97,110,0.2)',
        'line-soft': 'rgba(91,97,110,0.12)'
      },
      fontFamily: {
        sans: ['DM Sans', 'Noto Sans KR', 'sans-serif'],
        num: ['Space Grotesk', 'DM Sans', 'sans-serif']
      },
      maxWidth: {
        page: '1360px'
      }
    }
  },
  plugins: []
};
