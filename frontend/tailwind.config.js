/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // Body / UI font — Inter via CSS variable (set in layout.tsx)
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
        // Display font — Space Grotesk for hero headlines and page titles
        display: ["var(--font-space-grotesk)", "Space Grotesk", "Inter", "system-ui", "sans-serif"],
      },
      colors: {
        // ArcNS brand color shortcuts for use in Tailwind classes
        arcns: {
          blue:    "#2563FF",
          cyan:    "#00D4FF",
          teal:    "#00E6C2",
          green:   "#14F195",
          warning: "#FBBF24",
          danger:  "#FF5C7A",
          navy:    "#050A18",
          surface: "#0B1224",
        },
      },
    },
  },
  plugins: [],
};
