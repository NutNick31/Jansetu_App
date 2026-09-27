/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dpi: {
          orange: '#f97316',
          teal: '#14b8a6',
          emerald: '#10b981',
          slate: '#020617'
        }
      }
    },
  },
  plugins: [],
}
