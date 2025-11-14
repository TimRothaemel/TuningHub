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
  console.log('=== loadUser() START ===');
  
  if (!isInitialized) {
    console.error('❌ System nicht initialisiert');
    showError("System nicht bereit. Bitte neu laden.");
    return;
  }

  try {
    console.log('📡 Fetching user from auth...');
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      console.error('❌ Auth error or no user:', error);
      window.location.href = "login.html";
      return;
    }

    console.log('✅ User authenticated:', user.id);
    currentUser = user;
    
    // Load complete profile data from profiles table
    console.log('📡 Fetching profile from database...');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('❌ Fehler beim Laden der Profildaten:', profileError);
      showError('Profildaten konnten nicht geladen werden.');
      return;
    }

    console.log('✅ Profile loaded successfully');
    console.log('📊 Complete profile data:', JSON.stringify(profile, null, 2));
    console.log('📊 social_media type:', typeof profile.social_media, 'value:', profile.social_media);
    console.log('📊 contact_methods type:', typeof profile.contact_methods, 'value:', profile.contact_methods);

    // Update UI
    console.log('🎨 Updating UI elements...');
    document.getElementById("loadingState").style.display = "none";
    document.getElementById("settingsContent").style.display = "block";

    // Update Avatar with Initials
    const username = profile.username || user.email;
    const initials = getInitials(username);
    document.getElementById("userAvatar").textContent = initials;
    console.log('✅ Avatar updated');

    // Update basic profile fields from profiles table
    const usernameEl = document.getElementById("displayUsername");
    if (profile.username) {
      usernameEl.textContent = profile.username;
      usernameEl.classList.remove("setting-placeholder");
      console.log('✅ Username updated:', profile.username);
    } else {
      console.log('⚠️ No username in profile');
    }

    const phoneEl = document.getElementById("displayPhone");
    if (profile.phone) {
      phoneEl.textContent = formatPhoneForDisplay(profile.phone);
      phoneEl.classList.remove("setting-placeholder");
      console.log('✅ Phone updated:', profile.phone);
    } else {
      console.log('⚠️ No phone in profile');
    }

    // Update social media and contact methods with explicit data
    console.log('🔄 Calling updateSocialMediaDisplay...');
    console.log('   Input:', profile.social_media || {});
    updateSocialMediaDisplay(profile.social_media || {});
    
    console.log('🔄 Calling updateContactMethodsDisplay...');
    console.log('   Input:', profile.contact_methods || []);
    updateContactMethodsDisplay(profile.contact_methods || []);
    
    console.log('=== loadUser() END ===');

  } catch (error) {
    console.error("❌ Unerwarteter Fehler:", error);
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
  console.log('');
  console.log('=== updateSocialMediaDisplay() START ===');
  console.log('📥 Input received:', socialMedia);
  console.log('📊 Type:', typeof socialMedia);
  console.log('📊 Is null?', socialMedia === null);
  console.log('📊 Is undefined?', socialMedia === undefined);
  console.log('📊 Is object?', typeof socialMedia === 'object');
  
  const displayEl = document.getElementById("displaySocialMedia");
  console.log('🔍 Display element found?', !!displayEl);
  
  if (!displayEl) {
    console.error('❌ displaySocialMedia element NOT FOUND in DOM!');
    console.log('Available elements with id:', 
      Array.from(document.querySelectorAll('[id]')).map(el => el.id)
    );
    return;
  }
  
  console.log('✅ Display element found:', displayEl);
  console.log('📄 Current innerHTML:', displayEl.innerHTML);
  console.log('📄 Current classes:', displayEl.className);
  
  // Handle null, undefined, or empty object
  if (!socialMedia || typeof socialMedia !== 'object') {
    console.log('⚠️ socialMedia is NULL or not an object');
    console.log('🔧 Setting placeholder text...');
    displayEl.innerHTML = '<span class="setting-placeholder">Nicht verknüpft</span>';
    displayEl.classList.add("setting-placeholder");
    console.log('✅ Placeholder set. New innerHTML:', displayEl.innerHTML);
    console.log('=== updateSocialMediaDisplay() END (NULL) ===');
    return;
  }
  
  const keys = Object.keys(socialMedia);
  console.log('🔑 Object keys:', keys);
  console.log('🔑 Keys length:', keys.length);
  
  if (keys.length === 0) {
    console.log('⚠️ socialMedia object is empty');
    console.log('🔧 Setting placeholder text...');
    displayEl.innerHTML = '<span class="setting-placeholder">Nicht verknüpft</span>';
    displayEl.classList.add("setting-placeholder");
    console.log('✅ Placeholder set. New innerHTML:', displayEl.innerHTML);
    console.log('=== updateSocialMediaDisplay() END (EMPTY) ===');
    return;
  }

  // Count platforms with actual values
  console.log('🔍 Filtering platforms with valid values...');
  const platforms = keys.filter(platform => {
    const value = socialMedia[platform];
    console.log(`  - ${platform}:`, value, 'type:', typeof value);
    const hasValue = value && value.trim && value.trim().length > 0;
    console.log(`    hasValue: ${hasValue}`);
    return hasValue;
  });
  
  console.log('✅ Valid platforms found:', platforms);
  console.log('📊 Platform count:', platforms.length);
  
  if (platforms.length === 0) {
    console.log('⚠️ No valid platforms (all empty)');
    console.log('🔧 Setting placeholder text...');
    displayEl.innerHTML = '<span class="setting-placeholder">Nicht verknüpft</span>';
    displayEl.classList.add("setting-placeholder");
    console.log('✅ Placeholder set. New innerHTML:', displayEl.innerHTML);
    console.log('=== updateSocialMediaDisplay() END (NO VALID) ===');
    return;
  }

  // Show the platform name instead of count (since only 1 is allowed)
  const platformName = platforms[0].charAt(0).toUpperCase() + platforms[0].slice(1);
  const text = `${platformName} verknüpft`;
  console.log('🔧 Setting text:', text);
  displayEl.textContent = text;
  displayEl.classList.remove("setting-placeholder");
  console.log('✅ Text set. New textContent:', displayEl.textContent);
  console.log('✅ Classes:', displayEl.className);
  console.log('=== updateSocialMediaDisplay() END (SUCCESS) ===');
}

function updateContactMethodsDisplay(contactMethods) {
  console.log('');
  console.log('=== updateContactMethodsDisplay() START ===');
  console.log('📥 Input received:', contactMethods);
  console.log('📊 Type:', typeof contactMethods);
  console.log('📊 Is null?', contactMethods === null);
  console.log('📊 Is undefined?', contactMethods === undefined);
  console.log('📊 Is array?', Array.isArray(contactMethods));
  
  const displayEl = document.getElementById("displayContactMethods");
  console.log('🔍 Display element found?', !!displayEl);
  
  if (!displayEl) {
    console.error('❌ displayContactMethods element NOT FOUND in DOM!');
    console.log('Available elements with id:', 
      Array.from(document.querySelectorAll('[id]')).map(el => el.id)
    );
    return;
  }
  
  console.log('✅ Display element found:', displayEl);
  console.log('📄 Current innerHTML:', displayEl.innerHTML);
  console.log('📄 Current classes:', displayEl.className);
  
  // Handle null, undefined, or non-array
  if (!contactMethods || !Array.isArray(contactMethods)) {
    console.log('⚠️ contactMethods is NULL or not an array');
    console.log('🔧 Setting placeholder text...');
    displayEl.innerHTML = '<span class="setting-placeholder">Nicht festgelegt</span>';
    displayEl.classList.add("setting-placeholder");
    console.log('✅ Placeholder set. New innerHTML:', displayEl.innerHTML);
    console.log('=== updateContactMethodsDisplay() END (NULL) ===');
    return;
  }
  
  console.log('📊 Array length:', contactMethods.length);
  
  if (contactMethods.length === 0) {
    console.log('⚠️ contactMethods array is empty');
    console.log('🔧 Setting placeholder text...');
    displayEl.innerHTML = '<span class="setting-placeholder">Nicht festgelegt</span>';
    displayEl.classList.add("setting-placeholder");
    console.log('✅ Placeholder set. New innerHTML:', displayEl.innerHTML);
    console.log('=== updateContactMethodsDisplay() END (EMPTY) ===');
    return;
  }

  // Check if it's a string array (old format) or object array (new format)
  const firstElement = contactMethods[0];
  const isStringArray = typeof firstElement === 'string';
  console.log('📊 First element:', firstElement, 'Type:', typeof firstElement);
  console.log('📊 Is string array?', isStringArray);

  let activeMethods;
  
  if (isStringArray) {
    // Old format: ["phone", "social", "chat"]
    console.log('🔄 Converting string array to object array...');
    activeMethods = contactMethods.filter(method => typeof method === 'string' && method.length > 0);
    console.log('✅ Active methods (strings):', activeMethods);
  } else {
    // New format: [{type: "phone", active: true}, ...]
    console.log('🔍 Filtering active methods (object format)...');
    activeMethods = contactMethods.filter((method, index) => {
      console.log(`  [${index}]:`, method);
      if (!method || typeof method !== 'object') {
        console.log(`    ❌ Invalid: not an object`);
        return false;
      }
      console.log(`    type: ${method.type}, active: ${method.active}`);
      const isActive = method.active === true;
      console.log(`    isActive: ${isActive}`);
      return isActive;
    });
    console.log('✅ Active methods (objects):', activeMethods);
  }
  
  console.log('📊 Active count:', activeMethods.length);
  
  if (activeMethods.length === 0) {
    console.log('⚠️ No active methods');
    console.log('🔧 Setting placeholder text...');
    displayEl.innerHTML = '<span class="setting-placeholder">Nicht festgelegt</span>';
    displayEl.classList.add("setting-placeholder");
    console.log('✅ Placeholder set. New innerHTML:', displayEl.innerHTML);
    console.log('=== updateContactMethodsDisplay() END (NO ACTIVE) ===');
    return;
  }

  const text = `${activeMethods.length} Methode${activeMethods.length !== 1 ? 'n' : ''} aktiviert`;
  console.log('🔧 Setting text:', text);
  displayEl.textContent = text;
  displayEl.classList.remove("setting-placeholder");
  console.log('✅ Text set. New textContent:', displayEl.textContent);
  console.log('✅ Classes:', displayEl.className);
  console.log('=== updateContactMethodsDisplay() END (SUCCESS) ===');
}

function openEditModal(type) {
  currentEditType = type;
  const modal = document.getElementById("editModal");
  const modalTitle = document.getElementById("modalTitle");
  const inputLabel = document.getElementById("inputLabel");
  const modalInput = document.getElementById("modalInput");
  const modalBody = document.querySelector(".modal-body");

  console.log('openEditModal called with type:', type);
  console.log('modalInput element:', modalInput);
  console.log('modalBody element:', modalBody);

  // For social_media and contact_methods, we'll rebuild the modal body
  if (type === "social_media" || type === "contact_methods") {
    if (type === "social_media") {
      modalTitle.textContent = "Social Media verwalten";
      openSocialMediaModal();
    } else {
      modalTitle.textContent = "Kontaktmethoden verwalten";
      openContactMethodsModal();
    }
    return;
  }

  // For other types, reset modal to default input
  modalBody.innerHTML = `
    <div class="form-group">
      <label class="form-label" id="inputLabel">Wert</label>
      <input type="text" class="form-input" id="modalInput" />
    </div>
  `;

  // Re-get the input element after resetting
  const newModalInput = document.getElementById("modalInput");

  switch (type) {
    case "username":
      modalTitle.textContent = "Benutzername ändern";
      document.getElementById("inputLabel").textContent = "Neuer Benutzername";
      newModalInput.type = "text";
      newModalInput.placeholder = "Benutzername eingeben";
      newModalInput.value = "";
      break;
    case "phone":
      modalTitle.textContent = "Telefonnummer ändern";
      document.getElementById("inputLabel").textContent = "Neue Telefonnummer";
      newModalInput.type = "tel";
      newModalInput.placeholder = "z.B. 01721234567";
      newModalInput.value = "";
      break;
    case "email":
      modalTitle.textContent = "E-Mail ändern";
      document.getElementById("inputLabel").textContent = "Neue E-Mail-Adresse";
      newModalInput.type = "email";
      newModalInput.placeholder = "neue@email.de";
      newModalInput.value = "";
      break;
    case "password":
      modalTitle.textContent = "Passwort ändern";
      document.getElementById("inputLabel").textContent = "Neues Passwort";
      newModalInput.type = "password";
      newModalInput.placeholder = "Mindestens 6 Zeichen";
      newModalInput.value = "";
      break;
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
      <label class="form-label">Social Media Link</label>
      <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 16px;">
        Wählen Sie EINE Plattform und geben Sie den vollständigen Link zu Ihrem Profil ein.
      </p>
      <div class="social-media-list">
        <label class="platform-radio-item">
          <input type="radio" name="social-platform" value="instagram" id="platform-instagram">
          <span class="platform-label">📸 Instagram</span>
        </label>
        <input type="url" id="instagram-input" class="form-input platform-url-input" placeholder="https://instagram.com/benutzername" style="margin-left: 32px; margin-bottom: 12px;">
        
        <label class="platform-radio-item">
          <input type="radio" name="social-platform" value="facebook" id="platform-facebook">
          <span class="platform-label">👥 Facebook</span>
        </label>
        <input type="url" id="facebook-input" class="form-input platform-url-input" placeholder="https://facebook.com/benutzername" style="margin-left: 32px; margin-bottom: 12px;">
        
        <label class="platform-radio-item">
          <input type="radio" name="social-platform" value="twitter" id="platform-twitter">
          <span class="platform-label">🐦 Twitter/X</span>
        </label>
        <input type="url" id="twitter-input" class="form-input platform-url-input" placeholder="https://twitter.com/benutzername" style="margin-left: 32px; margin-bottom: 12px;">
        
        <label class="platform-radio-item">
          <input type="radio" name="social-platform" value="youtube" id="platform-youtube">
          <span class="platform-label">▶️ YouTube</span>
        </label>
        <input type="url" id="youtube-input" class="form-input platform-url-input" placeholder="https://youtube.com/@kanalname" style="margin-left: 32px; margin-bottom: 12px;">
        
        <label class="platform-radio-item">
          <input type="radio" name="social-platform" value="tiktok" id="platform-tiktok">
          <span class="platform-label">🎵 TikTok</span>
        </label>
        <input type="url" id="tiktok-input" class="form-input platform-url-input" placeholder="https://tiktok.com/@benutzername" style="margin-left: 32px; margin-bottom: 12px;">
        
        <label class="platform-radio-item">
          <input type="radio" name="social-platform" value="linkedin" id="platform-linkedin">
          <span class="platform-label">💼 LinkedIn</span>
        </label>
        <input type="url" id="linkedin-input" class="form-input platform-url-input" placeholder="https://linkedin.com/in/profilname" style="margin-left: 32px;">
      </div>
    </div>
  `;

  setTimeout(() => {
    loadSocialMediaData();
    setupSocialMediaRadioListeners();
  }, 100);

  modal.classList.add("active");
}

function setupSocialMediaRadioListeners() {
  const platforms = ['instagram', 'facebook', 'twitter', 'youtube', 'tiktok', 'linkedin'];
  
  platforms.forEach(platform => {
    const radio = document.getElementById(`platform-${platform}`);
    const input = document.getElementById(`${platform}-input`);
    
    if (radio && input) {
      // When radio is selected, focus on the input
      radio.addEventListener('change', () => {
        if (radio.checked) {
          input.focus();
          // Disable other inputs
          platforms.forEach(otherPlatform => {
            if (otherPlatform !== platform) {
              const otherInput = document.getElementById(`${otherPlatform}-input`);
              if (otherInput) {
                otherInput.disabled = true;
                otherInput.style.opacity = '0.5';
              }
            }
          });
          input.disabled = false;
          input.style.opacity = '1';
        }
      });
      
      // When input is focused, select the radio
      input.addEventListener('focus', () => {
        radio.checked = true;
        radio.dispatchEvent(new Event('change'));
      });
      
      // When input has value, auto-select radio
      input.addEventListener('input', () => {
        if (input.value.trim()) {
          radio.checked = true;
          radio.dispatchEvent(new Event('change'));
        }
      });
    }
  });
}

async function loadSocialMediaData() {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('social_media')
      .eq('id', currentUser.id)
      .single();

    if (error) {
      console.error('Error loading social media:', error);
      return;
    }

    console.log('Loaded social media from DB:', profile);

    if (profile && profile.social_media && typeof profile.social_media === 'object') {
      const socialMedia = profile.social_media;
      console.log('Social media object:', socialMedia);
      
      // Set inputs and radio buttons for each platform
      const platforms = ['instagram', 'facebook', 'twitter', 'youtube', 'tiktok', 'linkedin'];
      let selectedPlatform = null;
      
      platforms.forEach(platform => {
        const input = document.getElementById(`${platform}-input`);
        const radio = document.getElementById(`platform-${platform}`);
        
        if (input) {
          if (socialMedia[platform] && typeof socialMedia[platform] === 'string') {
            input.value = socialMedia[platform];
            if (radio) {
              radio.checked = true;
              selectedPlatform = platform;
            }
            console.log(`Set ${platform} to:`, socialMedia[platform]);
          } else {
            input.value = '';
            if (radio) {
              radio.checked = false;
            }
          }
        }
      });
      
      // Disable inputs that are not selected
      if (selectedPlatform) {
        platforms.forEach(platform => {
          const input = document.getElementById(`${platform}-input`);
          if (input && platform !== selectedPlatform) {
            input.disabled = true;
            input.style.opacity = '0.5';
          }
        });
      }
    } else {
      console.log('No social media data or invalid format');
      // Enable all inputs if no data
      const platforms = ['instagram', 'facebook', 'twitter', 'youtube', 'tiktok', 'linkedin'];
      platforms.forEach(platform => {
        const input = document.getElementById(`${platform}-input`);
        if (input) {
          input.disabled = false;
          input.style.opacity = '1';
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
          <span class="material-symbols-outlined" style="margin-right: 8px;">phone</span>
          <span class="method-name">Telefon</span>
        </label>
        <label class="method-item">
          <input type="checkbox" id="method-email" class="method-checkbox">
          <span class="material-symbols-outlined" style="margin-right: 8px;">mail</span>
          <span class="method-name">E-Mail</span>
        </label>
        <label class="method-item">
          <input type="checkbox" id="method-whatsapp" class="method-checkbox">
          <span class="material-symbols-outlined" style="margin-right: 8px;">chat</span>
          <span class="method-name">WhatsApp</span>
        </label>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Erreichbarkeit</label>
      <select id="response-time" class="form-input">
        <option value="within_hours">Innerhalb weniger Stunden</option>
        <option value="within_day">Innerhalb eines Tages</option>
        <option value="within_days">Innerhalb von 2-3 Tagen</option>
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

    if (error) {
      console.error('Error loading contact methods:', error);
      return;
    }

    console.log('Loaded contact methods from DB:', profile);

    if (profile && profile.contact_methods && Array.isArray(profile.contact_methods)) {
      const contactMethods = profile.contact_methods;
      console.log('Contact methods array:', contactMethods);
      
      // Check if it's string array or object array
      const isStringArray = contactMethods.length > 0 && typeof contactMethods[0] === 'string';
      console.log('Is string array?', isStringArray);
      
      if (isStringArray) {
        // Convert string array to object array for UI
        console.log('Converting string array to checkboxes...');
        const methodTypes = ['phone', 'email', 'whatsapp', 'messenger', 'instagram', 'sms'];
        
        methodTypes.forEach(type => {
          const checkbox = document.getElementById(`method-${type}`);
          if (checkbox) {
            // Check if this type exists in the string array
            // Map old format to new format
            const typeMapping = {
              'phone': 'phone',
              'email': 'email',
              'whatsapp': 'whatsapp',
              'messenger': 'messenger',
              'instagram': 'instagram',
              'sms': 'sms',
              'social': 'instagram', // old format compatibility
              'chat': 'whatsapp'     // old format compatibility
            };
            
            const isActive = contactMethods.some(method => {
              const mappedType = typeMapping[method];
              return mappedType === type;
            });
            
            checkbox.checked = isActive;
            console.log(`Set ${type} checkbox to:`, checkbox.checked, '(from string array)');
          }
        });
      } else {
        // Object array format
        const methodTypes = ['phone', 'email', 'whatsapp', 'messenger', 'instagram', 'sms'];
        methodTypes.forEach(type => {
          const checkbox = document.getElementById(`method-${type}`);
          if (checkbox) {
            const method = contactMethods.find(m => m && m.type === type);
            checkbox.checked = method ? (method.active === true) : false;
            console.log(`Set ${type} checkbox to:`, checkbox.checked);
          }
        });
      }

      // Set response time if available
      const responseSelect = document.getElementById('response-time');
      if (responseSelect) {
        const responseSetting = contactMethods.find(m => m && m.response_time);
        if (responseSetting && responseSetting.response_time) {
          responseSelect.value = responseSetting.response_time;
          console.log('Set response time to:', responseSetting.response_time);
        }
      }
    } else {
      console.log('No contact methods data or invalid format');
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
    // Find which platform is selected
    const platforms = ['instagram', 'facebook', 'twitter', 'youtube', 'tiktok', 'linkedin'];
    let selectedPlatform = null;
    let selectedUrl = null;
    
    platforms.forEach(platform => {
      const radio = document.getElementById(`platform-${platform}`);
      const input = document.getElementById(`${platform}-input`);
      
      if (radio && radio.checked && input && input.value.trim()) {
        selectedPlatform = platform;
        selectedUrl = input.value.trim();
      }
    });

    console.log('Selected platform:', selectedPlatform, 'URL:', selectedUrl);

    if (!selectedPlatform || !selectedUrl) {
      alert('Bitte wählen Sie eine Plattform und geben Sie einen Link ein!');
      return;
    }

    // Save only the selected platform
    const socialMedia = {
      [selectedPlatform]: selectedUrl
    };

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
      platform: selectedPlatform,
      has_url: true
    });
    closeEditModal();
    showSuccess('Social Media aktualisiert', `Ihr ${selectedPlatform.charAt(0).toUpperCase() + selectedPlatform.slice(1)} Link wurde gespeichert.`);
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