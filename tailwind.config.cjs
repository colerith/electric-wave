/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './index.html',
    './index.tsx',
    './App.tsx',
    './components/**/*.{ts,tsx}',
    './services/**/*.{ts,tsx}'
  ],
  safelist: [
    'bg-zine-paper',
    'bg-zine-blue/5',
    'bg-zine-blue/10',
    'border-zine-blue/10',
    'text-zine-blue',
    'text-zine-blue/20',
    'from-zine-blue',
    'via-zine-pink',
    'to-zine-blue',
    'dark:from-white',
    'dark:via-blue-300',
    'dark:to-white',
    'bg-gradient-to-r',
    'text-transparent',
    'bg-clip-text',
    'font-serif',
    'font-sans',
    'text-6xl',
    'font-light',
    'dark:bg-dark-paper',
    'hover:shadow-soft',
    'dark:hover:border-zine-blue/50',
    'line-clamp-2',
    'line-clamp-3',
    'sticky',
    'top-0',
    'backdrop-blur-md'
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Noto Sans SC"', 'sans-serif'],
        serif: ['"Noto Serif SC"', 'serif']
      },
      colors: {
        'zine-blue': '#1B3C73',
        'zine-blue-light': '#587DBD',
        'zine-pink': '#FF9EBB',
        'zine-pink-light': '#FFE4EA',
        'zine-paper': '#FAFAF9',
        'zine-gray': '#E5E5E5',
        'dark-bg': '#0f172a',
        'dark-paper': '#1e293b'
      },
      backgroundImage: {
        noise: "url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22 opacity=%220.05%22/%3E%3C/svg%3E')"
      },
      boxShadow: {
        soft: '0 4px 20px -2px rgba(27, 60, 115, 0.1)',
        sharp: '4px 4px 0px 0px #1B3C73',
        'sharp-dark': '4px 4px 0px 0px #FF9EBB'
      },
      animation: {
        blob: 'blob 10s infinite'
      },
      keyframes: {
        blob: {
          '0%': { transform: 'translate(0px, 0px) scale(1)' },
          '33%': { transform: 'translate(30px, -50px) scale(1.1)' },
          '66%': { transform: 'translate(-20px, 20px) scale(0.9)' },
          '100%': { transform: 'translate(0px, 0px) scale(1)' }
        }
      }
    }
  }
};
