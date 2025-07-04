/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    // monorepo-aware globs  ↓↓↓
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",        // Next.js app-router
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",

    // when built inside Docker, source lives one level deeper:
    "./apps/frontend/src/**/*.{js,ts,jsx,tsx,mdx}",
    "./apps/frontend/{app,pages,components}/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
    },
  },
  plugins: [],
};
