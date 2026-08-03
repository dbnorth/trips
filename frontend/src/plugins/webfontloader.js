import { load } from "webfontloader";

export function loadFonts() {
  load({
    google: {
      families: ["Roboto:100,300,400,500,700,900&display=swap"],
    },
  });
}
