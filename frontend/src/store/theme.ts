import { create } from "zustand";

type Theme = "light" | "dark";

type ThemeState = {
  theme: Theme;
  toggleTheme: () => void;
};

const savedTheme = (localStorage.getItem("finflow_theme") as Theme | null) ?? "light";
document.documentElement.classList.toggle("dark", savedTheme === "dark");

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: savedTheme,
  toggleTheme: () => {
    const theme = get().theme === "dark" ? "light" : "dark";
    localStorage.setItem("finflow_theme", theme);
    document.documentElement.classList.toggle("dark", theme === "dark");
    set({ theme });
  },
}));
