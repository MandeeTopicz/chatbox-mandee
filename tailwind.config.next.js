/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        // Student palette
        'stu-primary': {
          DEFAULT: '#4f46e5', // indigo-600
          dark: '#4338ca',    // indigo-700
        },
        'stu-accent': {
          amber: '#fbbf24',   // amber-400
          teal: '#14b8a6',    // teal-500
        },
        'stu-bg': '#eef2ff',  // indigo-50
        // Teacher palette
        'tea-primary': {
          DEFAULT: '#1e293b', // slate-800
          dark: '#0f172a',    // slate-900
        },
        'tea-accent': '#2563eb', // blue-600
        'tea-bg': '#f8fafc',     // slate-50
        // Admin palette
        'adm-primary': '#334155', // slate-700
        'adm-accent': '#7c3aed',  // violet-600
        'adm-bg': '#f1f5f9',      // slate-100
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        // Card radii by role context
        'card-student': '1rem',   // rounded-2xl equivalent
        'card-teacher': '0.75rem', // rounded-xl equivalent
        'card-admin': '0.75rem',   // rounded-xl equivalent
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
