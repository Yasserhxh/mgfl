/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Marque verte (fruits & légumes / MGFL), neutres froids (zinc),
        // accents doux — structure inspirée du dashboard EFC.
        primary: {
          DEFAULT: "#1A7F37", // vert de marque (nav active, logo, boutons)
          hover: "#116329",
          soft: "#E6F4EA",    // vert très clair (chips / survol)
        },
        brand: {
          DEFAULT: "#1A7F37", // alias vert accent (graphiques, liens)
          soft: "#E6F4EA",
        },
        accent: {
          DEFAULT: "#94C245", // vert lime (finition logo / mise en avant)
          hover: "#83AE3A",
          soft: "#F1F7E4",
        },
        success: { DEFAULT: "#00BC7D", soft: "#E3F8F0" }, // Générés
        warning: { DEFAULT: "#B69E05", soft: "#FBF5DA" }, // Bloqués
        info: { DEFAULT: "#1183D4", soft: "#E3F1FB" },    // En cours
        danger: { DEFAULT: "#E7000B", soft: "#FCE6E7" },  // Infractions
        ink: "#111113",       // texte principal
        muted: "#71717A",     // texte secondaire (zinc-500)
        line: "#E4E4E7",      // bordures (zinc-200)
        surface: "#FFFFFF",
        canvas: "#FAFAFA",    // fond d'application (zinc-50)
      },
      fontFamily: {
        sans: ['Inter', '"Segoe UI"', "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(17,17,19,0.04), 0 1px 8px rgba(17,17,19,0.04)",
      },
      borderRadius: {
        xl: "0.875rem",
      },
    },
  },
  plugins: [],
};
