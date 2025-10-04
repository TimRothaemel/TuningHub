// Initialize global variables FIRST
let currentStep = 1;
const maxSteps = 3;
let businessData = {};
let logoFile = null;
let isProcessing = false;

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
        showErrorMessage("Fehler beim Laden der Anwendung. Bitte laden Sie die Seite neu.");
        resolve(); // Resolve anyway to prevent hanging
      }
    }, 100);
  });
}

// Sanitize Functions
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

// Vibration
function vibrateDevice() {
  if ("vibrate" in navigator) {
    navigator.vibrate([200, 100, 400]);
  }
}

// Loading Overlay
function showLoading(show = true) {
  // Create loading overlay if it doesn't exist
  let overlay = document.getElementById("loadingOverlay");
  if (!overlay && show) {
    overlay = document.createElement("div");
    overlay.id = "loadingOverlay";
    overlay.className = "loading-overlay";
    overlay.innerHTML = "<div>Wird verarbeitet...</div>";
    document.body.appendChild(overlay);
  }
  
  if (overlay) {
    overlay.classList.toggle("show", show);
    overlay.style.display = show ? "flex" : "none";
  }
}

// Image Compression
async function compressImage(file, maxWidth = 400, maxHeight = 400, quality = 0.85) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = function (event) {
      const img = new Image();
      img.onload = function () {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        // Maintain aspect ratio
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.floor(width * ratio);
          height = Math.floor(height * ratio);
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");

        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            resolve(
              new File([blob], file.name, {
                type: "image/jpeg",
                lastModified: Date.now(),
              })
            );
          },
          "image/jpeg",
          quality
        );
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// Logo Preview Functions
function createLogoPreview(file) {
  const reader = new FileReader();
  reader.onload = function (e) {
    let previewContainer = document.getElementById("logoPreview");
    if (!previewContainer) {
      // Create preview container if it doesn't exist
      previewContainer = document.createElement("div");
      previewContainer.id = "logoPreview";
      previewContainer.className = "logo-preview-container";
      previewContainer.style.cssText = `
        margin-top: 10px;
        text-align: center;
        position: relative;
      `;
      
      const logoInput = document.getElementById("companyLogo");
      if (logoInput && logoInput.parentNode) {
        logoInput.parentNode.insertBefore(previewContainer, logoInput.nextSibling);
      }
    }
    previewContainer.innerHTML = `
      <div style="position: relative; display: inline-block;">
        <img src="${e.target.result}" alt="Logo Vorschau" style="
          width: 120px; 
          height: 120px; 
          object-fit: cover; 
          border: 2px solid #ddd; 
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        ">
        <button type="button" onclick="removeLogo()" style="
          position: absolute; 
          top: -8px; 
          right: -8px; 
          background: #ff4444; 
          color: white; 
          border: none; 
          border-radius: 50%; 
          width: 24px; 
          height: 24px; 
          cursor: pointer;
          font-size: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
        ">×</button>
        <div style="margin-top: 5px; font-size: 12px; color: #666;">
          ${(file.size / 1024).toFixed(1)} KB
        </div>
      </div>
    `;
  };
  reader.readAsDataURL(file);
}

// Make removeLogo globally accessible
window.removeLogo = function removeLogo() {
  logoFile = null;
  const logoInput = document.getElementById("companyLogo");
  const previewContainer = document.getElementById("logoPreview");
  
  if (logoInput) logoInput.value = "";
  if (previewContainer) previewContainer.innerHTML = "";
}

function handleLogoSelection(e) {
  const file = e.target.files?.[0];
  if (!file) {
    logoFile = null;
    return;
  }

  // Validate file size (max 5MB)
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    showErrorMessage("Das Logo ist zu groß (max. 5MB).");
    e.target.value = "";
    logoFile = null;
    return;
  }

  // Validate file type
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
  if (!allowedTypes.includes(file.type.toLowerCase())) {
    showErrorMessage("Nur Bilddateien (JPEG, PNG, GIF, WebP) sind für das Logo erlaubt.");
    e.target.value = "";
    logoFile = null;
    return;
  }

  logoFile = file;
  hideErrorMessage();
  createLogoPreview(file);
  
  console.log("Logo selected:", file.name, "Size:", (file.size / 1024).toFixed(1) + " KB");
}

// Progress Bar
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

// Show Step
function showStep(step) {
  console.log(`Showing step: ${step}`);
  
  // Hide all steps
  for (let i = 1; i <= maxSteps; i++) {
    const stepElement = document.getElementById(`step-${i}`);
    if (stepElement) {
      stepElement.classList.remove("active");
    }
  }
  
  // Show current step
  const currentStepElement = document.getElementById(`step-${step}`);
  if (currentStepElement) {
    currentStepElement.classList.add("active");
  }

  // Update buttons
  const prevButton = document.getElementById("prev-button");
  const nextButton = document.getElementById("next-button");
  const finishButton = document.getElementById("finish-button");

  if (prevButton) {
    prevButton.style.display = step > 1 ? "inline-block" : "none";
  }

  if (step === maxSteps) {
    if (nextButton) nextButton.style.display = "none";
    if (finishButton) finishButton.style.display = "inline-block";
  } else {
    if (nextButton) {
      nextButton.style.display = "inline-block";
      nextButton.textContent = step === 2 ? "Registrieren" : "Weiter";
    }
    if (finishButton) finishButton.style.display = "none";
  }

  updateProgressBar();
}

// Navigation Functions - Make them globally accessible
window.nextStep = function nextStep() {
  console.log(`Next step called, current step: ${currentStep}`);
  
  if (validateCurrentStep()) {
    if (currentStep === 2) {
      performBusinessRegistration();
    } else if (currentStep < maxSteps) {
      currentStep++;
      showStep(currentStep);
    }
  }
}

window.previousStep = function previousStep() {
  console.log(`Previous step called, current step: ${currentStep}`);
  
  if (currentStep > 1) {
    currentStep--;
    showStep(currentStep);
  }
}

// Finish Registration - Make globally accessible
window.finishBusinessRegistration = function finishBusinessRegistration() {
  console.log("Finishing business registration...");
  vibrateDevice();
  
  trackEvent("business_registration_completed", {
    email: businessData.email,
    companyName: businessData.companyName,
  });
  
  setTimeout(() => {
    window.location.href = "login.html";
  }, 1000);
}

// Error/Success Messages
function showErrorMessage(message) {
  hideErrorMessage();
  const errorText = document.getElementById("error-message");
  if (errorText) {
    errorText.textContent = message;
    errorText.style.color = "#d32f2f";
    errorText.style.display = "block";
  }
}

function hideErrorMessage() {
  const errorText = document.getElementById("error-message");
  if (errorText) {
    errorText.style.display = "none";
    errorText.textContent = "";
  }
}

// Validation
function validateCurrentStep() {
  if (currentStep === 1) return validateStep1();
  if (currentStep === 2) return validateStep2();
  return true;
}

function validateStep1() {
  const fullName = sanitizeInput(document.getElementById("fullName")?.value || "");
  let phone = sanitizeInput(document.getElementById("phone")?.value || "");
  const email = sanitizeEmail(document.getElementById("email")?.value || "");
  const password = document.getElementById("password")?.value || "";
  const passwordConfirm = document.getElementById("password-confirm")?.value || "";

  if (!fullName || !phone || !email || !password || !passwordConfirm) {
    showErrorMessage("Bitte füllen Sie alle Pflichtfelder aus.");
    return false;
  }
  
  if (!sanitizeEmail(email)) {
    showErrorMessage("Bitte geben Sie eine gültige E-Mail ein.");
    return false;
  }
  
  if (password !== passwordConfirm) {
    showErrorMessage("Die Passwörter stimmen nicht überein.");
    return false;
  }
  
  if (password.length < 8) {
    showErrorMessage("Das Passwort muss mindestens 8 Zeichen lang sein.");
    return false;
  }
  
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) {
    showErrorMessage("Das Passwort muss Groß-, Kleinbuchstaben und Zahlen enthalten.");
    return false;
  }
  
  if (!isValidPhoneNumber(phone)) {
    showErrorMessage("Bitte geben Sie eine gültige Telefonnummer ein.");
    return false;
  }

  // Format phone number
  try {
    if (typeof libphonenumber !== 'undefined' && libphonenumber.parsePhoneNumberFromString) {
      const parsed = libphonenumber.parsePhoneNumberFromString(phone, "DE");
      if (parsed && parsed.isValid()) {
        phone = parsed.format("E.164");
      }
    }
  } catch (error) {
    console.warn("Phone formatting failed:", error);
  }

  businessData = {
    fullName,
    phone,
    email,
    password,
  };
  
  console.log("Step 1 validation successful", businessData);
  hideErrorMessage();
  return true;
}

function validateStep2() {
  const companyName = sanitizeInput(document.getElementById("companyName")?.value || "");
  const companyDescription = sanitizeInput(document.getElementById("companyDescription")?.value || "");
  const contactLink = sanitizeUrl(document.getElementById("contactLink")?.value || "");
  const privacyConsent = document.getElementById("privacy-consent")?.checked || false;
  const agbConsent = document.getElementById("agb-consent")?.checked || false;

  // Validierung: Firmenname und Beschreibung sind Pflichtfelder
  if (!companyName || !companyDescription) {
    showErrorMessage("Bitte füllen Sie Firmenname und Beschreibung aus.");
    return false;
  }
  
  // Validierung: Datenschutzerklärung muss akzeptiert werden
  if (!privacyConsent) {
    showErrorMessage("Sie müssen der Datenschutzerklärung zustimmen.");
    return false;
  }
  
  // Validierung: AGB muss akzeptiert werden
  if (!agbConsent) {
    showErrorMessage("Sie müssen den AGBs zustimmen.");
    return false;
  }

  // Alle Daten speichern
  businessData = {
    ...businessData,
    companyName,
    companyDescription,
    contactLink: contactLink || "", // Leerer String wenn nicht ausgefüllt
    privacyConsent,
    agbConsent,
  };
  
  console.log("Step 2 validation successful", businessData);
  hideErrorMessage();
  return true;
}

// Phone validation
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

// Password toggle
function togglePassword(fieldId) {
  const field = document.getElementById(fieldId);
  const button = field?.parentNode?.querySelector(".password-toggle");
  
  if (field && button) {
    if (field.type === "password") {
      field.type = "text";
      button.textContent = "🙈";
    } else {
      field.type = "password";
      button.textContent = "👁️";
    }
  }
}

// Business Registration - NUR USER METADATA (keine profiles Tabelle)
async function performBusinessRegistration() {
  if (isProcessing) {
    console.log("Registration already in progress...");
    return;
  }

  // Ensure Supabase is available
  if (!client) {
    showErrorMessage("Supabase ist nicht verfügbar. Bitte laden Sie die Seite neu.");
    return;
  }

  try {
    isProcessing = true;
    showLoading(true);
    showErrorMessage("Business Registrierung läuft...");
    
    console.log("Starting business registration...", businessData);
    
    await trackEvent("business_registration_attempt", {
      email: businessData.email,
      companyName: businessData.companyName,
    });

    let logoUrl = null;
    
    // Upload logo if provided
    if (logoFile) {
      console.log("Compressing and uploading logo...");
      
      try {
        const compressedLogo = await compressImage(logoFile);
        console.log("Logo compressed:", {
          originalSize: logoFile.size,
          compressedSize: compressedLogo.size,
          reduction: `${Math.round((1 - compressedLogo.size / logoFile.size) * 100)}%`,
        });

        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 8);
        const fileName = `business_logo_${timestamp}_${randomString}.jpg`;

        // Upload logo
        const { data: uploadData, error: uploadError } = await client.storage
          .from("business-logos")
          .upload(`public/${fileName}`, compressedLogo, {
            cacheControl: "3600",
            upsert: false,
            contentType: "image/jpeg",
          });

        if (uploadError) {
          console.error("Logo upload error:", uploadError);
          throw new Error(`Logo Upload Fehler: ${uploadError.message}`);
        }

        logoUrl = `https://yvdptnkmgfxkrszitweo.supabase.co/storage/v1/object/public/business-logos/${uploadData.path}`;
        console.log("Logo uploaded successfully:", logoUrl);
        
      } catch (logoError) {
        console.error("Logo processing error:", logoError);
        throw new Error(`Logo-Verarbeitung fehlgeschlagen: ${logoError.message}`);
      }
    }

    // Register user - ALLE Daten in user_metadata
    const { data: signupData, error: signupError } = await client.auth.signUp({
      email: businessData.email,
      password: businessData.password,
      options: {
        data: {
          full_name: businessData.fullName,
          phone: businessData.phone,
          email: businessData.email,
          company_name: businessData.companyName,
          description: businessData.companyDescription,
          contact_link: businessData.contactLink || "",
          logo_url: logoUrl || "",
          account_type: "business",
          privacy_consent: businessData.privacyConsent,
          privacy_consent_date: new Date().toISOString(),
          agb_consent: businessData.agbConsent,
          agb_consent_date: new Date().toISOString(),
        },
        emailRedirectTo: window.location.origin + '/html/confirmemail.html',
      },
    });

    if (signupError) {
      console.error("Supabase signup error:", signupError);
      
      // Cleanup uploaded logo if signup failed
      if (logoUrl) {
        try {
          const fileName = logoUrl.split('/').pop();
          await client.storage.from("business-logos").remove([`public/${fileName}`]);
        } catch (cleanupError) {
          console.error("Logo cleanup error:", cleanupError);
        }
      }
      
      throw signupError;
    }

    console.log("Registration successful:", signupData);

    await trackEvent("business_registration_success", {
      email: businessData.email,
      companyName: businessData.companyName,
      phone: businessData.phone,
      user_id: signupData.user?.id,
      has_logo: !!logoUrl,
      logo_url: logoUrl,
      agb_consent: businessData.agbConsent,
    });

    const confirmationEmail = document.getElementById("confirmation-email");
    if (confirmationEmail) {
      confirmationEmail.textContent = businessData.email;
    }
    
    vibrateDevice();
    hideErrorMessage();
    currentStep = 3;
    showStep(currentStep);
    
  } catch (error) {
    console.error("Business Registration Error:", error);
    
    await trackEvent("business_registration_error", {
      email: businessData.email,
      error_message: error.message,
      error_details: error.toString(),
    });

    // Bessere Fehlermeldungen
    if (error.message.includes("already registered") || error.message.includes("User already registered")) {
      showErrorMessage("Diese E-Mail-Adresse ist bereits registriert.");
    } else if (error.message.includes("Invalid login credentials")) {
      showErrorMessage("Ungültige Anmeldedaten.");
    } else if (error.message.includes("Email not confirmed")) {
      showErrorMessage("Bitte bestätigen Sie zuerst Ihre E-Mail-Adresse.");
    } else if (error.message.includes("profiles")) {
      showErrorMessage("Datenbankfehler: Bitte kontaktieren Sie den Support.");
    } else {
      showErrorMessage("Registrierung fehlgeschlagen: " + error.message);
    }
  } finally {
    isProcessing = false;
    showLoading(false);
  }
}

// Tracking
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
      console.error("[Tracking Error]:", error);
    } else {
      console.log("[Tracking Success]:", eventType, metadata);
    }
  } catch (err) {
    console.error("[Tracking Unexpected]:", err);
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

// DOM Content Loaded Event
document.addEventListener("DOMContentLoaded", async () => {
  console.log("DOM Content Loaded - Initializing business registration");
  
  // Wait for Supabase to be available
  await waitForSupabase();
  
  // Phone input formatting
  const phoneInput = document.getElementById("phone");
  if (phoneInput) {
    phoneInput.addEventListener("input", (e) => {
      let value = sanitizeInput(e.target.value);
      const formatted = formatPhoneNumber(value);
      if (formatted && formatted !== value) {
        e.target.value = formatted;
      }
    });
  }

  // Input sanitization on blur
  const textInputs = document.querySelectorAll(
    'input[type="text"], input[type="email"], input[type="tel"], input[type="url"], textarea'
  );
  
  textInputs.forEach((input) => {
    input.addEventListener("blur", function () {
      if (this.type === "email") {
        this.value = sanitizeEmail(this.value);
      } else if (this.type === "url") {
        this.value = sanitizeUrl(this.value);
      } else {
        this.value = sanitizeInput(this.value);
      }
    });
  });

  // Logo upload handling
  const logoInput = document.getElementById("companyLogo");
  if (logoInput) {
    logoInput.addEventListener("change", handleLogoSelection);
  }

  // Initialize first step
  showStep(1);

  // Form submit prevention
  const form = document.getElementById("register-business-form");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      console.log("Form submit prevented, calling nextStep()");
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
  
  // Add loading overlay styles if not present
  if (!document.getElementById("loadingOverlay")) {
    const style = document.createElement("style");
    style.textContent = `
      .loading-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.7);
        color: white;
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 9999;
        font-size: 18px;
        font-weight: bold;
      }
      .loading-overlay.show {
        display: flex !important;
      }
    `;
    document.head.appendChild(style);
  }
  
  console.log("Business registration initialization complete");
});