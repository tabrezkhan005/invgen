import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'class', // Manual theme switching
  theme: {
    extend: {
      // Custom font families
      fontFamily: {
        'sans': ['var(--font-sans)', 'system-ui', 'sans-serif'],
        'mono': ['var(--font-mono)', 'monospace'],
      },

      // Extended spacing scale
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '112': '28rem',
        '128': '32rem',
      },

      // Custom border radius
      borderRadius: {
        'xl': 'var(--border-radius-xl)',
      },

      // Extended colors for semantic usage - Tally Theme
      colors: {
        // App colors
        'app-bg': 'var(--app-bg)',
        'surface': 'var(--surface)',

        // Sidebar colors
        'sidebar-bg': 'var(--sidebar-bg)',
        'sidebar-text': 'var(--sidebar-text)',
        'sidebar-active-bg': 'var(--sidebar-active-bg)',
        'sidebar-active-text': 'var(--sidebar-active-text)',

        // Border colors
        'border': 'var(--border)',

        // Text colors
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted': 'var(--text-muted)',

        // Neutral scale
        'neutral': {
          50: 'var(--neutral-50)',
          100: 'var(--neutral-100)',
          200: 'var(--neutral-200)',
          300: 'var(--neutral-300)',
          400: 'var(--neutral-400)',
          500: 'var(--neutral-500)',
          600: 'var(--neutral-600)',
          700: 'var(--neutral-700)',
          800: 'var(--neutral-800)',
          900: 'var(--neutral-900)',
        },

        // Primary scale
        'primary': {
          DEFAULT: 'var(--primary)',
          hover: 'var(--primary-hover)',
          soft: 'var(--primary-soft)',
          50: 'var(--primary-soft)',
          500: 'var(--primary)',
          600: 'var(--primary-hover)',
          700: 'var(--primary-hover)',
        },

        // Semantic colors
        'success': {
          DEFAULT: 'var(--success)',
          soft: 'var(--success-soft)',
          50: 'var(--success-soft)',
          500: 'var(--success)',
          600: 'var(--success)',
          700: 'var(--success)',
        },

        'warning': {
          DEFAULT: 'var(--warning)',
          soft: 'var(--warning-soft)',
          50: 'var(--warning-soft)',
          500: 'var(--warning)',
          600: 'var(--warning)',
          700: 'var(--warning)',
        },

        'danger': {
          DEFAULT: 'var(--danger)',
          soft: 'var(--danger-soft)',
          50: 'var(--danger-soft)',
          500: 'var(--danger)',
          600: 'var(--danger)',
          700: 'var(--danger)',
        },
      },

      // Custom font sizes
      fontSize: {
        '2xs': 'var(--text-xs)',
        'xs': 'var(--text-xs)',
        'sm': 'var(--text-sm)',
        'base': 'var(--text-base)',
        'lg': 'var(--text-lg)',
        'xl': 'var(--text-xl)',
        '2xl': 'var(--text-2xl)',
        '3xl': 'var(--text-3xl)',
        '4xl': 'var(--text-4xl)',
      },

      // Custom font weights
      fontWeight: {
        'light': 'var(--font-light)',
        'normal': 'var(--font-normal)',
        'medium': 'var(--font-medium)',
        'semibold': 'var(--font-semibold)',
        'bold': 'var(--font-bold)',
      },

      // Custom line heights
      lineHeight: {
        'tight': 'var(--leading-tight)',
        'snug': 'var(--leading-snug)',
        'normal': 'var(--leading-normal)',
        'relaxed': 'var(--leading-relaxed)',
      },

      // Custom box shadows
      boxShadow: {
        'sm': 'var(--shadow-sm)',
        'DEFAULT': 'var(--shadow)',
        'lg': 'var(--shadow-lg)',
      },

      // Animation utilities
      animation: {
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'slide-in': 'slideIn 0.2s ease-out',
      },

      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateY(-4px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },

  plugins: [],
};

export default config;
