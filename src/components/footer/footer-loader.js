// Import necessary functions
import { throwNewError } from "../../scripts/output/error/error.js";
import { printLog } from "../../scripts/output/log/log.js";

printLog("[Footer] footer-loader.js initialized");

document.addEventListener("DOMContentLoaded", function () {
  let footer = document.querySelector(".footer");

  if (!footer) {
    throwNewError("[Footer] Footer element not found");
    return;
  }

  fetch("/src/components/footer/footer.html")
    .then((response) => {
      if (!response.ok) {
        throwNewError(`HTTP error! status: ${response.status}`);
        return;
      }
      return response.text();
    })
    .then((data) => {
      footer.innerHTML = data;
      document.dispatchEvent(new CustomEvent("footerLoaded"));
      printLog("[Footer] Footer geladen und Event ausgelöst");
    })
    .catch((error) => {
      throwNewError("Error loading footer:", error);
    });
});
