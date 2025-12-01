/** @type {import('tailwindcss').Config} */
module.exports = {
  variants: {
    extend: {
      textColor: ['hover'], // Ensure hover is enabled for text colors
    }
  },
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./hooks/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
    "./utils/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}", // if you're using /pages
  ],
  theme: {
   extend: {
     backgroundImage: {
        'card-pattern': "url('/assets/images/bg-card.png')",
      },
      colors: {
        primary: '#F55B44', // This is the orange-red tone in your screenshot
      },
      keyframes: {
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%, 60%': { transform: 'translateX(-6px)' },
          '40%, 80%': { transform: 'translateX(6px)' },
        },
      },
      animation: {
        shake: 'shake 0.4s ease-in-out',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
}