document.addEventListener("DOMContentLoaded", function () {
    const API_BASE = "http://localhost:3000";

    const PRESET_IMAGE_MAP = {
        "10000": "../Images/storage/storage-10000.png",
        "1000": "../Images/storage/storage-1000.png",
        "500": "../Images/storage/storage-500.png",
        "100": "../Images/storage/storage-100.png",
        "60": "../Images/storage/storage-60.png",
        "custom": "../Images/storage/storage-custom.png"
    };

    let allStorages = [];
    let currentEditStorageId = null;
    let currentContentsStorage = null;
    let currentContentsCards = [];
    let currentContentsView = "list";

    const searchInput = document.getElementById("txtSearchLibrary");
    const tableBody = document.getElementById("displayTableBody");

    const storageModal = document.getElementById("storageModal");
    const storageModalTitle = document.getElementById("storageModalTitle");
    const closeStorageModalBtn = document.getElementById("closeStorageModal");
    const saveStorageBtn = document.getElementById("saveStorage");
    const addStorageBtn = document.getElementById("btnAddStorage");

    const storageNameInput = document.getElementById("storageName");
    const storagePresetSelect = document.getElementById("storagePreset");
    const customCapacityWrapper = document.getElementById("customCapacityWrapper");
    const storageCapacityInput = document.getElementById("storageCapacity");
    const storageLocationInput = document.getElementById("storageLocation");
    const storageTypeInput = document.getElementById("storageType");
    const storageNotesInput = document.getElementById("storageNotes");

    const optionsMenu = document.getElementById("optionsMenu");

    const contentsModal = document.getElementById("contentsModal");
    const closeContentsModalBtn = document.getElementById("closeContentsModal");
    const contentsModalTitle = document.getElementById("contentsModalTitle");
    const contentsModalSubtitle = document.getElementById("contentsModalSubtitle");
    const contentsListViewBtn = document.getElementById("contentsListViewBtn");
    const contentsImageViewBtn = document.getElementById("contentsImageViewBtn");
    const contentsListView = document.getElementById("contentsListView");
    const contentsImageView = document.getElementById("contentsImageView");
    const miniTableBody = document.getElementById("displayMiniTableBody");
    const contentsImageGrid = document.getElementById("contentsImageGrid");

    function escapeHtml(value) {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function getPresetImage(preset, customImageUrl = "") {
        if (String(customImageUrl || "").trim()) {
            return String(customImageUrl).trim();
        }

        return PRESET_IMAGE_MAP[String(preset || "custom")] || PRESET_IMAGE_MAP.custom;
    }

    function getCapacityFromPreset(preset, customCapacity) {
        if (preset === "custom") {
            return Number(customCapacity || 0);
        }

        return Number(preset || 0);
    }

    function formatDate(value) {
        if (!value) return "";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return "";
        return date.toLocaleString();
    }

    function clearStorageForm() {
        currentEditStorageId = null;
        storageModalTitle.textContent = "Add Storage";
        storageNameInput.value = "";
        storagePresetSelect.value = "10000";
        storageCapacityInput.value = "";
        storageLocationInput.value = "";
        storageTypeInput.value = "";
        storageNotesInput.value = "";
        syncPresetUi();
    }

    function fillStorageForm(storage) {
        currentEditStorageId = storage._id || null;
        storageModalTitle.textContent = "Edit Storage";

        storageNameInput.value = storage.name || "";

        const preset = String(storage.capacityPreset || "custom");
        storagePresetSelect.value = ["10000", "1000", "500", "100", "60", "custom"].includes(preset)
            ? preset
            : "custom";

        if (storagePresetSelect.value === "custom") {
            storageCapacityInput.value = storage.capacity || "";
        } else {
            storageCapacityInput.value = "";
        }

        storageLocationInput.value = storage.location || "";
        storageTypeInput.value = storage.type || "";
        storageNotesInput.value = storage.notes || "";

        syncPresetUi();
    }

    function syncPresetUi() {
        const preset = storagePresetSelect.value;
        const isCustom = preset === "custom";

        customCapacityWrapper.style.display = isCustom ? "block" : "none";

        if (!isCustom) {
            storageCapacityInput.value = "";
            storageTypeInput.value = "Box";
            storageTypeInput.readOnly = true;
        } else {
            storageTypeInput.readOnly = false;
        }
    }

    function openStorageModal() {
        storageModal.style.display = "block";
    }

    function closeStorageModal() {
        storageModal.style.display = "none";
    }

    function openContentsModal() {
        contentsModal.style.display = "block";
    }

    function closeContentsModal() {
        contentsModal.style.display = "none";
        currentContentsStorage = null;
        currentContentsCards = [];
        miniTableBody.innerHTML = "";
        contentsImageGrid.innerHTML = "";
    }

    function closeOptionsMenu() {
        optionsMenu.style.display = "none";
        optionsMenu.innerHTML = "";
    }

    function createCell(content) {
        const td = document.createElement("td");
        td.textContent = content || "";
        return td;
    }

    function createImageCell(src, alt) {
        const td = document.createElement("td");
        const img = document.createElement("img");
        img.src = src || "../Images/storage/storage-custom.png";
        img.alt = alt || "Storage";
        img.style.width = "70px";
        img.style.height = "50px";
        img.style.objectFit = "contain";
        td.appendChild(img);
        return td;
    }

    function renderStorageRows(storages) {
        tableBody.innerHTML = "";

        storages.forEach(storage => {
            const tr = document.createElement("tr");

            tr.appendChild(createCell(storage.name));
            tr.appendChild(createCell(storage.capacity ? String(storage.capacity) : ""));
            tr.appendChild(createCell(storage.location));
            tr.appendChild(createCell(storage.type));
            tr.appendChild(createCell(formatDate(storage.updatedAt)));

            const optionsTd = document.createElement("td");
            const optionsButton = document.createElement("button");
            optionsButton.type = "button";
            optionsButton.className = "options-button";
            optionsButton.textContent = "⋮";

            optionsButton.addEventListener("click", function (event) {
                event.stopPropagation();
                showOptionsMenu(event.currentTarget, storage);
            });

            optionsTd.appendChild(optionsButton);
            tr.appendChild(optionsTd);

            tr.addEventListener("dblclick", function () {
                openViewContents(storage);
            });

            tableBody.appendChild(tr);
        });
    }

    function filterAndRenderStorages() {
        const query = searchInput.value.trim().toLowerCase();

        const filtered = allStorages.filter(storage => {
            return [
                storage.name,
                storage.location,
                storage.type,
                storage.notes,
                String(storage.capacity || "")
            ].some(value => String(value || "").toLowerCase().includes(query));
        });

        renderStorageRows(filtered);
    }

    async function fetchStorage() {
        try {
            const response = await fetch(`${API_BASE}/getStorages`);
            const result = await response.json();

            if (!response.ok || result.success === false) {
                throw new Error(result.error || "Failed to fetch storages");
            }

            allStorages = Array.isArray(result.data?.storages) ? result.data.storages : [];
            filterAndRenderStorages();
        } catch (error) {
            console.error("Error fetching storage:", error);
            alert(error.message || "Failed to fetch storage");
        }
    }

    async function handleSaveStorage() {
        const name = storageNameInput.value.trim();
        const capacityPreset = storagePresetSelect.value;
        const customCapacity = storageCapacityInput.value.trim();
        const location = storageLocationInput.value.trim();
        const type = storageTypeInput.value.trim();
        const notes = storageNotesInput.value.trim();

        if (!name) {
            alert("Please enter a storage name.");
            return;
        }

        const capacity = getCapacityFromPreset(capacityPreset, customCapacity);

        if (capacityPreset === "custom" && (!capacity || capacity <= 0)) {
            alert("Please enter a valid custom capacity.");
            return;
        }

        const payload = {
            name,
            capacity,
            capacityPreset,
            location,
            type: capacityPreset === "custom" ? type : "Box",
            notes
        };

        try {
            const isEditing = Boolean(currentEditStorageId);
            const url = isEditing
                ? `${API_BASE}/updateStorage/${currentEditStorageId}`
                : `${API_BASE}/saveStorage`;

            const method = isEditing ? "PUT" : "POST";

            const response = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (!response.ok || result.success === false) {
                throw new Error(result.error || "Failed to save storage");
            }

            closeStorageModal();
            clearStorageForm();
            await fetchStorage();
        } catch (error) {
            console.error("Error saving storage:", error);
            alert(error.message || "Failed to save storage");
        }
    }

    async function handleDeleteStorage(storage) {
        const confirmed = confirm(`Delete storage "${storage.name}"?`);
        if (!confirmed) return;

        try {
            const response = await fetch(`${API_BASE}/deleteStorage/${storage._id}`, {
                method: "DELETE"
            });

            const result = await response.json();

            if (!response.ok || result.success === false) {
                throw new Error(result.error || "Failed to delete storage");
            }

            await fetchStorage();
        } catch (error) {
            console.error("Error deleting storage:", error);
            alert(error.message || "Failed to delete storage");
        }
    }

    function showOptionsMenu(anchorButton, storage) {
        optionsMenu.innerHTML = `
            <button type="button" data-action="view">View Contents</button>
            <button type="button" data-action="edit">Edit</button>
            <button type="button" data-action="delete">Delete</button>
        `;

        const rect = anchorButton.getBoundingClientRect();
        optionsMenu.style.left = `${rect.left + window.scrollX - 110}px`;
        optionsMenu.style.top = `${rect.bottom + window.scrollY + 6}px`;
        optionsMenu.style.display = "flex";
        optionsMenu.style.flexDirection = "column";
        optionsMenu.style.gap = "6px";

        optionsMenu.querySelector('[data-action="view"]').addEventListener("click", function () {
            closeOptionsMenu();
            openViewContents(storage);
        });

        optionsMenu.querySelector('[data-action="edit"]').addEventListener("click", function () {
            closeOptionsMenu();
            fillStorageForm(storage);
            openStorageModal();
        });

        optionsMenu.querySelector('[data-action="delete"]').addEventListener("click", function () {
            closeOptionsMenu();
            handleDeleteStorage(storage);
        });
    }

    async function fetchCardsForStorage(storage) {
        try {
            const response = await fetch(`${API_BASE}/getCards`);
            const result = await response.json();

            if (!response.ok || result.success === false) {
                throw new Error(result.error || "Failed to fetch cards");
            }

            const cards = Array.isArray(result.data?.cards) ? result.data.cards : [];

            return cards.filter(card =>
                String(card.storageLocation || "").trim().toLowerCase() ===
                String(storage.name || "").trim().toLowerCase()
            );
        } catch (error) {
            console.error("Error fetching cards for storage:", error);
            return [];
        }
    }

    function renderContentsList(cards) {
        miniTableBody.innerHTML = "";

        cards.forEach(card => {
            const tr = document.createElement("tr");

            const imgTd = document.createElement("td");
            const img = document.createElement("img");
            img.src = card.image || card.imageUrl || card.art || "../Images/card-back.png";
            img.alt = card.name || "Card";
            img.style.width = "60px";
            img.style.height = "84px";
            img.style.objectFit = "cover";
            imgTd.appendChild(img);

            tr.appendChild(imgTd);
            tr.appendChild(createCell(String(card.quantity || 1)));
            tr.appendChild(createCell(card.name));
            tr.appendChild(createCell(card.type));
            tr.appendChild(createCell(card.set));
            tr.appendChild(createCell(card.storage || card.storageName || card.storageLocation || ""));

            miniTableBody.appendChild(tr);
        });

        if (!cards.length) {
            const tr = document.createElement("tr");
            const td = document.createElement("td");
            td.colSpan = 6;
            td.textContent = "No cards found in this storage.";
            tr.appendChild(td);
            miniTableBody.appendChild(tr);
        }
    }

    function renderContentsImageGrid(cards) {
        contentsImageGrid.innerHTML = "";

        if (!cards.length) {
            const empty = document.createElement("div");
            empty.textContent = "No cards found in this storage.";
            contentsImageGrid.appendChild(empty);
            return;
        }

        cards.forEach(card => {
            const item = document.createElement("div");
            item.className = "image-card";
            item.style.display = "flex";
            item.style.flexDirection = "column";
            item.style.alignItems = "center";
            item.style.gap = "8px";
            item.style.padding = "10px";

            const img = document.createElement("img");
            img.src = card.image || card.imageUrl || card.art || "../Images/card-back.png";
            img.alt = card.name || "Card";
            img.style.width = "160px";
            img.style.height = "220px";
            img.style.objectFit = "cover";
            img.style.borderRadius = "10px";

            const name = document.createElement("div");
            name.textContent = `${card.name || "Unknown Card"} (${card.quantity || 1})`;
            name.style.textAlign = "center";

            item.appendChild(img);
            item.appendChild(name);
            contentsImageGrid.appendChild(item);
        });
    }

    function setContentsView(view) {
        currentContentsView = view;

        if (view === "list") {
            contentsListView.style.display = "block";
            contentsImageView.style.display = "none";
        } else {
            contentsListView.style.display = "none";
            contentsImageView.style.display = "block";
        }
    }

    async function openViewContents(storage) {
        currentContentsStorage = storage;
        contentsModalTitle.textContent = `${storage.name} Contents`;
        contentsModalSubtitle.textContent = `${storage.capacity || 0} capacity • ${storage.location || "No location"}`;

        currentContentsCards = await fetchCardsForStorage(storage);

        renderContentsList(currentContentsCards);
        renderContentsImageGrid(currentContentsCards);
        setContentsView(currentContentsView);
        openContentsModal();
    }

    document.addEventListener("click", function (event) {
        if (!optionsMenu.contains(event.target) && !event.target.classList.contains("options-button")) {
            closeOptionsMenu();
        }
    });

    window.addEventListener("click", function (event) {
        if (event.target === storageModal) {
            closeStorageModal();
        }
        if (event.target === contentsModal) {
            closeContentsModal();
        }
    });

    addStorageBtn.addEventListener("click", function () {
        clearStorageForm();
        openStorageModal();
    });

    closeStorageModalBtn.addEventListener("click", closeStorageModal);
    saveStorageBtn.addEventListener("click", handleSaveStorage);
    searchInput.addEventListener("input", filterAndRenderStorages);

    storagePresetSelect.addEventListener("change", syncPresetUi);

    closeContentsModalBtn.addEventListener("click", closeContentsModal);

    contentsListViewBtn.addEventListener("click", function () {
        setContentsView("list");
    });

    contentsImageViewBtn.addEventListener("click", function () {
        setContentsView("image");
    });

    clearStorageForm();
    fetchStorage();
});