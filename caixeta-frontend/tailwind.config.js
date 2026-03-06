/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        caixeta: {
          red: '#E52421',
          dark: '#121212',
          card: '#1e1e1e',
        }
      }
    },
  },
  plugins: [],
}
