/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        cyan: {
          custom: '#5DE1E5',
        },
        sidebar: {
          bg: '#ffffff',
          border: '#e5e7eb',
        },
      },
      spacing: {
        'sidebar': '16rem',
        'sidebar-collapsed': '4rem',
      },
      transitionDuration: {
        'sidebar': '300ms',
      },
      keyframes: {
        'sidebar-expand': {
          '0%': { width: '4rem' },
          '100%': { width: '16rem' },
        },
        'sidebar-collapse': {
          '0%': { width: '16rem' },
          '100%': { width: '4rem' },
        },
      },
      animation: {
        'sidebar-expand': 'sidebar-expand 300ms ease-in-out',
        'sidebar-collapse': 'sidebar-collapse 300ms ease-in-out',
      },
    },
  },
  plugins: [],
}

