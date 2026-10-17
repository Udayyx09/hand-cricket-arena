/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        pitch: '#b5ff00',
        pitchGrid: '#9de000',
        charcoal: '#1a1a1a',
        neoYellow: '#ffe600',
        neoPink: '#ff66c4',
        neoRed: '#ff3b5c',
      },
      boxShadow: {
        'brutal': '6px 6px 0px #000',
        'brutal-sm': '3px 3px 0px #000',
        'brutal-lg': '8px 8px 0px #000',
        'brutal-pressed': '1px 1px 0px #000',
      }
    },
  },
  plugins: [],
}
