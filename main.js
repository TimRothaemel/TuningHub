import { printLog } from "/src/scripts/output/log/log.js";
import { applyTheme } from "/src/scripts/darkmode/darkmode.js";

printLog("[Main JS] Initializing main.js");

document.addEventListener("DOMContentLoaded", () => {
  applyTheme();
});