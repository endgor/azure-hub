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
        // Google-inspired color palette
        google: {
          blue: {
            50: '#e8f0fe',
            100: '#d2e3fc',
            200: '#aecbfa',
            300: '#8ab4f8',
            400: '#669df6',
            500: '#4285f4', // Primary Google Blue
            600: '#1a73e8',
            700: '#1967d2',
            800: '#185abc',
            900: '#174ea6',
          },
          gray: {
            50: '#fafafa',
            100: '#f5f5f5',
            200: '#e8eaed',
            300: '#dadce0',
            400: '#bdc1c6',
            500: '#9aa0a6',
            600: '#80868b',
            700: '#5f6368',
            800: '#3c4043',
            900: '#202124',
          },
          green: {
            50: '#e6f4ea',
            100: '#ceead6',
            500: '#34a853',
            600: '#137333',
            700: '#0d652d',
          },
          red: {
            50: '#fce8e6',
            100: '#fad2cf',
            500: '#ea4335',
            600: '#d33b2c',
            700: '#b52d20',
          },
          yellow: {
            50: '#fef7e0',
            100: '#feefc3',
            500: '#fbbc04',
            600: '#f9ab00',
            700: '#f29900',
          },
        },
        // Apple-inspired dark mode palette
        apple: {
          dark: {
            bg: '#000000',
            surface: '#191D27',
            'surface-elevated': '#1E222D',
            border: '#2D313C',
            text: {
              primary: '#EBEBEB',
              secondary: '#A0A0A0',
              tertiary: '#6E6E73',
            },
          },
          blue: '#0157F3',
          orange: '#ED864E',
        },
      },
      fontFamily: {
        sans: ['var(--font-roboto)', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'system-ui', 'sans-serif'],
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
      boxShadow: {
        'google': '0 1px 3px 0 rgba(60, 64, 67, 0.3), 0 4px 8px 3px rgba(60, 64, 67, 0.15)',
        'google-lg': '0 2px 6px 2px rgba(60, 64, 67, 0.15), 0 8px 24px 4px rgba(60, 64, 67, 0.15)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
