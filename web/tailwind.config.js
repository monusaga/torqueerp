/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        re: {
          dark: '#ffffff',      // Pure Clean White Background
          charcoal: '#ffffff',  // Clean White Card
          surface: '#f8fafc',   // Soft Light Grey Surface
          hover: '#f1f5f9',     // Hover Light Grey
          border: '#e2e8f0',    // Light Grey Crisp Border
          gold: '#d97706',      // Royal Enfield Brass / Gold
          goldLight: '#b45309', // Darker Gold for Light Theme Contrast
          red: '#dc2626',       // Heritage Red
          redDark: '#991b1b',   // Crimson Dark
          grey: {
            50: '#f8fafc',
            100: '#0f172a',     // Dark text for 100 on light theme
            200: '#1e293b',     // Deep Slate
            300: '#334155',     // Slate
            400: '#64748b',     // Muted Text
            500: '#94a3b8',     // Light Text
          }
        },
        brand: {
          500: '#d97706',
          600: '#b45309',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
