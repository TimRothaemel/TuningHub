import { printLog } from "../../scripts/output/log/log.js";
import { checkUserLoggesIn } from "../../scripts/outh/outh-check.js";

printLog("[Profile Page] Initializing Profile Page");

document.addEventListener("DOMContentLoaded", async () => {
  const isLoggedIn = await checkUserLoggesIn();
    if (!isLoggedIn) {
        window.location.href = "../login/login.html";
    }

})