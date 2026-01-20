import { printLog } from "../../scripts/output/log/log.js";
import { loginUser } from "../../scripts/outh/sign-in.js";
import { showSuccessMessage } from "../../components/messages/success/success-message.js";

printLog("[Log In] Initializing Log In Page");

const loginForm = document.getElementById("login-form");
const passwordInput = document.getElementById("password-input");
const emailInput = document.getElementById("email-input");

loginForm.addEventListener("submit", async (event) => {
  let password = passwordInput.value;
  let email = emailInput.value;
  event.preventDefault();
  let userLogedIn = await loginUser(email, password);
  console.log("Login attempt with", email, password);
  if (userLogedIn !== null) {
    showSuccessMessage("Erfolgreich eingeloggt!");
    window.location.href = "/src/pages/profile/profile.html";
  }
});
