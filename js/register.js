console.log("register.js geladen");

// Initialize global variables FIRST
let currentStep = 1;
const maxSteps = 3;
let userData = {};

// Use existing Supabase clients from supabaseClient.js
let trackingClient = null;
let client = null;

// Function to get Supabase clients from window object
function getSupabaseClients() {
  if (window.supabase && window.trackingSupabase) {
    client = window.supabase;
    trackingClient = window.trackingSupabase;
    console.log("Using existing Supabase clients from window object");
    return true;
  }
  return false;
}

// Wait for Supabase clients to be available
function waitForSupabase() {
  return new Promise((resolve) => {
    if (getSupabaseClients()) {
      resolve();
      return;
    }
    
    let attempts = 0;
    const maxAttempts = 50; // 5 seconds maximum wait
    const interval = setInterval(() => {
      attempts++;
      if (getSupabaseClients()) {
        clearInterval(interval);
        resolve();
      } else if (attempts >= maxAttempts) {
        clearInterval(interval);
        console.error("Supabase clients not available after 5 seconds");
        const errorText = document.getElementById("error");
        if (errorText) {
          errorText.textContent = "Fehler beim Laden der Anwendung. Bitte laden Sie die Seite neu.";
        }
        resolve(); // Resolve anyway to prevent hanging
      }
    }, 100);
  });
}

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

// ✅ Registrierung abgeschlossen - Make globally accessible
window.finishRegistration = function finishRegistration() {
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
  if (!progressLine) return;
  
  const width = ((currentStep - 1) / (maxSteps - 1)) * 100;
  progressLine.style.width = width + "%";

  for (let i = 1; i <= maxSteps; i++) {
    const circle = document.getElementById(`step-circle-${i}`);
    const title = document.getElementById(`step-title-${i}`);
    
    if (circle) {
      circle.classList.remove("active", "completed");
      if (i < currentStep) {
        circle.classList.add("completed");
      } else if (i === currentStep) {
        circle.classList.add("active");
      }
    }
    
    if (title) {
      title.classList.remove("active", "completed");
      if (i < currentStep) {
        title.classList.add("completed");
      } else if (i === currentStep) {
        title.classList.add("active");
      }
    }
  }
}

// 🔀 Schritt wechseln
function showStep(step) {
  for (let i = 1; i <= maxSteps; i++) {
    const stepElement = document.getElementById(`step-${i}`);
    if (stepElement) {
      stepElement.classList.remove("active");
    }
  }
  
  const currentStepElement = document.getElementById(`step-${step}`);
  if (currentStepElement) {
    currentStepElement.classList.add("active");
  }

  const prevButton = document.getElementById("prev-button");
  const nextButton = document.getElementById("next-button");
  const finishButton = document.getElementById("finish-button");
  const alternativeLinks = document.getElementById("alternative-links");

  if (prevButton) {
    prevButton.style.display = step > 1 ? "inline-block" : "none";
  }

  if (step === maxSteps) {
    if (nextButton) nextButton.style.display = "none";
    if (finishButton) finishButton.style.display = "inline-block";
    if (alternativeLinks) alternativeLinks.style.display = "none";
  } else {
    if (nextButton) {
      nextButton.style.display = "inline-block";
      nextButton.textContent = step === 2 ? "Registrieren" : "Weiter";
    }
    if (finishButton) finishButton.style.display = "none";
    if (alternativeLinks) {
      alternativeLinks.style.display = step === 1 ? "block" : "none";
    }
  }

  updateProgressBar();
}

// Navigation Functions - Make them globally accessible
window.nextStep = function nextStep() {
  if (validateCurrentStep()) {
    if (currentStep === 2) {
      performRegistration(); // Registrierung starten
    } else if (currentStep < maxSteps) {
      currentStep++;
      showStep(currentStep);
    }
  }
}

window.previousStep = function previousStep() {
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
  const username = sanitizeInput(document.getElementById("username")?.value || "");
  let phone = sanitizeInput(document.getElementById("phone")?.value || "");
  const email = sanitizeEmail(document.getElementById("email")?.value || "");
  const socialMedia = sanitizeUrl(document.getElementById("social-media")?.value || "");
  const password = document.getElementById("password")?.value || "";
  const passwordConfirm = document.getElementById("password-confirm")?.value || "";
  const privacyConsent = document.getElementById("privacy-consent")?.checked || false;
  const agbConsent = document.getElementById("agb-consent")?.checked || false;
  const errorText = document.getElementById("error");
  
  if (errorText) errorText.textContent = "";

  if (!username || !phone || !email || !password || !passwordConfirm) {
    if (errorText) errorText.textContent = "Bitte füllen Sie alle Pflichtfelder aus.";
    return false;
  }
  if (!sanitizeEmail(email)) {
    if (errorText) errorText.textContent = "Bitte geben Sie eine gültige E-Mail ein.";
    return false;
  }
  if (password !== passwordConfirm) {
    if (errorText) errorText.textContent = "Die Passwörter stimmen nicht überein.";
    return false;
  }
  if (password.length < 8) {
    if (errorText) errorText.textContent = "Das Passwort muss mindestens 8 Zeichen lang sein.";
    return false;
  }
  if (!( /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password) )) {
    if (errorText) errorText.textContent = "Das Passwort muss Groß-, Kleinbuchstaben und Zahlen enthalten.";
    return false;
  }
  if (!privacyConsent) {
    if (errorText) errorText.textContent = "Sie müssen der Datenschutzerklärung zustimmen.";
    return false;
  }
  if (!agbConsent) {
    if (errorText) errorText.textContent = "Sie müssen den AGBs zustimmen.";
    return false;
  }
  if (!isValidPhoneNumber(phone)) {
    if (errorText) errorText.textContent = "Bitte geben Sie eine gültige Telefonnummer ein.";
    return false;
  }

  try {
    if (typeof libphonenumber !== 'undefined' && libphonenumber.parsePhoneNumberFromString) {
      const parsed = libphonenumber.parsePhoneNumberFromString(phone, "DE");
      if (parsed && parsed.isValid()) {
        phone = parsed.format("E.164");
      }
    }
  } catch (error) {
    if (errorText) errorText.textContent = "Fehler beim Formatieren der Telefonnummer.";
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
    const errorText = document.getElementById("error");
    if (errorText) {
      errorText.textContent = "Bitte wählen Sie mindestens eine Kontaktmöglichkeit aus.";
    }
    return false;
  }
  userData.contactMethods = Array.from(contactMethods).map((cb) => cb.value);
  return true;
}

// 📞 Kontaktoption wählen - Make globally accessible
window.selectContactOption = function selectContactOption(optionId) {
  const option = document.getElementById(optionId);
  if (!option) return;
  
  const container = option.parentElement;
  option.checked = !option.checked;
  if (container) {
    container.classList.toggle("selected", option.checked);
  }
}

// 📝 Registrierung bei Supabase
async function performRegistration() {
  // Ensure Supabase clients are available
  if (!client || !trackingClient) {
    const errorText = document.getElementById("error");
    if (errorText) {
      errorText.textContent = "Supabase ist nicht verfügbar. Bitte laden Sie die Seite neu.";
    }
    return;
  }

  const errorText = document.getElementById("error");
  if (errorText) errorText.textContent = "Registrierung läuft...";

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

    const confirmationEmail = document.getElementById("confirmation-email");
    if (confirmationEmail) {
      confirmationEmail.textContent = userData.email;
    }
    
    vibrateDevice();
    if (errorText) errorText.textContent = "";
    currentStep = 3;
    showStep(currentStep);
  } catch (error) {
    console.error("Registrierungsfehler:", error);
    if (errorText) {
      errorText.textContent =
        error.message.includes("already registered")
          ? "Diese E-Mail ist bereits registriert."
          : "Fehler: " + error.message;
    }
    await trackEvent("registration_error", {
      email: userData.email,
      error_message: error.message,
    });
  }
}

// 🔑 Passwort anzeigen/verstecken - Make globally accessible
window.togglePassword = function togglePassword(fieldId) {
  const field = document.getElementById(fieldId);
  if (!field) return;
  
  const button = field.parentNode?.querySelector(".password-toggle");
  if (!button) return;
  
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
    if (typeof libphonenumber !== 'undefined' && libphonenumber.parsePhoneNumberFromString) {
      const parsed = libphonenumber.parsePhoneNumberFromString(phoneNumber, countryCode);
      return parsed && parsed.isValid();
    } else {
      // Fallback validation
      const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
      return phoneRegex.test(phoneNumber.replace(/\s/g, ''));
    }
  } catch {
    return false;
  }
}

// Format phone number
function formatPhoneNumber(value) {
  try {
    if (!value || value.length < 3) return value;
    
    if (typeof libphonenumber !== 'undefined' && libphonenumber.parsePhoneNumberFromString) {
      const parsed = libphonenumber.parsePhoneNumberFromString(value, "DE");
      if (parsed && parsed.isValid()) {
        return parsed.formatNational();
      }
    }
  } catch {
    // Keep original value if formatting fails
  }
  return value;
}

// 📊 Tracking in Supabase
async function trackEvent(eventType, metadata = {}) {
  try {
    if (!trackingClient) {
      console.warn("Tracking client not available");
      return;
    }
    
    const { error } = await trackingClient
      .from("tracking_events")
      .insert({ event_type: eventType, metadata });
    if (error) {
      console.error("[Tracking] Supabase error:", error);
    } else {
      console.log("[Tracking Success]:", eventType, metadata);
    }
  } catch (err) {
    console.error("[Tracking] Unexpected error:", err);
  }
}

// 🚀 Init
document.addEventListener("DOMContentLoaded", async () => {
  console.log("DOM Content Loaded - Initializing registration");
  
  // Wait for Supabase clients to be available
  await waitForSupabase();
  
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

  // Form submit prevention
  const form = document.querySelector("form");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      nextStep();
    });
  }

  // Add enter key support
  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      const activeElement = document.activeElement;
      if (activeElement && activeElement.tagName !== "TEXTAREA") {
        e.preventDefault();
        nextStep();
      }
    }
  });

  showStep(1);
  
  console.log("Registration initialization complete");
});