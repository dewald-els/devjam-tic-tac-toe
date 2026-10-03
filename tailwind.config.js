/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,vue}"],
  theme: {
    extend: {
      colors: {
        cream: "#FFF4DC",
        ink: "#2D2A4A",
        coral: "#FF5D73", // player X
        teal: "#1FC8B4", // player O
        sun: "#FFC83D", // primary actions
        grape: "#7C5CFF", // secondary / highlights
      },
      fontFamily: {
        display: ['"Fredoka"', "ui-rounded", "system-ui", "sans-serif"],
      },
      boxShadow: {
        pop: "0 5px 0 0 #2D2A4A",
        "pop-sm": "0 3px 0 0 #2D2A4A",
      },
    },
  },
  plugins: [],
}
