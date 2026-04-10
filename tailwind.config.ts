import type { Config } from "tailwindcss"

const config = {
  darkMode: ["class"],
  content: [
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Minimalistic monochromatic system
        background: {
          DEFAULT: "#0A0F1A",
          secondary: "#111827",
        },
        surface: {
          DEFAULT: "rgba(17, 24, 39, 0.7)",
          secondary: "rgba(31, 41, 55, 0.7)",
          tertiary: "rgba(55, 65, 81, 0.6)",
        },
        
        // Enhanced accent colors
        brand: {
          DEFAULT: "#3B82F6",
          light: "#60A5FA",
          muted: "rgba(59, 130, 246, 0.1)",
        },
        
        // Dakhla Majalis brown theme
        highlight: {
          primary: "#BF7E4A",    // Warm Brown
          secondary: "#915C2F",  // Dark Brown
          accent: "#A0522D",     // Sienna Brown
          glow: "rgba(191, 126, 74, 0.15)", // Brown glow
          soft: "rgba(191, 126, 74, 0.08)", // Soft brown for backgrounds
        },
        
        // Content colors
        content: {
          DEFAULT: "#F9FAFB",
          subtle: "#9CA3AF",
          muted: "#6B7280",
          bright: "#FFFFFF",
        },
        
        // Border colors
        border: {
          DEFAULT: "rgba(75, 85, 99, 0.2)",
          hover: "rgba(75, 85, 99, 0.3)",
          highlight: "rgba(191, 126, 74, 0.3)", // Updated to brown
          white: "rgba(255, 255, 255, 0.1)", // For glass morphism borders
        },
        
        // Dakhla Majalis color palette - Brown theme
        majalis: {
          50: "#FDF8F6",     // Very light brown
          100: "#F7EDE7",    // Light brown
          200: "#EDDBCE",    // Light brown
          300: "#E0C4B0",    // Medium light brown
          400: "#D4AC91",    // Medium brown
          500: "#BF7E4A",    // Primary brown
          600: "#A6673A",    // Dark brown
          700: "#8B552F",    // Darker brown
          800: "#704425",    // Very dark brown
          900: "#55331B",    // Darkest brown
        },
        brown: {
          50: "#FEFDFB",     // Almost white
          100: "#F7F3F0",    // Very light brown
          200: "#E8DDD6",    // Light brown
          300: "#D4C4B8",    // Medium light brown
          400: "#BF7E4A",    // Your specified brown
          500: "#A6673A",    // Medium brown
          600: "#915C2F",    // Your specified dark brown
          700: "#7A4E28",    // Darker brown
          800: "#634020",    // Very dark brown
          900: "#4C3219",    // Darkest brown
        },
        amber: {
          50: "#FFFBEB",
          100: "#FEF3C7",
          200: "#FDE68A",
          300: "#FCD34D",
          400: "#FBBF24",
          500: "#F59E0B",
          600: "#D97706",
          700: "#B45309",
          800: "#92400E",
          900: "#78350F",
        },
        desert: {
          50: "#FEFDFB",
          100: "#FDF9F0",
          200: "#F9F1E0",
          300: "#F4E4BC",
          400: "#E6D3A3",
          500: "#D4B886",
          600: "#C2A16A",
          700: "#A3854D",
          800: "#856A31",
          900: "#664F15",
        },
        sand: {
          50: "#FAF7F2",
          100: "#F5F0E8",
          200: "#EBE0D1",
          300: "#DCCDB9",
          400: "#C9B6A0",
          500: "#B6A38C",
          600: "#9A8872",
          700: "#7D6E5D",
          800: "#5F5447",
          900: "#423C34",
        },
        stone: {
          50: "#FAFAF9",
          100: "#F5F5F4",
          200: "#E7E5E4",
          300: "#D6D3D1",
          400: "#A8A29E",
          500: "#78716C",
          600: "#57534E",
          700: "#44403C",
          800: "#292524",
          900: "#1C1917",
        },
        ebony: {
          50: "#F8F7F7",
          100: "#EEECEA",
          200: "#DDD9D7",
          300: "#C1BBB8",
          400: "#A39B96",
          500: "#827973",
          600: "#645D58",
          700: "#4D4742",
          800: "#38342F",
          900: "#24211E",
        }
      },
      
      fontFamily: {
        // Arabic body text
        arabic: ['var(--font-noto-naskh)', 'var(--font-noto-kufi)', 'Arial', 'sans-serif'],
        // Arabic headings/titles
        'arabic-title': ['var(--font-noto-kufi)', 'var(--font-noto-naskh)', 'Arial', 'sans-serif'],
        // Latin (French/English) body text
        latin: ['var(--font-dm-sans)', 'var(--font-plus-jakarta)', 'system-ui', 'sans-serif'],
        // Latin headings/titles
        'latin-title': ['var(--font-playfair)', 'Georgia', 'serif'],
        // Mantine's font stack (keep existing)
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica',
          'Arial',
          'sans-serif',
          'Apple Color Emoji',
          'Segoe UI Emoji',
        ],
        // For headings (keep existing)
        display: [
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica',
          'Arial',
          'sans-serif',
        ],
      },
      
      borderRadius: {
        'lg': '0.625rem',
        'xl': '0.75rem',
        '2xl': '0.875rem',
        '3xl': '1.5rem', // Added larger radius for testimonial cards
        '4xl': '2rem',
        '5xl': '2.5rem',
        'premium': '1.25rem',
      },
      
      // Enhanced background patterns
      backgroundImage: {
        'dot-pattern': 'radial-gradient(circle, #3B82F6 0.7px, transparent 0.7px)',
        'dot-matrix': `
          radial-gradient(circle, #3B82F6 0.7px, transparent 0.7px),
          radial-gradient(circle, #3B82F6 0.7px, transparent 0.7px)
        `,
        'grain': "url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbHRlcj0idXJsKCNhKSIgb3BhY2l0eT0iLjA1Ii8+PC9zdmc+')",
        'noise': "url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJub2lzZSIgeD0iMCIgeT0iMCI+PGZlVHVyYnVsZW5jZSB0eXBlPSJmcmFjdGFsTm9pc2UiIGJhc2VGcmVxdWVuY3k9IjAuOTUiIG51bU9jdGF2ZXM9IjMiIHN0aXRjaFRpbGVzPSJzdGl0Y2giIHJlc3VsdD0idHVyYnVsZW5jZSIvPjxmZUNvbG9yTWF0cml4IHR5cGU9InNhdHVyYXRlIiB2YWx1ZXM9IjAiLz48L2ZpbHRlcj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWx0ZXI9InVybCgjbm9pc2UpIiBvcGFjaXR5PSIwLjA1Ii8+PC9zdmc+')",
        'sand-gradient': 'linear-gradient(to right, #F5F0E8, #F5F0E8, #FAF7F2)',
        'gold-gradient': 'linear-gradient(135deg, #D4AF37, #F59E0B)',
        'desert-gradient': 'linear-gradient(to right, #FEFDFB, #F4E4BC, #FEFDFB)',
        'sahara-pattern': 'radial-gradient(circle at 25% 25%, #D4AF37 2px, transparent 2px), radial-gradient(circle at 75% 75%, #F59E0B 1px, transparent 1px)',
      },
      backgroundSize: {
        'dot': '35px 35px',
      },
      backgroundPosition: {
        'dot-offset': '0 0, 17.5px 17.5px',
      },
      animation: {
        'gradient-x': 'gradient-x 3s ease 1',
        'gradient-y': 'gradient-y 3s ease 1',
        'float': 'float 6s ease-in-out 1',
        'scale-pulse': 'scale-pulse 5s ease-in-out 1',
        'shine': 'shine 4s ease-in-out 1',
        'float-navbar': 'float-navbar 4s ease-in-out 1',
        'logo-spin': 'logo-spin 0.6s ease-in-out',
      },
      keyframes: {
        'gradient-y': {
          '0%, 100%': {
            'background-size': '400% 400%',
            'background-position': 'center top'
          },
          '50%': {
            'background-size': '200% 200%',
            'background-position': 'center center'
          }
        },
        'gradient-x': {
          '0%, 100%': {
            'background-size': '200% 200%',
            'background-position': 'left center'
          },
          '50%': {
            'background-size': '200% 200%',
            'background-position': 'right center'
          }
        },
        float: {
          '0%, 100%': { transform: 'translateY(0) scale(1)' },
          '50%': { transform: 'translateY(-10px) scale(1.1)' },
        },
        'scale-pulse': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.05)' },
        },
        'shine': {
          '0%': { 
            backgroundPosition: '0% 0%',
            opacity: '0.1'
          },
          '20%': { 
            backgroundPosition: '20% 0%',
            opacity: '0.2'
          },
          '50%': { 
            backgroundPosition: '110% 0%',
            opacity: '0.3'
          },
          '100%': { 
            backgroundPosition: '200% 0%',
            opacity: '0.1'
          },
        },
        'float-navbar': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-2px)' },
        },
        'logo-spin': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      },
      boxShadow: {
        'glass': '0 8px 32px rgba(0, 0, 0, 0.1)',
        'glass-highlight': '0 8px 32px rgba(191, 126, 74, 0.15)',
        'glow': '0 0 20px rgba(191, 126, 74, 0.2)',
        'majalis-glow': '0 0 30px rgba(191, 126, 74, 0.3)',
        'brown-glow': '0 0 25px rgba(191, 126, 74, 0.25)',
        'desert-glow': '0 4px 20px rgba(191, 126, 74, 0.15)',
        'premium': '0 20px 60px -15px rgba(0, 0, 0, 0.1), 0 8px 24px -12px rgba(0, 0, 0, 0.05)',
        'premium-hover': '0 25px 65px -10px rgba(0, 0, 0, 0.15), 0 10px 32px -8px rgba(0, 0, 0, 0.08)',
        'card': '0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.06)',
        'card-hover': '0 10px 40px -10px rgba(0, 0, 0, 0.1), 0 4px 16px -3px rgba(0, 0, 0, 0.08)',
        'subtle': '0 2px 6px rgba(0, 0, 0, 0.03), 0 1px 2px rgba(0, 0, 0, 0.04)',
        'subtle-hover': '0 4px 8px rgba(0, 0, 0, 0.04), 0 2px 4px rgba(0, 0, 0, 0.05)',
        'error': '0 0 0 2px rgba(239, 68, 68, 0.2)',
        'error-hover': '0 0 0 3px rgba(239, 68, 68, 0.3)',
        'input-glow': '0 0 0 2px rgba(191, 126, 74, 0.25)',
        'majalis-focus': '0 0 0 3px rgba(191, 126, 74, 0.15)',
        'floating': '0 8px 32px rgba(0, 0, 0, 0.12)',
        'floating-hover': '0 12px 40px rgba(0, 0, 0, 0.15)',
        'glassmorphism': '0 8px 32px rgba(31, 38, 135, 0.37)',
      },
      scale: {
        '98': '0.98',
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    require('@tailwindcss/typography'),
    require('@tailwindcss/forms'),
    require('tailwind-scrollbar'),
  ],
} satisfies Config

export default config
