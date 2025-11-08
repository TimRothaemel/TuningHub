function togglePasswordVisibility() {
  const passwordInput = document.getElementById("password")
  const toggleSvg = document.getElementById("toggleSvg")

  if (passwordInput.type === "password") {
    passwordInput.type = "text"
    toggleSvg.src = "../../public/svg/visibility_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
  } else {
    passwordInput.type = "password"
    toggleSvg.src = "../../public/svg/visibility_off_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
  }
}