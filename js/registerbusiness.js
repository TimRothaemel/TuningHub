// Supabase Verbindungen
const trackingUrl = "https://lhxcnrogjjskgaclqxtm.supabase.co";
const trackingKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxoeGNucm9nampza2dhY2xxeHRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1MjU0MzUsImV4cCI6MjA2ODEwMTQzNX0.vOr_Esi9IIesFixkkvYQjYEqghrKCMeqbrPKW27zqww";

const supabaseUrl = "https://yvdptnkmgfxkrszitweo.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2ZHB0bmttZ2Z4a3Jzeml0d2VvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3MDAwMzQsImV4cCI6MjA2NjI3NjAzNH0.Kd6D6IQ_stUMrcbm2TN-7ACjFJvXNmkeNehQHavTmJo";

const trackingClient = supabase.createClient(trackingUrl, trackingKey);
const client = supabase.createClient(supabaseUrl, supabaseKey);

// State
let currentStep = 1;
const maxSteps = 3;
let businessData = {};

// Sanitize Functions
function sanitizeInput(input) {
  if (typeof input !== "string") return "";
  return input
    .trim()
    .replace(/[<>]/g, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+=/gi, "")
    .substring(0, 500);
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
  } catch (e) {
    return "";
  }
  return "";
}

// Vibrationsfeedback
function vibrateDevice() {
  if ("vibrate" in navigator) {
    navigator.vibrate([200, 100, 400]);
  }
}

// Registrierung Business
async function performBusinessRegistration() {
  const errorText = document.getElementById("error");
  errorText.style.color = "black";
  errorText.textContent = "Business Registrierung läuft...";

  try {
    await trackEvent("business_registration_attempt", {
      email: businessData.email,
      companyName: businessData.companyName,
    });

    const { data: signupData, error: signupError } = await client.auth.signUp({
      email: businessData.email,
      password: businessData.password,
      options: {
        data: {
          full_name: businessData.fullName,
          phone: businessData.phone,
          company_name: businessData.companyName,
          contact_link: businessData.contactLink,
          description: businessData.description,
          privacy_consent: businessData.privacyConsent,
          privacy_consent_date: new Date().toISOString(),
          agb_consent: businessData.agbConsent,
          agb_consent_date: new Date().toISOString(),
        },
      },
    });

    if (signupError) throw signupError;

    await trackEvent("business_registration_success", {
      email: businessData.email,
      companyName: businessData.companyName,
      phone: businessData.phone,
      user_id: signupData.user?.id,
      agb_consent: businessData.agbConsent,
    });

    // Erfolgsfeedback
    vibrateDevice();
    errorText.textContent = "";
    currentStep = 3;
    showStep(currentStep);
  } catch (error) {
    console.error("Business Registrierungsfehler:", error);
    await trackEvent("business_registration_error", {
      email: businessData.email,
      error_message: error.message,
    });

    errorText.style.color = "red";
    if (error.message.includes("already registered")) {
      errorText.textContent = "Diese E-Mail-Adresse ist bereits registriert.";
    } else {
      errorText.textContent = "Fehler: " + error.message;
    }
  }
}

// Schritte (Navigation)
function showStep(step) {
  for (let i = 1; i <= maxSteps; i++) {
    document.getElementById(`step-${i}`).classList.remove("active");
  }
  document.getElementById(`step-${step}`).classList.add("active");
}

// Tracking Funktion
async function trackEvent(eventType, metadata = {}) {
  try {
    const { error } = await trackingClient
      .from("tracking_events")
      .insert({ event_type: eventType, metadata });
    if (error) console.error("[Tracking Error]:", error);
  } catch (err) {
    console.error("[Tracking Unexpected]:", err);
  }
}

// Event Listener (Beispiel für Formular)
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("register-business-form");
  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const fullName = sanitizeInput(document.getElementById("fullName").value);
    const phone = sanitizeInput(document.getElementById("phone").value);
    const email = sanitizeEmail(document.getElementById("email").value);
    const password = document.getElementById("password").value;
    const companyName = sanitizeInput(document.getElementById("companyName").value);
    const contactLink = sanitizeUrl(document.getElementById("contactLink").value);
    const description = sanitizeInput(document.getElementById("companyDescription").value);

    const privacyConsent = document.getElementById("privacy-consent").checked;
    const agbConsent = document.getElementById("agb-consent").checked;

    if (!privacyConsent || !agbConsent) {
      document.getElementById("error").textContent =
        "Bitte stimmen Sie AGB und Datenschutzerklärung zu.";
      return;
    }

    businessData = {
      fullName,
      phone,
      email,
      password,
      companyName,
      contactLink,
      description,
      privacyConsent,
      agbConsent,
    };

    performBusinessRegistration();
  });
});