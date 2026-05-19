/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./hooks/**/*.{js,jsx,ts,tsx}",
    "./lib/**/*.{js,jsx,ts,tsx}",
    "./store/**/*.{js,jsx,ts,tsx}"
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        brgr: {
          bg: "#FFF1DD",
          primary: "#FF4F2B",
          secondary: "#FFC53D",
          accent: "#2C7A4F",
          ink: "#1A1410",
          muted: "#776B5C",
          card: "#FFFFFF",
          soft: "#FFE6C9"
        }
      },
      fontFamily: {
        display: ["BricolageGrotesque_700Bold"],
        body: ["PlusJakartaSans_400Regular", "PlusJakartaSans_600SemiBold"],
        mono: ["IBMPlexMono_600SemiBold"]
      }
    }
  },
  plugins: []
};
