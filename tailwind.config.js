/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  darkMode: 'class',
  theme: {
    container: { center: true, padding: '1rem' },
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        primary: {
          DEFAULT: 'var(--primary)',
          foreground: 'var(--primary-foreground)',
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          foreground: 'var(--secondary-foreground)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--accent-foreground)',
        },
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },
        card: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--card-foreground)',
        },
        border: 'var(--border)',
        input: 'var(--input)',
        ring: 'var(--ring)',
        'pink-light': 'var(--pink-light)',
        'pink-mid': 'var(--pink-mid)',
        coral: 'var(--coral)',
        'coral-light': 'var(--coral-light)',
        yellow: 'var(--yellow)',
        'yellow-light': 'var(--yellow-light)',
        'green-soft': 'var(--green-soft)',
        'green-text': 'var(--green-text)',
        'red-soft': 'var(--red-soft)',
        'red-text': 'var(--red-text)',
        'amber-soft': 'var(--amber-soft)',
        'amber-text': 'var(--amber-text)',
        neutral: 'var(--neutral)',
      },
      borderRadius: {
        DEFAULT: 'var(--radius)',
        sm: 'calc(var(--radius) - 4px)',
        md: 'var(--radius)',
        lg: 'calc(var(--radius) + 4px)',
        xl: 'calc(var(--radius) + 8px)',
        '2xl': 'calc(var(--radius) + 16px)',
        full: '9999px',
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'var(--font-plus-jakarta-sans)', 'sans-serif'],
        body: ['Plus Jakarta Sans', 'var(--font-plus-jakarta-sans)', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 4px rgba(96, 88, 89, 0.08)',
        'card-md': '0 4px 16px rgba(96, 88, 89, 0.10)',
        'card-lg': '0 8px 32px rgba(96, 88, 89, 0.12)',
        kawaii: '0 4px 16px rgba(255, 141, 161, 0.15)',
        'kawaii-lg': '0 8px 32px rgba(255, 141, 161, 0.18)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease forwards',
        'slide-up': 'slideUp 0.3s ease forwards',
        'bounce-soft': 'bounceSoft 0.4s ease',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        bounceSoft: {
          '0%': { transform: 'scale(1)' },
          '40%': { transform: 'scale(1.08)' },
          '100%': { transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};