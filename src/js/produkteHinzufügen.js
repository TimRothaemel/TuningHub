console.log("Lade produkteHinzufügen.js...");

"use strict";

let supabase = null;
let trackingSupabase = null;
let userPhone = "";
let currentUser = null;
let isProcessing = false;
let imageInputCount = 1;
let categories = [];

async function initializeSupabase() {
  try {
    const { supabase: sb, trackingSupabase: tsb } = await import("/src/js/supabaseClient.js");
    supabase = sb;
    trackingSupabase = tsb;
    
    console.log("Supabase erfolgreich initialisiert");
    return true;
  } catch (error) {
    console.error("Fehler bei Supabase-Initialisierung:", error);
    showError("Verbindungsfehler. Bitte Seite neu laden.");
    return false;
  }
}

function showLoading(show = true) {
  const overlay = document.getElementById("loadingOverlay");
  if (overlay) {
    overlay.classList.toggle("show", show);
  }
}

async function getCurrentUser() {
  try {
    if (!supabase) {
      throw new Error("Supabase nicht initialisiert");
    }

    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      console.error("Session-Fehler:", error);
      throw error;
    }

    if (!session || !session.user) {
      showError("Du musst eingeloggt sein, um ein Teil hinzuzufügen.");
      setTimeout(() => {
        window.location.href = "login.html";
      }, 2000);
      return null;
    }

    return session.user;
  } catch (error) {
    console.error("Fehler beim Abrufen des Benutzers:", error);
    showError("Fehler bei der Authentifizierung. Bitte neu einloggen.");
    return null;
  }
}

async function loadCategories() {
  try {
    console.log("Lade Kategorien...");
    
    const { data, error } = await supabase
      .from("categories")
      .select("id, name, description")
      .order("name");

    if (error) {
      console.error("Fehler beim Laden der Kategorien:", error);
      throw error;
    }

    categories = data || [];
    console.log("Kategorien geladen:", categories.length);

    const categorySelect = document.getElementById("categorySelect");
    if (categorySelect) {
      categorySelect.innerHTML = '<option value="">Bitte Kategorie wählen...</option>';
      
      categories.forEach(category => {
        const option = document.createElement("option");
        option.value = category.id;
        option.textContent = category.name;
        if (category.description) {
          option.title = category.description;
        }
        categorySelect.appendChild(option);
      });
    }
  } catch (error) {
    console.error("Fehler beim Laden der Kategorien:", error);
    const categorySelect = document.getElementById("categorySelect");
    if (categorySelect) {
      categorySelect.innerHTML = '<option value="">Fehler beim Laden der Kategorien</option>';
    }
    showError("Kategorien konnten nicht geladen werden. Bitte Seite neu laden.");
  }
}

async function createNewCategory() {
  try {
    const nameInput = document.getElementById("newCategoryName");
    const descriptionInput = document.getElementById("newCategoryDescription");
    
    if (!nameInput || !nameInput.value.trim()) {
      showError("Bitte gib einen Namen für die neue Kategorie ein.");
      return false;
    }

    const categoryName = nameInput.value.trim();
    const categoryDescription = descriptionInput ? descriptionInput.value.trim() : "";

    if (categoryName.length > 100) {
      showError("Der Kategoriename ist zu lang (max. 100 Zeichen).");
      return false;
    }

    if (categoryDescription.length > 500) {
      showError("Die Kategoriebeschreibung ist zu lang (max. 500 Zeichen).");
      return false;
    }

    // Prüfen ob Kategorie bereits existiert
    const existingCategory = categories.find(
      cat => cat.name.toLowerCase() === categoryName.toLowerCase()
    );
    
    if (existingCategory) {
      showError("Eine Kategorie mit diesem Namen existiert bereits.");
      return false;
    }

    console.log("Erstelle neue Kategorie:", categoryName);

    const insertData = {
      user_id: currentUser.id,
      name: categoryName,
      created_at: new Date().toISOString()
    };

    if (categoryDescription) {
      insertData.description = categoryDescription;
    }

    const { data, error } = await supabase
      .from("categories")
      .insert([insertData])
      .select()
      .single();

    if (error) {
      console.error("Fehler beim Erstellen der Kategorie:", error);
      throw error;
    }

    console.log("Neue Kategorie erstellt:", data);

    // Kategorie zur lokalen Liste hinzufügen
    categories.push(data);

    // Select-Element aktualisieren
    const categorySelect = document.getElementById("categorySelect");
    if (categorySelect) {
      const option = document.createElement("option");
      option.value = data.id;
      option.textContent = data.name;
      if (data.description) {
        option.title = data.description;
      }
      categorySelect.appendChild(option);
      categorySelect.value = data.id;
    }

    // Zurück zur bestehenden Kategorie wechseln
    document.getElementById("newCategoryContainer").style.display = "none";

    // Eingabefelder zurücksetzen
    nameInput.value = "";
    if (descriptionInput) {
      descriptionInput.value = "";
    }

    // Hidden field aktualisieren
    document.getElementById("selectedCategoryId").value = data.id;

    showSuccess("Neue Kategorie erfolgreich erstellt!");
    
    await trackEvent("kategorie_erstellt", {
      category_name: categoryName,
      category_id: data.id
    });

    return true;
  } catch (error) {
    console.error("Fehler beim Erstellen der Kategorie:", error);
    showError(`Fehler beim Erstellen der Kategorie: ${error.message}`);
    return false;
  }
}

async function loadPhoneNumber() {
  try {
    currentUser = await getCurrentUser();
    if (!currentUser) return;

    // Telefonnummer ist nicht mehr erforderlich - wird entfernt
    userPhone = ""; // Leer lassen, da nicht benötigt
    
    console.log("Telefonnummer-Validierung deaktiviert");
  } catch (error) {
    console.error("Fehler beim Laden des Benutzers:", error);
  }
}

function showSuccess(message) {
  hideMessages();
  const successDiv = document.getElementById("success-message");
  if (successDiv) {
    successDiv.textContent = message;
    successDiv.style.display = "block";

    setTimeout(() => {
      successDiv.style.display = "none";
    }, 5000);
  }
}

function showError(message) {
  hideMessages();
  const errorDiv = document.getElementById("error-message");
  if (errorDiv) {
    errorDiv.textContent = message;
    errorDiv.style.display = "block";
  }
}

function hideMessages() {
  const successDiv = document.getElementById("success-message");
  const errorDiv = document.getElementById("error-message");

  if (successDiv) successDiv.style.display = "none";
  if (errorDiv) errorDiv.style.display = "none";
}

function resetForm() {
  const elements = [
    "partTitle",
    "partDescription",
    "partPrice",
    "partCondition",
    "categorySelect",
    "newCategoryName",
    "newCategoryDescription",
    "sellerLink"
  ];
  elements.forEach((id) => {
    const element = document.getElementById(id);
    if (element) {
      if (element.type === "select-one") {
        element.selectedIndex = 0;
      } else {
        element.value = "";
      }
    }
  });

  // Kategorie-Container zurücksetzen
  document.getElementById("newCategoryContainer").style.display = "none";
  document.getElementById("selectedCategoryId").value = "";

  const imageInputs = document.querySelectorAll(".partImage");
  imageInputs.forEach((input) => {
    input.value = "";
  });

  document.getElementById("imagePreviews").innerHTML = "";

  const container = document.getElementById("imageInputsContainer");
  while (container.children.length > 1) {
    container.removeChild(container.lastChild);
  }

  imageInputCount = 1;

  if (container.firstElementChild) {
    const firstInput =
      container.firstElementChild.querySelector(".partImage");
    if (firstInput) {
      firstInput.required = true;
    }
  }

  const addImageBtn = document.getElementById("addImageBtn");
  if (addImageBtn) {
    addImageBtn.style.display = "inline-block";
  }
}

async function compressImage(
  file,
  maxWidth = 800,
  maxHeight = 800,
  quality = 0.85
) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = function (event) {
      const img = new Image();
      img.onload = function () {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

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

function createImagePreview(file, index) {
  const reader = new FileReader();
  reader.onload = function (e) {
    const previewContainer = document.getElementById("imagePreviews");
    const previewDiv = document.createElement("div");
    previewDiv.className = "image-preview";
    previewDiv.dataset.index = index;

    previewDiv.innerHTML = `
      <img src="${e.target.result}" alt="Vorschau">
      <button type="button" class="remove-image" data-index="${index}">×</button>
    `;

    previewContainer.appendChild(previewDiv);

    previewDiv
      .querySelector(".remove-image")
      .addEventListener("click", function () {
        removeImageInput(index);
      });
  };
  reader.readAsDataURL(file);
}

function removeImageInput(index) {
  const inputWrapper = document
    .querySelector(`.partImage[data-index="${index}"]`)
    .closest(".image-input-wrapper");
  if (inputWrapper) {
    inputWrapper.remove();
  }

  const preview = document.querySelector(
    `.image-preview[data-index="${index}"]`
  );
  if (preview) {
    preview.remove();
  }

  const inputs = document.querySelectorAll(".partImage");
  if (inputs.length === 0) {
    addImageInput();
  }
}

function addImageInput() {
  if (imageInputCount >= 5) {
    showError("Maximal 5 Bilder sind erlaubt.");
    return;
  }

  const container = document.getElementById("imageInputsContainer");
  const newIndex = imageInputCount;

  const wrapper = document.createElement("div");
  wrapper.className = "image-input-wrapper";
  wrapper.innerHTML = `
    <input type="file" 
           class="partImage"
           accept="image/jpeg,image/jpg,image/png,image/gif,image/webp" 
           data-index="${newIndex}" />
  `;

  container.appendChild(wrapper);

  const newInput = wrapper.querySelector(".partImage");
  newInput.addEventListener("change", function (e) {
    handleImageSelection(e, newIndex);
  });

  imageInputCount++;

  if (imageInputCount >= 5) {
    document.getElementById("addImageBtn").style.display = "none";
  }
}

function handleImageSelection(e, index) {
  const file = e.target.files?.[0];
  if (!file) return;

  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    showError("Das ausgewählte Bild ist zu groß (max. 10MB).");
    e.target.value = "";
    return;
  }

  const allowedTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
  ];
  if (!allowedTypes.includes(file.type.toLowerCase())) {
    showError("Nur Bilddateien (JPEG, PNG, GIF, WebP) sind erlaubt.");
    e.target.value = "";
    return;
  }

  hideMessages();

  createImagePreview(file, index);

  if (imageInputCount < 5) {
    addImageInput();
  }
}

function isValidUrl(string) {
  try {
    const url = new URL(string);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch (_) {
    return false;
  }
}

function validateInputs() {
  const title = document.getElementById("partTitle")?.value?.trim() || "";
  const description = document.getElementById("partDescription")?.value?.trim() || "";
  const priceInput = document.getElementById("partPrice")?.value?.trim() || "";
  const condition = document.getElementById("partCondition")?.value || "";
  const type = document.getElementById("partType")?.value || "teil";
  const sellerLink = document.getElementById("sellerLink")?.value?.trim() || "";

  // Kategorie-Validierung
  const categorySelect = document.getElementById("categorySelect");
  const categoryId = categorySelect?.value || "";
  if (!categoryId) {
    throw new Error("Bitte wähle eine Kategorie aus.");
  }

  if (!title) {
    throw new Error("Bitte gib einen Titel ein.");
  }
  if (title.length > 100) {
    throw new Error("Der Titel ist zu lang (max. 100 Zeichen).");
  }

  if (!description) {
    throw new Error("Bitte gib eine Beschreibung ein.");
  }
  if (description.length > 1000) {
    throw new Error("Die Beschreibung ist zu lang (max. 1000 Zeichen).");
  }

  const price = parseFloat(priceInput);
  if (!priceInput || isNaN(price) || price < 0) {
    throw new Error("Bitte gib einen gültigen Preis ein.");
  }
  if (price > 99999) {
    throw new Error("Der Preis ist zu hoch (max. 99.999€).");
  }

  if (!condition) {
    throw new Error("Bitte wähle einen Zustand aus.");
  }

  // Link-Validierung (PFLICHTFELD)
  if (!sellerLink || sellerLink.length === 0) {
    throw new Error("Bitte gib einen Link zu deinem Produkt ein.");
  }
  
  if (sellerLink.length > 500) {
    throw new Error("Der Link ist zu lang (max. 500 Zeichen).");
  }
  
  if (!isValidUrl(sellerLink)) {
    throw new Error("Bitte gib einen gültigen Link ein (z.B. https://example.com).");
  }

  const imageInputs = document.querySelectorAll(".partImage");
  let hasImage = false;
  const imageFiles = [];

  for (const input of imageInputs) {
    if (input.files && input.files[0]) {
      hasImage = true;
      const file = input.files[0];

      const maxFileSize = 10 * 1024 * 1024;
      if (file.size > maxFileSize) {
        throw new Error(
          `Das Bild "${file.name}" ist zu groß. Maximal 10MB sind erlaubt.`
        );
      }

      const allowedTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
        "image/webp",
      ];
      if (!allowedTypes.includes(file.type.toLowerCase())) {
        throw new Error(
          `Nur Bilder (JPEG, PNG, GIF, WebP) sind erlaubt. "${file.name}" ist kein unterstütztes Format.`
        );
      }

      imageFiles.push(file);
    }
  }

  if (!hasImage) {
    throw new Error("Bitte wähle mindestens ein Bild aus.");
  }

  // Telefonnummer-Validierung entfernt - nicht mehr erforderlich

  return {
    title,
    description,
    price,
    condition,
    imageFiles,
    type,
    categoryId,
    sellerLink
  };
}

async function trackEvent(eventType, metadata = {}) {
  try {
    if (!trackingSupabase || !currentUser) return;

    const { error } = await trackingSupabase
      .from("tracking_events")
      .insert([
        {
          event_type: eventType,
          user_id: currentUser.id,
          metadata: {
            ...metadata,
            timestamp: new Date().toISOString(),
            user_agent: navigator.userAgent,
            platform: navigator.platform,
          },
        },
      ]);

    if (error) {
      console.error("Tracking-Fehler:", error);
    }
  } catch (err) {
    console.error("Tracking-Exception:", err);
  }
}

async function addPart() {
  if (isProcessing) {
    console.log("Verarbeitung bereits im Gange...");
    return;
  }

  const button = document.getElementById("addPartBtn");

  try {
    isProcessing = true;

    if (button) {
      button.disabled = true;
      button.textContent = "Wird gespeichert...";
    }
    showLoading(true);
    hideMessages();

    console.log("Starte Teil-Hinzufügung...");

    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Benutzer nicht authentifiziert");
    }
    currentUser = user;

    const validatedData = validateInputs();
    console.log("Validierung erfolgreich, Link:", validatedData.sellerLink);

    console.log("Starte Bildkomprimierung...");
    const compressedImages = [];
    for (const file of validatedData.imageFiles) {
      const compressedImage = await compressImage(file);
      compressedImages.push(compressedImage);
      console.log("Bild erfolgreich komprimiert", {
        originalSize: file.size,
        compressedSize: compressedImage.size,
        reduction: `${Math.round(
          (1 - compressedImage.size / file.size) * 100
        )}%`,
      });
    }

    const imageUrls = [];
    const uploadedFileNames = [];

    for (let i = 0; i < compressedImages.length; i++) {
      const compressedImage = compressedImages[i];

      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 8);
      const fileName = `${user.id}_${timestamp}_${randomString}_${i}.jpg`;

      console.log(`Starte Bild-Upload ${i + 1}:`, fileName);

      const { data: uploadData, error: uploadError } =
        await supabase.storage
          .from("parts-images")
          .upload(fileName, compressedImage, {
            cacheControl: "3600",
            upsert: false,
            contentType: "image/jpeg",
          });

      if (uploadError) {
        console.error("Upload-Fehler:", uploadError);

        if (uploadedFileNames.length > 0) {
          try {
            await supabase.storage
              .from("parts-images")
              .remove(uploadedFileNames);
          } catch (cleanupError) {
            console.error(
              "Cleanup-Fehler nach Upload-Fehler:",
              cleanupError
            );
          }
        }

        throw new Error(
          `Fehler beim Hochladen des Bildes: ${uploadError.message}`
        );
      }

      console.log(`Bild-Upload ${i + 1} erfolgreich`);

      const imageUrl = `https://yvdptnkmgfxkrszitweo.supabase.co/storage/v1/object/public/parts-images/${fileName}`;
      imageUrls.push(imageUrl);
      uploadedFileNames.push(fileName);
    }

    console.log("Alle Bilder erfolgreich hochgeladen");

    const insertData = {
      user_id: user.id,
      title: validatedData.title,
      description: validatedData.description,
      price: validatedData.price,
      condition: validatedData.condition,
      type: validatedData.type,
      category: validatedData.categoryId,
      link: validatedData.sellerLink,
      created_at: new Date().toISOString(),
      // contact_number entfernt - nicht mehr erforderlich
    };

    for (let i = 0; i < Math.min(imageUrls.length, 5); i++) {
      const fieldName = i === 0 ? "image_url" : `image_url${i + 1}`;
      insertData[fieldName] = imageUrls[i];
    }

    console.log("Starte Datenbank-Insert mit Daten:", insertData);

    const { data: result, error: insertError } = await supabase
      .from("parts")
      .insert([insertData])
      .select();

    if (insertError) {
      console.error("Insert-Fehler:", insertError);

      try {
        await supabase.storage
          .from("parts-images")
          .remove(uploadedFileNames);
      } catch (cleanupError) {
        console.error("Cleanup-Fehler:", cleanupError);
      }

      throw new Error(`Fehler beim Speichern: ${insertError.message}`);
    }

    console.log("Teil erfolgreich gespeichert, Ergebnis:", result);

    await trackEvent("teil_hinzugefuegt", {
      title: validatedData.title,
      price: validatedData.price,
      condition: validatedData.condition,
      type: validatedData.type,
      category_id: validatedData.categoryId,
      image_count: validatedData.imageFiles.length,
      has_seller_link: !!validatedData.sellerLink,
      seller_link_length: validatedData.sellerLink.length,
      success: true,
    });

    showLoading(false);
    showSuccess(
      "Teil erfolgreich hinzugefügt! Du wirst zur Startseite weitergeleitet..."
    );
    resetForm();

    setTimeout(() => {
      window.location.href = "../index.html";
    }, 2000);
  } catch (error) {
    console.error("Fehler beim Hinzufügen des Teils:", error);
    showLoading(false);
    showError(
      error.message ||
        "Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es erneut."
    );

    await trackEvent("teil_hinzufuegen_fehler", {
      error: error.message,
      success: false,
    });
  } finally {
    isProcessing = false;

    if (button) {
      button.disabled = false;
      button.textContent = "Teil hinzufügen";
    }
    showLoading(false);
  }
}

function setupCategoryHandlers() {
  const showNewCategoryBtn = document.getElementById("showNewCategoryBtn");
  const newCategoryContainer = document.getElementById("newCategoryContainer");
  const categorySelect = document.getElementById("categorySelect");
  const createCategoryBtn = document.getElementById("createCategoryBtn");
  const cancelNewCategoryBtn = document.getElementById("cancelNewCategoryBtn");

  if (showNewCategoryBtn) {
    showNewCategoryBtn.addEventListener("click", function() {
      newCategoryContainer.style.display = "block";
      categorySelect.required = false;
      categorySelect.value = "";
    });
  }

  if (cancelNewCategoryBtn) {
    cancelNewCategoryBtn.addEventListener("click", function() {
      newCategoryContainer.style.display = "none";
      categorySelect.required = true;
      document.getElementById("newCategoryName").value = "";
      document.getElementById("newCategoryDescription").value = "";
    });
  }

  if (categorySelect) {
    categorySelect.addEventListener("change", function() {
      if (this.value) {
        document.getElementById("selectedCategoryId").value = this.value;
        newCategoryContainer.style.display = "none";
      }
    });
  }

  if (createCategoryBtn) {
    createCategoryBtn.addEventListener("click", createNewCategory);
  }
}

document.addEventListener("DOMContentLoaded", async function () {
  console.log("DOM geladen, initialisiere App...");

  if (!(await initializeSupabase())) {
    return;
  }

  // Kategorien laden (Telefonnummer-Laden entfernt)
  try {
    await loadCategories();
    console.log("Kategorien geladen");
  } catch (error) {
    console.error("Fehler beim Laden der Daten:", error);
  }

  // Event-Listener einrichten
  setupCategoryHandlers();

  const addButton = document.getElementById("addPartBtn");
  if (addButton) {
    addButton.addEventListener("click", addPart);
  }

  const addImageBtn = document.getElementById("addImageBtn");
  if (addImageBtn) {
    addImageBtn.addEventListener("click", addImageInput);
  }

  const firstImageInput = document.querySelector(
    '.partImage[data-index="0"]'
  );
  if (firstImageInput) {
    firstImageInput.addEventListener("change", function (e) {
      handleImageSelection(e, 0);
    });
  }

  const inputs = ["partTitle", "partDescription", "partPrice", "sellerLink"];
  inputs.forEach((id) => {
    const element = document.getElementById(id);
    if (element) {
      element.addEventListener("input", hideMessages);
    }
  });

  console.log("App erfolgreich initialisiert");
});

window.addEventListener("error", function (e) {
  console.error("Globaler Fehler:", e.error);
  showError(
    "Ein unerwarteter Fehler ist aufgetreten. Bitte lade die Seite neu."
  );
});

window.addEventListener("unhandledrejection", function (e) {
  console.error("Unbehandelte Promise-Ablehnung:", e.reason);
  showError(
    "Ein Netzwerkfehler ist aufgetreten. Bitte versuche es erneut."
  );
});