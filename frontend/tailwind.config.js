/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        safe: '#22c55e',
        caution: '#eab308',
        warning: '#f97316',
        highRisk: '#ef4444',
        critical: '#dc2626',
      }
    },
  },
  plugins: [],
}
