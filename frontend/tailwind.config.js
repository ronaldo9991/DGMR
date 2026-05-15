/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#EFF6FF",
          100: "#DBEAFE",
          500: "#3B82F6",
          600: "#1A56DB",
          700: "#1E40AF",
          900: "#1E3A8A",
        },
      },
    },
  },
  plugins: [require("@tailwindcss/forms")],
};
