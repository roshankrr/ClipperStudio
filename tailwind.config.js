/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#FF8B33",
          hover: "#FF9A4C",
          soft: "#FFF2E8",
          deep: "#A9480A",
        },
        dark: {
          frame: "#1E1612",
          surface: "#2C221D",
          border: "#3D3028",
        },
        cream: {
          50: "#FAF7F5",
          100: "#F5EFEA",
          200: "#EADFD6",
        }
      },
      borderRadius: {
        'lg': '16px',
        'md': '12px',
        'sm': '8px',
      }
    },
  },
  plugins: [],
};
