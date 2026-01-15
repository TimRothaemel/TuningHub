import { printLog } from "../output/log/log.js";
import { throwNewError } from "../output/error/error.js";

printLog("[Darkmode] Initializing Darkmode Module");

let theme = "dark"; // Possible values: 'dark' or 'light'

if (theme !== "dark" && theme !== "light") {
  throwNewError(
    "[Darkmode] Invalid theme value. Allowed values are 'dark' or 'light'."
  );
}

export function applyTheme() {
  if (theme === "dark") {
    document.body.classList.add("darkmode");
  } else {
    document.body.classList.remove("darkmode");
  }
}
