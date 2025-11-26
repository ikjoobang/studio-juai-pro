import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // ============================================
      // Studio Juai Design System
      // ============================================
      colors: {
        juai: {
          // Primary Colors
          black: "#111111",
          green: "#03C75A",
          orange: "#FF6B35",
          
          // Background Colors
          night: "#1a1a1a",
          paper: "#ffffff",
          
          // Gray Scale
          gray: {
            50: "#fafafa",
            100: "#f5f5f5",
            200: "#e5e5e5",
            300: "#d4d4d4",
            400: "#a3a3a3",
            500: "#737373",
            600: "#525252",
            700: "#404040",
            800: "#262626",
            900: "#171717",
          },
          
          // Semantic Colors
          success: "#03C75A",
          warning: "#FF6B35",
          error: "#EF4444",
          info: "#3B82F6",
        },
      },
      
      fontFamily: {
        sans: ["Pretendard", "system-ui", "-apple-system", "sans-serif"],
        display: ["Pretendard", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      
      fontSize: {
        "display-xl": ["4.5rem", { lineHeight: "1.1", letterSpacing: "-0.02em" }],
        "display-lg": ["3.75rem", { lineHeight: "1.1", letterSpacing: "-0.02em" }],
        "display-md": ["3rem", { lineHeight: "1.2", letterSpacing: "-0.01em" }],
        "display-sm": ["2.25rem", { lineHeight: "1.2", letterSpacing: "-0.01em" }],
        "heading-xl": ["1.875rem", { lineHeight: "1.3" }],
        "heading-lg": ["1.5rem", { lineHeight: "1.4" }],
        "heading-md": ["1.25rem", { lineHeight: "1.4" }],
        "heading-sm": ["1.125rem", { lineHeight: "1.5" }],
        "body-lg": ["1.125rem", { lineHeight: "1.6" }],
        "body-md": ["1rem", { lineHeight: "1.6" }],
        "body-sm": ["0.875rem", { lineHeight: "1.5" }],
        "caption": ["0.75rem", { lineHeight: "1.4" }],
      },
      
      spacing: {
        "18": "4.5rem",
        "22": "5.5rem",
        "30": "7.5rem",
      },
      
      borderRadius: {
        "xl": "1rem",
        "2xl": "1.5rem",
        "3xl": "2rem",
        "4xl": "2.5rem",
      },
      
      boxShadow: {
        "juai-sm": "0 1px 2px 0 rgba(17, 17, 17, 0.05)",
        "juai-md": "0 4px 6px -1px rgba(17, 17, 17, 0.1), 0 2px 4px -2px rgba(17, 17, 17, 0.1)",
        "juai-lg": "0 10px 15px -3px rgba(17, 17, 17, 0.1), 0 4px 6px -4px rgba(17, 17, 17, 0.1)",
        "juai-xl": "0 20px 25px -5px rgba(17, 17, 17, 0.1), 0 8px 10px -6px rgba(17, 17, 17, 0.1)",
        "juai-glow-green": "0 0 20px rgba(3, 199, 90, 0.3)",
        "juai-glow-orange": "0 0 20px rgba(255, 107, 53, 0.3)",
      },
      
      animation: {
        "fade-in": "fadeIn 0.3s ease-out",
        "fade-up": "fadeUp 0.4s ease-out",
        "slide-in-right": "slideInRight 0.3s ease-out",
        "slide-in-left": "slideInLeft 0.3s ease-out",
        "scale-in": "scaleIn 0.2s ease-out",
        "pulse-slow": "pulse 3s infinite",
        "bounce-slow": "bounce 2s infinite",
        "spin-slow": "spin 3s linear infinite",
        "typing": "typing 1.5s steps(20) infinite",
      },
      
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideInRight: {
          "0%": { opacity: "0", transform: "translateX(20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        slideInLeft: {
          "0%": { opacity: "0", transform: "translateX(-20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        typing: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
      },
      
      backgroundImage: {
        "gradient-juai": "linear-gradient(135deg, #03C75A 0%, #FF6B35 100%)",
        "gradient-dark": "linear-gradient(135deg, #111111 0%, #1a1a1a 100%)",
        "gradient-radial": "radial-gradient(ellipse at center, var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [],
};

export default config;
