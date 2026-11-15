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
          DEFAULT: "#FF6B00",
          hover: "#FF7D1A",
          glow: "rgba(255, 107, 0, 0.25)",
          soft: "#FFF3E8",
          dark: "#CC5500",
        },
        dark: {
          bg: "#080A0F",
          frame: "#0E1118",
          surface: "#151924",
          card: "#181D2A",
          border: "rgba(255, 255, 255, 0.08)",
          hover: "rgba(255, 255, 255, 0.14)",
        },
        cream: {
          50: "#FAF9F6",
          100: "#F3EFEA",
          200: "#E6DFD7",
        }
      },
      borderRadius: {
        '3xl': '24px',
        '2xl': '18px',
        'xl': '14px',
        'lg': '10px',
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "'Segoe UI'",
          "Roboto",
          "Inter",
          "Helvetica",
          "Arial",
          "sans-serif"
        ],
      },
      boxShadow: {
        'glow': '0 0 40px -10px rgba(255, 107, 0, 0.2)',
        'glow-lg': '0 0 60px -15px rgba(255, 107, 0, 0.3)',
        'card': '0 8px 30px rgba(0, 0, 0, 0.4)',
      }
    },
  },
  plugins: [],
};
