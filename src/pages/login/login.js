import { printLog } from "../../scripts/output/log/log.js";
import { loginUser } from "../../scripts/outh/sign-in.js";

printLog("[Log In] Initializing Log In Page");

const loginForm = document.getElementById("login-form");
const passwordInput = document.getElementById("password-input");
const emailInput = document.getElementById("email-input");

loginForm.addEventListener("submit", async (event) => {
  let password = passwordInput.value;
  let email = emailInput.value;
  event.preventDefault();
  loginUser(email, password);
  console.log("Login attempt with", email, password);
});
