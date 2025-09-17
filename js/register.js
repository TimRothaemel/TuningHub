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

// Sichere Eingabe-Validierung
function sanitizeInput(input) {
  if (typeof input !== 'string') return '';
  return input.trim()
    .replace(/[<>]/g, '') // HTML-Tags entfernen
    .replace(/javascript:/gi, '') // JavaScript-URLs entfernen
    .replace(/on\w+=/gi, '') // Event-Handler entfernen
    .substring(0, 500); // Längenbegrenzung
}

function sanitizeEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const sanitized = sanitizeInput(email);
  return emailRegex.test(sanitized) ? sanitized : '';
}

function sanitizeUrl(url) {
  if (!url || url.trim() === '') return '';
  const sanitized = sanitizeInput(url);
  try {
    const urlObj = new URL(sanitized);
    // Nur HTTP/HTTPS URLs erlauben
    if (urlObj.protocol === 'http:' || urlObj.protocol === 'https:') {
      return urlObj.toString();
    }
  } catch (e) {
    return '';
  }
  return '';
}

// Handy-Vibration
function vibrateDevice() {
  if ('vibrate' in navigator) {
    // Erfolgs-Vibrationsmuster: kurz-lang-kurz
    navigator.vibrate([200, 100, 400]);
  }
}

// Fertig-Button Funktion
function finishRegistration() {
  vibrateDevice();
  // Tracking für abgeschlossene Registrierung
  trackEvent("registration_completed", {
    email: userData.email,
    username: userData.username
  });
  
  setTimeout(() => {
    window.location.href = "login.html";
  }, 1000);
}

// Schritt-Navigation
function updateProgressBar() {
  const progressLine = document.getElementById('progress-line');
  const width = ((currentStep - 1) / (maxSteps - 1)) * 100;
  progressLine.style.width = width + '%';

  for (let i = 1; i <= maxSteps; i++) {
    const circle = document.getElementById(`step-circle-${i}`);
    const title = document.getElementById(`step-title-${i}`);
    
    circle.classList.remove('active', 'completed');
    title.classList.remove('active', 'completed');
    
    if (i < currentStep) {
      circle.classList.add('completed');
      title.classList.add('completed');
    } else if (i === currentStep) {
      circle.classList.add('active');
      title.classList.add('active');
    }
  }
}

function showStep(step) {
  // Alle Schritte verstecken
  for (let i = 1; i <= maxSteps; i++) {
    document.getElementById(`step-${i}`).classList.remove('active');
  }
  
  // Aktuellen Schritt anzeigen
  document.getElementById(`step-${step}`).classList.add('active');
  
  // Navigation Buttons aktualisieren
  const prevButton = document.getElementById('prev-button');
  const nextButton = document.getElementById('next-button');
  const stepNav = document.getElementById('step-nav');
  const alternativeLinks = document.getElementById('alternative-links');
  const finishButton = document.getElementById('finish-button');
  
  prevButton.style.display = step > 1 ? 'inline-block' : 'none';
  
  if (step === maxSteps) {
    stepNav.style.display = 'none';
    alternativeLinks.style.display = 'none';
    if (finishButton) {
      finishButton.style.display = 'block';
    }
  } else {
    stepNav.style.display = 'flex';
    alternativeLinks.style.display = step === 1 ? 'block' : 'none';
    if (finishButton) {
      finishButton.style.display = 'none';
    }
  }
  
  if (step === 2) {
    nextButton.textContent = 'Registrieren';
  } else {
    nextButton.textContent = 'Weiter';
  }
  
  updateProgressBar();
}

function nextStep() {
  if (validateCurrentStep()) {
    if (currentStep === 2) {
      // Registrierung durchführen
      performRegistration();
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

function validateCurrentStep() {
  const errorText = document.getElementById("error");
  errorText.textContent = "";

  if (currentStep === 1) {
    return validateStep1();
  } else if (currentStep === 2) {
    return validateStep2();
  }
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
  const errorText = document.getElementById("error");

  if (!username || !phone || !email || !password || !passwordConfirm) {
    errorText.style.color = "red";
    errorText.textContent = "Bitte füllen Sie alle Pflichtfelder aus.";
    return false;
  }

  if (email && !sanitizeEmail(email)) {
    errorText.style.color = "red";
    errorText.textContent = "Bitte geben Sie eine gültige E-Mail-Adresse ein.";
    return false;
  }

  if (password !== passwordConfirm) {
    errorText.style.color = "red";
    errorText.textContent = "Die Passwörter stimmen nicht überein.";
    return false;
  }

  if (password.length < 8) {
    errorText.style.color = "red";
    errorText.textContent = "Das Passwort muss mindestens 8 Zeichen lang sein.";
    return false;
  }

  // Passwort-Stärke prüfen
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);

  if (!(hasUpperCase && hasLowerCase && hasNumbers)) {
    errorText.style.color = "red";
    errorText.textContent = "Das Passwort muss Groß-, Kleinbuchstaben und Zahlen enthalten.";
    return false;
  }

  if (!privacyConsent) {
    errorText.style.color = "red";
    errorText.textContent = "Sie müssen der Datenschutzerklärung zustimmen.";
    return false;
  }

  if (!isValidPhoneNumber(phone)) {
    errorText.style.color = "red";
    errorText.textContent = "Bitte geben Sie eine gültige Telefonnummer ein.";
    return false;
  }

  // Daten speichern
  try {
    const parsed = libphonenumber.parsePhoneNumberFromString(phone, 'DE');
    phone = parsed.format('E.164');
  } catch (error) {
    console.error('Phone formatting error:', error);
    errorText.style.color = "red";
    errorText.textContent = "Fehler beim Formatieren der Telefonnummer.";
    return false;
  }

  userData = {
    username,
    phone,
    email,
    password,
    socialMedia,
    privacyConsent
  };

  return true;
}

function validateStep2() {
  const contactMethods = document.querySelectorAll('input[name="contact-method"]:checked');
  const errorText = document.getElementById("error");
  
  if (contactMethods.length === 0) {
    errorText.style.color = "red";
    errorText.textContent = "Bitte wählen Sie mindestens eine Kontaktmöglichkeit aus.";
    return false;
  }

  // Gewählte Kontaktmethoden speichern
  userData.contactMethods = Array.from(contactMethods).map(cb => cb.value);
  return true;
}

// Kontaktoption auswählen
function selectContactOption(optionId) {
  const option = document.getElementById(optionId);
  const container = option.parentElement;
  
  option.checked = !option.checked;
  
  if (option.checked) {
    container.classList.add('selected');
  } else {
    container.classList.remove('selected');
  }
}

// Registrierung durchführen
async function performRegistration() {
  const errorText = document.getElementById("error");
  errorText.style.color = "black";
  errorText.textContent = "Registrierung läuft...";

  try {
    await trackEvent("registration_attempt", {
      email: userData.email,
      contact_methods: userData.contactMethods
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
          // JSON-Daten für Supabase
          preferences: {
            contact_methods: userData.contactMethods,
            social_media: userData.socialMedia || null
          }
        },
      },
    });

    if (signupError) {
      throw signupError;
    }

    await trackEvent("registration_success", {
      email: userData.email,
      username: userData.username,
      phone: userData.phone,
      user_id: signupData.user?.id,
      preferences: {
        contact_methods: userData.contactMethods,
        social_media: userData.socialMedia || null
      },
      privacy_consent: true,
    });

    // E-Mail in Bestätigungsschritt anzeigen
    document.getElementById("confirmation-email").textContent = userData.email;
    
    // Erfolgs-Vibration
    vibrateDevice();
    
    errorText.textContent = "";
    currentStep = 3;
    showStep(currentStep);

  } catch (error) {
    console.error("Registrierungsfehler:", error);

    await trackEvent("registration_error", {
      email: userData.email,
      error_message: error.message,
      error_code: error.status || "unknown",
    });

    errorText.style.color = "red";
    
    if (error.message.includes('already registered')) {
      errorText.textContent = "Diese E-Mail-Adresse ist bereits registriert.";
    } else if (error.message.includes('invalid email')) {
      errorText.textContent = "Bitte geben Sie eine gültige E-Mail-Adresse ein.";
    } else if (error.message.includes('weak password')) {
      errorText.textContent = "Das Passwort ist zu schwach. Verwenden Sie mindestens 8 Zeichen mit Groß-, Kleinbuchstaben und Zahlen.";
    } else {
      errorText.textContent = "Fehler: " + error.message;
    }
  }
}

// Passwort-Anzeige umschalten
function togglePassword(fieldId) {
  const field = document.getElementById(fieldId);
  const button = field.parentNode.querySelector('.password-toggle');
  
  if (field.type === 'password') {
    field.type = 'text';
    button.textContent = '🙈';
  } else {
    field.type = 'password';
    button.textContent = '👁️';
  }
}

// Telefonnummer Funktionen
function formatPhoneNumber(phoneNumber, countryCode = 'DE') {
  try {
    const parsed = libphonenumber.parsePhoneNumberFromString(phoneNumber, countryCode);
    if (parsed && parsed.isValid()) {
      return parsed.formatInternational();
    }
    return null;
  } catch (error) {
    console.error('Phone number parsing error:', error);
    return null;
  }
}

function isValidPhoneNumber(phoneNumber, countryCode = 'DE') {
  try {
    const parsed = libphonenumber.parsePhoneNumberFromString(phoneNumber, countryCode);
    return parsed && parsed.isValid();
  } catch (error) {
    return false;
  }
}

// Tracking Funktion
async function trackEvent(eventType, metadata = {}) {
  try {
    const { data, error } = await trackingClient
      .from("tracking_events")
      .insert({
        event_type: eventType,
        metadata: metadata,
      });

    if (error) {
      console.error("[Tracking] Supabase error:", error);
    } else {
      console.log("[Tracking] Event successfully tracked:", eventType);
    }
  } catch (err) {
    console.error("[Tracking] Unexpected error:", err);
  }
}

// Event Listeners
const phoneInput = document.getElementById("phone");
phoneInput.addEventListener('input', function(e) {
  let value = sanitizeInput(e.target.value);
  if (value.length > 0) {
    const formatted = formatPhoneNumber(value);
    if (formatted && formatted !== value) {
      e.target.value = formatted;
    }
  }
});

// Sichere Input-Behandlung für alle Textfelder
document.addEventListener('DOMContentLoaded', function() {
  const textInputs = document.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"], input[type="url"]');
  
  textInputs.forEach(input => {
    input.addEventListener('blur', function() {
      if (this.type === 'email') {
        this.value = sanitizeEmail(this.value);
      } else if (this.type === 'url') {
        this.value = sanitizeUrl(this.value);
      } else {
        this.value = sanitizeInput(this.value);
      }
    });
    
    // Echtzeitlängenbegrenzung
    input.addEventListener('input', function() {
      if (this.value.length > 500) {
        this.value = this.value.substring(0, 500);
      }
    });
  });

  showStep(1);
});