/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Paleta monocromática de azules — usar SOLO estos tonos en todo el proyecto
        surface: "#f9fafb", // fondo general de la app
        blue: {
          100: "#b8d1e7", // fondos sutiles, hover suaves
          200: "#8fbfec", // bordes, chips, estados secundarios
          300: "#64a6e3", // acentos medios, iconografía activa
          400: "#3e8fd8", // hover de CTA, focus rings
          DEFAULT: "#0960ae", // Primary: CTAs, navegación activa, elementos de foco
          500: "#0960ae",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        xl: "0.875rem",
      },
      boxShadow: {
        card: "0 1px 2px 0 rgba(9, 96, 174, 0.06)",
      },
    },
  },
  plugins: [],
};
