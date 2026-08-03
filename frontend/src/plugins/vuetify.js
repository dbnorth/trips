import { createVuetify } from "vuetify";
import * as components from "vuetify/components";
import * as directives from "vuetify/directives";
import { loadFonts } from "./webfontloader.js";
loadFonts();

import "vuetify/styles";
import "@mdi/font/css/materialdesignicons.css";

const COLOR_MAP = {
  blue: "#196CA2",
  teal: "#00897B",
  green: "#2E7D32",
  purple: "#6A1B9A",
  red: "#C62828",
  orange: "#EF6C00",
};

export const resolveOrgColor = (colorFamily) => {
  if (colorFamily && /^#[0-9A-Fa-f]{6}$/.test(colorFamily)) return colorFamily;
  if (colorFamily && COLOR_MAP[colorFamily]) return COLOR_MAP[colorFamily];
  return "#196CA2";
};

const myCustomLightTheme = {
  dark: false,
  colors: {
    primary: "#196CA2",
    secondary: "#E1E1E1",
    accent: "#032F45",
    error: "#EE5044",
  },
};

const vuetify = createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: "myCustomLightTheme",
    themes: { myCustomLightTheme },
  },
  icons: { defaultSet: "mdi" },
});

export default vuetify;
