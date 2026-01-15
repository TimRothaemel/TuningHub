import { throwNewError } from "../../scripts/output/error/error.js";
import { printLog } from "../../scripts/output/log/log.js";

printLog("[Back Button] back-btn-loader initialized");

document.addEventListener("DOMContentLoaded", function () {
  let footer = document.querySelector(".back-btn");

  if (!footer) {
    throwNewError("[Back Button] back-btn element not found");
    return;
  }

  fetch("/src/components/back-btn/back-btn.html")
    .then((response) => {
      if (!response.ok) {
        throwNewError(`HTTP error! status: ${response.status}`);
        return;
      }
      return response.text();
    })
    .then((data) => {
      footer.innerHTML = data;
      document.dispatchEvent(new CustomEvent("backBtnLoaded"));
      printLog("[Back Button] back-btn geladen und Event ausgelöst");
    })
    .catch((error) => {
      throwNewError("Error loading back-btn:", error);
    });
});