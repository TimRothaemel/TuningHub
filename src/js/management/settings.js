let supabase = null;
let trackingClient = null;
let currentUser = null;
let isInitialized = false;
let currentEditType = null;

function getSupabaseClients() {
  if (window.supabase && window.trackingSupabase) {
    supabase = window.supabase;
    trackingClient = window.trackingSupabase;
    return true;
  }
  return false;
}

function waitForSupabase() {
  return new Promise((resolve) => {
    if (getSupabaseClients()) {
      resolve();
      return;
    }

    let attempts = 0;
    const maxAttempts = 50;
    const interval = setInterval(() => {
      attempts++;
      if (getSupabaseClients()) {
        clearInterval(interval);
        resolve();
      } else if (attempts >= maxAttempts) {
        clearInterval(interval);
        showError("Fehler beim Laden der Anwendung. Bitte laden Sie die Seite neu.");
        resolve();
      }
    }, 100);
  });
}

async function trackEvent(eventType, metadata = {}) {
  try {
    if (!trackingClient) return;
    await trackingClient.from("tracking_events").insert({
      event_type: eventType,
      metadata: metadata,
      user_id: currentUser?.id || "unknown",
    });
  } catch (err) {
    console.error("[Tracking] Error:", err);
  }
}

function showError(message) {
  const loadingState = document.getElementById("loadingState");
  if (loadingState) {
    loadingState.innerHTML = `<div class="error-state">${message}</div>`;
  }
}

function formatPhoneForDisplay(phone) {
  if (!phone) return null;
  if (phone.startsWith("+49")) {
    return "0" + phone.substring(3);
  }
  return phone;
}

function formatPhoneForStorage(phone) {
  if (!phone) return null;
  phone = phone.replace(/\s+/g, "").replace(/[-\/]/g, "");
  if (phone.startsWith("01")) {
    phone = "+49" + phone.substring(1);
  } else if (phone.startsWith("49")) {
    phone = "+" + phone;
  } else if (phone.startsWith("0049")) {
    phone = "+" + phone.substring(2);
  } else if (!phone.startsWith("+")) {
    phone = "+49" + phone;
  }
  return phone;
}

async function initializeSupabase() {
  try {
    if (!supabase || !trackingClient) {
      showError("Supabase-Clients nicht verfügbar. Bitte Seite neu laden.");
      return false;
    }

    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;

    if (!session) {
      window.location.href = "login.html";
      return false;
    }

    isInitialized = true;
    return true;
  } catch (error) {
    console.error("Initialisierungsfehler:", error);
    showError(`Systemfehler: ${error.message}`);
    return false;
  }
}

async function loadUser() {
  if (!isInitialized) {
    showError("System nicht bereit. Bitte neu laden.");
    return;
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      window.location.href = "login.html";
      return;
    }

    currentUser = user;
    
    // Load complete profile data from profiles table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Fehler beim Laden der Profildaten:', profileError);
      showError('Profildaten konnten nicht geladen werden.');
      return;
    }

    console.log('Loaded profile data:', profile);

    // Update UI
    document.getElementById("loadingState").style.display = "none";
    document.getElementById("settingsContent").style.display = "block";

    // Update Avatar with Initials
    const username = profile.username || user.email;
    const initials = getInitials(username);
    document.getElementById("userAvatar").textContent = initials;

    // Update basic profile fields from profiles table
    const usernameEl = document.getElementById("displayUsername");
    if (profile.username) {
      usernameEl.textContent = profile.username;
      usernameEl.classList.remove("setting-placeholder");
    }

    const phoneEl = document.getElementById("displayPhone");
    if (profile.phone) {
      phoneEl.textContent = formatPhoneForDisplay(profile.phone);
      phoneEl.classList.remove("setting-placeholder");
    }

    // Update social media and contact methods
    updateSocialMediaDisplay(profile.social_media);
    updateContactMethodsDisplay(profile.contact_methods);

  } catch (error) {
    console.error("Unerwarteter Fehler:", error);
    showError(`Fehler: ${error.message}`);
  }
}

function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+|@/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

// Social Media Display Functions
function updateSocialMediaDisplay(socialMedia) {
  console.log('updateSocialMediaDisplay called with:', socialMedia);
  const displayEl = document.getElementById("displaySocialMedia");
  
  if (!displayEl) {
    console.error('displaySocialMedia element not found!');
    return;
  }
  
  if (!socialMedia || Object.keys(socialMedia).length === 0) {
    displayEl.innerHTML = '<span class="setting-placeholder">Nicht verknüpft</span>';
    return;
  }

  const platforms = Object.keys(socialMedia).filter(platform => socialMedia[platform]);
  if (platforms.length === 0) {
    displayEl.innerHTML = '<span class="setting-placeholder">Nicht verknüpft</span>';
    return;
  }

  displayEl.textContent = `${platforms.length} Plattform${platforms.length !== 1 ? 'en' : ''} verknüpft`;
  displayEl.classList.remove("setting-placeholder");
}

function updateContactMethodsDisplay(contactMethods) {
  console.log('updateContactMethodsDisplay called with:', contactMethods);
  const displayEl = document.getElementById("displayContactMethods");
  
  if (!displayEl) {
    console.error('displayContactMethods element not found!');
    return;
  }
  
  if (!contactMethods || !Array.isArray(contactMethods) || contactMethods.length === 0) {
    displayEl.innerHTML = '<span class="setting-placeholder">Nicht festgelegt</span>';
    return;
  }

  const activeMethods = contactMethods.filter(method => method && method.active);
  if (activeMethods.length === 0) {
    displayEl.innerHTML = '<span class="setting-placeholder">Nicht festgelegt</span>';
    return;
  }

  displayEl.textContent = `${activeMethods.length} Methode${activeMethods.length !== 1 ? 'n' : ''} aktiviert`;
  displayEl.classList.remove("setting-placeholder");
}

function openEditModal(type) {
  currentEditType = type;
  const modal = document.getElementById("editModal");
  const modalTitle = document.getElementById("modalTitle");
  const inputLabel = document.getElementById("inputLabel");
  const modalInput = document.getElementById("modalInput");

  // Reset modal input visibility
  modalInput.style.display = 'block';
  modalInput.type = 'text';

  switch (type) {
    case "username":
      modalTitle.textContent = "Benutzername ändern";
      inputLabel.textContent = "Neuer Benutzername";
      modalInput.type = "text";
      modalInput.placeholder = "Benutzername eingeben";
      modalInput.value = "";
      break;
    case "phone":
      modalTitle.textContent = "Telefonnummer ändern";
      inputLabel.textContent = "Neue Telefonnummer";
      modalInput.type = "tel";
      modalInput.placeholder = "z.B. 01721234567";
      modalInput.value = "";
      break;
    case "email":
      modalTitle.textContent = "E-Mail ändern";
      inputLabel.textContent = "Neue E-Mail-Adresse";
      modalInput.type = "email";
      modalInput.placeholder = "neue@email.de";
      modalInput.value = "";
      break;
    case "password":
      modalTitle.textContent = "Passwort ändern";
      inputLabel.textContent = "Neues Passwort";
      modalInput.type = "password";
      modalInput.placeholder = "Mindestens 6 Zeichen";
      modalInput.value = "";
      break;
    case "social_media":
      modalTitle.textContent = "Social Media verwalten";
      inputLabel.textContent = "Social Media Profile";
      modalInput.style.display = 'none';
      openSocialMediaModal();
      return;
    case "contact_methods":
      modalTitle.textContent = "Kontaktmethoden verwalten";
      inputLabel.textContent = "Bevorzugte Kontaktwege";
      modalInput.style.display = 'none';
      openContactMethodsModal();
      return;
  }

  modal.classList.add("active");
}

function closeEditModal() {
  document.getElementById("editModal").classList.remove("active");
  currentEditType = null;
}

function showSuccess(title, message) {
  document.getElementById("successTitle").textContent = title;
  document.getElementById("successMessage").textContent = message;
  document.getElementById("successModal").classList.add("active");
}

function closeSuccessModal() {
  document.getElementById("successModal").classList.remove("active");
}

// Social Media Modal Functions
function openSocialMediaModal() {
  const modal = document.getElementById("editModal");
  const modalBody = document.querySelector(".modal-body");
  
  modalBody.innerHTML = `
    <div class="form-group">
      <label class="form-label">Social Media Links</label>
      <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 16px;">
        Geben Sie den vollständigen Link zu Ihrem Profil ein. Leer lassen wenn nicht vorhanden.
      </p>
      <div class="social-media-list">
        <div class="platform-input-item">
          <label class="platform-label">📸 Instagram</label>
          <input type="url" id="instagram-input" class="form-input" placeholder="https://instagram.com/benutzername">
        </div>
        <div class="platform-input-item">
          <label class="platform-label">👥 Facebook</label>
          <input type="url" id="facebook-input" class="form-input" placeholder="https://facebook.com/benutzername">
        </div>
        <div class="platform-input-item">
          <label class="platform-label">🐦 Twitter/X</label>
          <input type="url" id="twitter-input" class="form-input" placeholder="https://twitter.com/benutzername">
        </div>
        <div class="platform-input-item">
          <label class="platform-label">▶️ YouTube</label>
          <input type="url" id="youtube-input" class="form-input" placeholder="https://youtube.com/@kanalname">
        </div>
        <div class="platform-input-item">
          <label class="platform-label">🎵 TikTok</label>
          <input type="url" id="tiktok-input" class="form-input" placeholder="https://tiktok.com/@benutzername">
        </div>
        <div class="platform-input-item">
          <label class="platform-label">💼 LinkedIn</label>
          <input type="url" id="linkedin-input" class="form-input" placeholder="https://linkedin.com/in/profilname">
        </div>
      </div>
    </div>
  `;

  setTimeout(() => {
    loadSocialMediaData();
  }, 100);

  modal.classList.add("active");
}

async function loadSocialMediaData() {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('social_media')
      .eq('id', currentUser.id)
      .single();

    if (!error && profile && profile.social_media) {
      const socialMedia = profile.social_media;
      console.log('Loading social media data:', socialMedia);
      
      // Set inputs for each platform
      const platforms = ['instagram', 'facebook', 'twitter', 'youtube', 'tiktok', 'linkedin'];
      platforms.forEach(platform => {
        const input = document.getElementById(`${platform}-input`);
        
        if (input && socialMedia[platform]) {
          input.value = socialMedia[platform];
        }
      });
    }
  } catch (error) {
    console.error('Fehler beim Laden der Social Media Daten:', error);
  }
}

// Contact Methods Modal Functions
function openContactMethodsModal() {
  const modal = document.getElementById("editModal");
  const modalBody = document.querySelector(".modal-body");
  
  modalBody.innerHTML = `
    <div class="form-group">
      <label class="form-label">Bevorzugte Kontaktwege</label>
      <div class="contact-methods-list">
        <label class="method-item">
          <input type="checkbox" id="method-phone" class="method-checkbox">
          <span class="method-name">📞 Telefon</span>
        </label>
        <label class="method-item">
          <input type="checkbox" id="method-email" class="method-checkbox">
          <span class="method-name">✉️ E-Mail</span>
        </label>
        <label class="method-item">
          <input type="checkbox" id="method-whatsapp" class="method-checkbox">
          <span class="method-name">💬 WhatsApp</span>
        </label>
        <label class="method-item">
          <input type="checkbox" id="method-messenger" class="method-checkbox">
          <span class="method-name">💙 Facebook Messenger</span>
        </label>
        <label class="method-item">
          <input type="checkbox" id="method-instagram" class="method-checkbox">
          <span class="method-name">📷 Instagram DM</span>
        </label>
        <label class="method-item">
          <input type="checkbox" id="method-sms" class="method-checkbox">
          <span class="method-name">💬 SMS</span>
        </label>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Erreichbarkeit</label>
      <select id="response-time" class="form-input">
        <option value="within_hours">🕐 Innerhalb weniger Stunden</option>
        <option value="within_day">📅 Innerhalb eines Tages</option>
        <option value="within_days">📆 Innerhalb von 2-3 Tagen</option>
        <option value="varies">🔄 Variiert</option>
      </select>
    </div>
    <p style="font-size: 13px; color: var(--text-secondary); margin-top: 16px;">
      Wählen Sie aus, wie Sie kontaktiert werden möchten und wie schnell Sie typischerweise antworten.
    </p>
  `;

  setTimeout(() => {
    loadContactMethodsData();
  }, 100);
  
  modal.classList.add("active");
}

async function loadContactMethodsData() {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('contact_methods')
      .eq('id', currentUser.id)
      .single();

    if (!error && profile && profile.contact_methods) {
      const contactMethods = profile.contact_methods;
      console.log('Loading contact methods:', contactMethods);
      
      // Set checkboxes for each method type
      const methodTypes = ['phone', 'email', 'whatsapp', 'messenger', 'instagram', 'sms'];
      methodTypes.forEach(type => {
        const checkbox = document.getElementById(`method-${type}`);
        if (checkbox) {
          const method = contactMethods.find(m => m.type === type);
          checkbox.checked = method ? (method.active || false) : false;
        }
      });

      // Set response time
      const responseSelect = document.getElementById('response-time');
      const responseSetting = contactMethods.find(m => m.response_time);
      if (responseSetting && responseSelect) {
        responseSelect.value = responseSetting.response_time;
      }
    }
  } catch (error) {
    console.error('Fehler beim Laden der Kontaktmethoden:', error);
  }
}

async function saveEdit() {
  const input = document.getElementById("modalInput");
  const value = input ? input.value.trim() : "";

  if (currentEditType !== "social_media" && currentEditType !== "contact_methods" && !value) {
    alert("Bitte einen Wert eingeben!");
    return;
  }

  try {
    switch (currentEditType) {
      case "username":
        if (value.length < 2) {
          alert("Benutzername muss mindestens 2 Zeichen lang sein!");
          return;
        }

        // Update in profiles table
        const { error } = await supabase
          .from('profiles')
          .update({ 
            username: value,
            updated_at: new Date().toISOString()
          })
          .eq('id', currentUser.id);
          
        if (error) throw error;

        await trackEvent("username_update", { new_username: value });
        closeEditModal();
        showSuccess("Benutzername geändert", "Ihr Benutzername wurde erfolgreich aktualisiert.");
        await loadUser();
        break;

      case "phone":
        const formattedPhone = formatPhoneForStorage(value);
        const phoneRegex = /^\+[0-9]{8,}$/;
        if (!phoneRegex.test(formattedPhone)) {
          alert("Bitte geben Sie eine gültige Telefonnummer ein!");
          return;
        }

        console.log('Updating phone to:', formattedPhone);

        // Update in profiles table
        const { error: phoneError } = await supabase
          .from('profiles')
          .update({ 
            phone: formattedPhone,
            updated_at: new Date().toISOString()
          })
          .eq('id', currentUser.id);
          
        if (phoneError) {
          console.error('Phone update error:', phoneError);
          throw phoneError;
        }

        await trackEvent("phone_update");
        closeEditModal();
        showSuccess("Telefonnummer geändert", "Ihre Telefonnummer wurde erfolgreich aktualisiert.");
        await loadUser();
        break;

      case "email":
        if (!value.includes("@")) {
          alert("Bitte eine gültige E-Mail-Adresse eingeben!");
          return;
        }

        // Update both in auth.users and profiles table
        const { error: emailError } = await supabase.auth.updateUser({ email: value });
        if (emailError) throw emailError;

        // Also update in profiles table
        const { error: profileEmailError } = await supabase
          .from('profiles')
          .update({ 
            email: value,
            updated_at: new Date().toISOString()
          })
          .eq('id', currentUser.id);
          
        if (profileEmailError) console.error('Profile email update error:', profileEmailError);

        await trackEvent("email_update_attempt", { new_email: value });
        closeEditModal();
        showSuccess(
          "Bestätigungsmail gesendet",
          "Bitte prüfen Sie Ihr E-Mail-Postfach und bestätigen Sie die neue Adresse."
        );
        break;

      case "password":
        if (value.length < 6) {
          alert("Passwort muss mindestens 6 Zeichen lang sein!");
          return;
        }

        const { error: pwError } = await supabase.auth.updateUser({ password: value });
        if (pwError) throw pwError;

        await trackEvent("password_update");
        closeEditModal();
        showSuccess("Passwort geändert", "Ihr Passwort wurde erfolgreich aktualisiert.");
        break;

      case "social_media":
        await saveSocialMedia();
        break;
        
      case "contact_methods":
        await saveContactMethods();
        break;
    }
  } catch (error) {
    console.error('Save error:', error);
    alert(`Fehler: ${error.message}`);
  }
}

async function saveSocialMedia() {
  try {
    const socialMedia = {};
    const platforms = ['instagram', 'facebook', 'twitter', 'youtube', 'tiktok', 'linkedin'];
    
    platforms.forEach(platform => {
      const input = document.getElementById(`${platform}-input`);
      
      if (input && input.value.trim()) {
        socialMedia[platform] = input.value.trim();
      }
    });

    console.log('Saving social media:', socialMedia);

    const { error } = await supabase
      .from('profiles')
      .update({ 
        social_media: socialMedia,
        updated_at: new Date().toISOString()
      })
      .eq('id', currentUser.id);

    if (error) throw error;

    await trackEvent('social_media_update', { 
      platforms: Object.keys(socialMedia),
      platform_count: Object.keys(socialMedia).length 
    });
    closeEditModal();
    showSuccess('Social Media aktualisiert', 'Ihre Social Media Links wurden gespeichert.');
    await loadUser();
    
  } catch (error) {
    console.error('Social media save error:', error);
    alert(`Fehler beim Speichern: ${error.message}`);
  }
}

async function saveContactMethods() {
  try {
    const contactMethods = [];
    const methodTypes = ['phone', 'email', 'whatsapp', 'messenger', 'instagram', 'sms'];
    
    methodTypes.forEach(type => {
      const checkbox = document.getElementById(`method-${type}`);
      contactMethods.push({
        type: type,
        active: checkbox ? checkbox.checked : false
      });
    });

    // Add response time to the first method (or create a separate setting)
    const responseSelect = document.getElementById('response-time');
    if (responseSelect && contactMethods.length > 0) {
      contactMethods[0].response_time = responseSelect.value;
    }

    console.log('Saving contact methods:', contactMethods);

    const { error } = await supabase
      .from('profiles')
      .update({ 
        contact_methods: contactMethods,
        updated_at: new Date().toISOString()
      })
      .eq('id', currentUser.id);

    if (error) throw error;

    const activeMethods = contactMethods.filter(method => method.active);
    await trackEvent('contact_methods_update', {
      active_methods: activeMethods.map(m => m.type),
      response_time: responseSelect ? responseSelect.value : 'not_set'
    });
    closeEditModal();
    showSuccess('Kontaktmethoden aktualisiert', 'Ihre bevorzugten Kontaktwege wurden gespeichert.');
    await loadUser();
    
  } catch (error) {
    console.error('Contact methods save error:', error);
    alert(`Fehler beim Speichern: ${error.message}`);
  }
}

async function logout() {
  try {
    await trackEvent("logout_attempt");
    const { error } = await supabase.auth.signOut();
    if (error) throw error;

    await trackEvent("logout_success");
    window.location.href = "login.html";
  } catch (error) {
    await trackEvent("logout_error", { error_message: error.message });
    alert(`Abmeldefehler: ${error.message}`);
  }
}

function confirmDelete() {
  if (confirm("ACCOUNT WIRKLICH LÖSCHEN? ALLE DATEN GEHEN VERLOREN!")) {
    deleteAccount();
  } else {
    trackEvent("account_deletion_cancelled");
  }
}

async function deleteAccount() {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;

    await trackEvent("account_deletion_attempt", {
      user_id: user.id,
      email: user.email,
    });

    const { error } = await supabase.rpc("delete_user", { user_id: user.id });
    if (error) throw error;

    await trackEvent("account_deletion_success", {
      user_id: user.id,
      email: user.email,
    });

    await supabase.auth.signOut();
    alert("Account gelöscht!");
    window.location.href = "../../index.html";
  } catch (error) {
    await trackEvent("account_deletion_error", {
      error_message: error.message,
      error_code: error.status || "unknown",
    });
    alert(`Löschfehler: ${error.message}`);
  }
}

async function initializeApp() {
  try {
    await waitForSupabase()
    const success = await initializeSupabase();
    if (!success) return;
    await loadUser();
  } catch (error) {
    console.error("App initialization error:", error);
    showError(`Startfehler: ${error.message}`);
  }
}

// Initialize when DOM is ready
if (document.readyState === "complete") {
  initializeApp();
} else {
  document.addEventListener("DOMContentLoaded", initializeApp);
}