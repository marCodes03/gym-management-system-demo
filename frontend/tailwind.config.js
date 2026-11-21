/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'obsidian-black': '#0B0D11',
        'carbon-black': '#111827',
        'royal-blue': '#2563EB',
        'royal-blue-dark': '#1D4ED8',
        'royal-blue-light': '#DBEAFE',
        'gunmetal-gray': '#374151',
        'steel-gray': '#4B5563',
        'silver-gray': '#9CA3AF',
        'silver-border': '#D1D5DB',
        'silver-canvas': '#F3F4F6',
        'pure-white': '#FFFFFF',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['"Geist Mono"', '"Roboto Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        resting: '0 1px 3px rgba(11, 13, 17, 0.06), 0 4px 12px rgba(11, 13, 17, 0.04)',
        floating: '0 4px 6px -1px rgba(11, 13, 17, 0.10), 0 12px 24px -4px rgba(29, 78, 216, 0.08)',
        modal: '0 20px 30px -10px rgba(11, 13, 17, 0.28), 0 10px 15px -3px rgba(0, 0, 0, 0.15)',
      },
    },
  },
  plugins: [],
};
