/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Override default slate colors for Apple-inspired dark mode
        slate: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#3c3c3c', // Neutral dark gray for borders
          700: '#2d313c', // Apple-inspired dark border/divider
          800: '#1e222d', // Apple-inspired dark surface
          900: '#191d27', // Apple-inspired dark card background
          950: '#000000', // Apple-inspired pure black background
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'system-ui', 'sans-serif'],
      },
      typography: {
        DEFAULT: {
          css: {
            color: '#3c4043',
            a: {
              color: '#1a73e8',
              '&:hover': {
                color: '#1967d2',
              },
            },
          },
        },
      },
      keyframes: {
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '15%, 45%, 75%': { transform: 'translateX(-3px)' },
          '30%, 60%, 90%': { transform: 'translateX(3px)' },
        },
      },
      animation: {
        shake: 'shake 0.4s ease-in-out',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
