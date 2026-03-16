/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-dm-sans)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-dm-serif)', 'Georgia', 'serif'],
      },
      colors: {
        brand: {
          50:  '#E1F5EE',
          100: '#9FE1CB',
          500: '#1D9E75',
          600: '#0F6E56',
          900: '#04342C',
        },
      },
    },
  },
  plugins: [],
}
