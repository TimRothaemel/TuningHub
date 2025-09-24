console.log("register.js geladen");

const trackingUrl = "https://lhxcnrogjjskgaclqxtm.supabase.co";
const trackingKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxoeGNucm9nampza2dhY2xxeHRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1MjU0MzUsImV4cCI6MjA2ODEwMTQzNX0.vOr_Esi9IIesFixkkvYQjYEqghrKCMeqbrPKW27zqww";

const supabaseUrl = "https://yvdptnkmgfxkrszitweo.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2ZHB0bmttZ2Z4a3Jzeml0d2VvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3MDAwMzQsImV4cCI6MjA2NjI3NjAzNH0.Kd6D6IQ_stUMrcbm2TN-7ACjFJvXNmkeNehQHavTmJo";

const trackingClient = supabase.createClient(trackingUrl, trackingKey);
const client = supabase.createClient(supabaseUrl, supabaseKey);

let currentStep = 1;
const maxSteps = 3;
let userData = {};

// 🛡 Eingabe-Validierung
function sanitizeInput(input) {
  if (typeof input !== "string") return "";
  return input.trim().replace(/[<>]/g, "").substring(0, 500);
}

function sanitizeEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const sanitized = sanitizeInput(email);
  return emailRegex.test(sanitized) ? sanitized : "";
}

function sanitizeUrl(url) {
  if (!url || url.trim() === "") return "";
  const sanitized = sanitizeInput(url);
  try {
    const urlObj = new URL(sanitized);
    if (urlObj.protocol === "http:" || urlObj.protocol === "https:") {
      return urlObj.toString();
    }
  } catch {
    return "";
  }
  return "";
}

// 📱 Handy-Vibration
function vibrateDevice() {
  if ("vibrate" in navigator) {
    navigator.vibrate([200, 100, 400]); // kurz-lang-kurz
  }
}

// ✅ Registrierung abgeschlossen
function finishRegistration() {
  vibrateDevice();
  trackEvent("registration_completed", {
    email: userData.email,
    username: userData.username,
  });
  setTimeout(() => {
    window.location.href = "login.html";
  }, 1000);
}

// 📊 Progress-Bar aktualisieren
function updateProgressBar() {
  const progressLine = document.getElementById("progress-line");
  const width = ((currentStep - 1) / (maxSteps - 1)) * 100;
  progressLine.style.width = width + "%";

  for (let i = 1; i <= maxSteps; i++) {
    const circle = document.getElementById(`step-circle-${i}`);
    const title = document.getElementById(`step-title-${i}`);
    circle.classList.remove("active", "completed");
    title.classList.remove("active", "completed");

    if (i < currentStep) {
      circle.classList.add("completed");
      title.classList.add("completed");
    } else if (i === currentStep) {
      circle.classList.add("active");
      title.classList.add("active");
    }
  }
}

// 🔀 Schritt wechseln
function showStep(step) {
  for (let i = 1; i <= maxSteps; i++) {
    document.getElementById(`step-${i}`).classList.remove("active");
  }
  document.getElementById(`step-${step}`).classList.add("active");

  const prevButton = document.getElementById("prev-button");
  const nextButton = document.getElementById("next-button");
  const finishButton = document.getElementById("finish-button");
  const alternativeLinks = document.getElementById("alternative-links");

  prevButton.style.display = step > 1 ? "inline-block" : "none";

  if (step === maxSteps) {
    nextButton.style.display = "none";
    finishButton.style.display = "inline-block";
    alternativeLinks.style.display = "none";
  } else {
    nextButton.style.display = "inline-block";
    finishButton.style.display = "none";
    alternativeLinks.style.display = step === 1 ? "block" : "none";
    nextButton.textContent = step === 2 ? "Registrieren" : "Weiter";
  }

  updateProgressBar();
}

function nextStep() {
  if (validateCurrentStep()) {
    if (currentStep === 2) {
      performRegistration(); // Registrierung starten
    } else if (currentStep < maxSteps) {
      currentStep++;
      showStep(currentStep);
    }
  }
}

function previousStep() {
  if (currentStep > 1) {
    currentStep--;
    showStep(currentStep);
  }
}

// 🧩 Validierung
function validateCurrentStep() {
  if (currentStep === 1) return validateStep1();
  if (currentStep === 2) return validateStep2();
  return true;
}

function validateStep1() {
  const username = sanitizeInput(document.getElementById("username").value);
  let phone = sanitizeInput(document.getElementById("phone").value);
  const email = sanitizeEmail(document.getElementById("email").value);
  const socialMedia = sanitizeUrl(document.getElementById("social-media").value);
  const password = document.getElementById("password").value;
  const passwordConfirm = document.getElementById("password-confirm").value;
  const privacyConsent = document.getElementById("privacy-consent").checked;
  const agbConsent = document.getElementById("agb-consent").checked;
  const errorText = document.getElementById("error");
  errorText.textContent = "";

  if (!username || !phone || !email || !password || !passwordConfirm) {
    errorText.textContent = "Bitte füllen Sie alle Pflichtfelder aus.";
    return false;
  }
  if (!sanitizeEmail(email)) {
    errorText.textContent = "Bitte geben Sie eine gültige E-Mail ein.";
    return false;
  }
  if (password !== passwordConfirm) {
    errorText.textContent = "Die Passwörter stimmen nicht überein.";
    return false;
  }
  if (password.length < 8) {
    errorText.textContent = "Das Passwort muss mindestens 8 Zeichen lang sein.";
    return false;
  }
  if (!( /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password) )) {
    errorText.textContent = "Das Passwort muss Groß-, Kleinbuchstaben und Zahlen enthalten.";
    return false;
  }
  if (!privacyConsent) {
    errorText.textContent = "Sie müssen der Datenschutzerklärung zustimmen.";
    return false;
  }
  if (!agbConsent) {
    errorText.textContent = "Sie müssen den AGBs zustimmen.";
    return false;
  }
  if (!isValidPhoneNumber(phone)) {
    errorText.textContent = "Bitte geben Sie eine gültige Telefonnummer ein.";
    return false;
  }

  try {
    const parsed = libphonenumber.parsePhoneNumberFromString(phone, "DE");
    phone = parsed.format("E.164");
  } catch {
    errorText.textContent = "Fehler beim Formatieren der Telefonnummer.";
    return false;
  }

  userData = {
    username,
    phone,
    email,
    password,
    socialMedia,
    privacyConsent,
    agbConsent,
  };
  return true;
}

function validateStep2() {
  const contactMethods = document.querySelectorAll(
    'input[name="contact-method"]:checked'
  );
  if (contactMethods.length === 0) {
    document.getElementById("error").textContent =
      "Bitte wählen Sie mindestens eine Kontaktmöglichkeit aus.";
    return false;
  }
  userData.contactMethods = Array.from(contactMethods).map((cb) => cb.value);
  return true;
}

// 📞 Kontaktoption wählen
function selectContactOption(optionId) {
  const option = document.getElementById(optionId);
  const container = option.parentElement;
  option.checked = !option.checked;
  container.classList.toggle("selected", option.checked);
}

// 📝 Registrierung bei Supabase
async function performRegistration() {
  const errorText = document.getElementById("error");
  errorText.textContent = "Registrierung läuft...";

  try {
    await trackEvent("registration_attempt", {
      email: userData.email,
      contact_methods: userData.contactMethods,
    });

    const { data: signupData, error: signupError } = await client.auth.signUp({
      email: userData.email,
      password: userData.password,
      options: {
        data: {
          username: userData.username,
          phone: userData.phone,
          privacy_consent: userData.privacyConsent,
          privacy_consent_date: new Date().toISOString(),
          agb_consent: userData.agbConsent ? "true" : "false",
          agb_consent_date: new Date().toISOString(),
          preferences: {
            contact_methods: userData.contactMethods,
            social_media: userData.socialMedia || null,
          },
        },
      },
    });

    if (signupError) throw signupError;

    await trackEvent("registration_success", {
      email: userData.email,
      username: userData.username,
      phone: userData.phone,
      user_id: signupData.user?.id,
      preferences: userData.preferences,
      privacy_consent: userData.privacyConsent,
      agb_consent: userData.agbConsent,
    });

    document.getElementById("confirmation-email").textContent = userData.email;
    vibrateDevice();
    errorText.textContent = "";
    currentStep = 3;
    showStep(currentStep);
  } catch (error) {
    console.error("Registrierungsfehler:", error);
    errorText.textContent =
      error.message.includes("already registered")
        ? "Diese E-Mail ist bereits registriert."
        : "Fehler: " + error.message;
    await trackEvent("registration_error", {
      email: userData.email,
      error_message: error.message,
    });
  }
}

// 🔑 Passwort anzeigen/verstecken
function togglePassword(fieldId) {
  const field = document.getElementById(fieldId);
  const button = field.parentNode.querySelector(".password-toggle");
  if (field.type === "password") {
    field.type = "text";
    button.textContent = "🙈";
  } else {
    field.type = "password";
    button.textContent = "👁️";
  }
}

// 📱 Telefonnummer prüfen
function isValidPhoneNumber(phoneNumber, countryCode = "DE") {
  try {
    const parsed = libphonenumber.parsePhoneNumberFromString(
      phoneNumber,
      countryCode
    );
    return parsed && parsed.isValid();
  } catch {
    return false;
  }
}

// 📊 Tracking in Supabase
async function trackEvent(eventType, metadata = {}) {
  try {
    const { error } = await trackingClient
      .from("tracking_events")
      .insert({ event_type: eventType, metadata });
    if (error) console.error("[Tracking] Supabase error:", error);
  } catch (err) {
    console.error("[Tracking] Unexpected error:", err);
  }
}

// 🚀 Init
document.addEventListener("DOMContentLoaded", () => {
  const phoneInput = document.getElementById("phone");
  if (phoneInput) {
    phoneInput.addEventListener("input", (e) => {
      let value = sanitizeInput(e.target.value);
      const formatted = formatPhoneNumber(value);
      if (formatted && formatted !== value) e.target.value = formatted;
    });
  }

  const textInputs = document.querySelectorAll(
    'input[type="text"], input[type="email"], input[type="tel"], input[type="url"]'
  );
  textInputs.forEach((input) => {
    input.addEventListener("blur", function () {
      if (this.type === "email") this.value = sanitizeEmail(this.value);
      else if (this.type === "url") this.value = sanitizeUrl(this.value);
      else this.value = sanitizeInput(this.value);
    });
  });

  showStep(1);
});