import { inject } from "@vercel/analytics";
import { injectSpeedInsights } from "@vercel/speed-insights";
import type { Theme } from "vitepress";
import DefaultTheme from "vitepress/theme";
import "./custom.css";

const theme: Theme = {
  extends: DefaultTheme,
  enhanceApp(context) {
    DefaultTheme.enhanceApp?.(context);

    if (typeof window !== "undefined") {
      inject({ framework: "vitepress" });
      injectSpeedInsights({ framework: "vitepress" });
    }
  },
};

export default theme;
