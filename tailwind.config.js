/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        "primary": "#fa6c38",
        "background-light": "#f8f6f5",
        "background-dark": "#0a0a0a",
        "neutral-950": "#0a0a0a",
        "neutral-900": "#171717",
        "neutral-800": "#262626",
        "neutral-200": "#F5F5F5",
        "whatsapp-green": "#25D366"
      },
      fontFamily: {
        "display": ["Poppins", "sans-serif"],
        "body": ["Noto Sans Devanagari", "sans-serif"],
      },
      borderRadius: {
        "DEFAULT": "1rem",
        "lg": "1.5rem",
        "xl": "2rem",
        "full": "9999px"
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};