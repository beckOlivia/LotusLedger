import { state } from "../library/state.js";
import { moveCardToStorage } from "../api/cardsApi.js";

async function loadStorageDropdown() {
    try {
        const response = await fetch("http://localhost:3000/getStorages");

        if (!response.ok) {
            throw new Error("Failed to load storage locations.");
        }

        const result = await response.json();
        const storages = result.data?.storages || [];

        const storageSelect = document.getElementById("storageNameInput");
        if (!storageSelect) return;

        storageSelect.innerHTML = `<option value="">Select a storage location</option>`;

        storages.forEach(storage => {
            const option = document.createElement("option");
            option.value = storage.name || "";
            option.textContent = storage.name || "";
            storageSelect.appendChild(option);
        });
    } catch (error) {
        console.error("Error loading storage dropdown:", error);
    }
}

export async function openStorageModal(card) {
    state.selectedCard = card;

    const modal = document.getElementById("storageModal");
    const quantityInput = document.getElementById("storageQuantityInput");
    const currentQuantityText = document.getElementById("storageCurrentQuantity");

    await loadStorageDropdown();

    const storageSelect = document.getElementById("storageNameInput");
    if (storageSelect) {
        storageSelect.value = "";
    }

    if (quantityInput) {
        quantityInput.value = 1;
        quantityInput.max = card.quantity || 1;
    }

    if (currentQuantityText) {
        currentQuantityText.textContent = `Current Quantity: ${card.quantity || 0}`;
    }

    if (modal) {
        modal.style.display = "block";
    }
}

export async function saveStorageChanges(reloadCards) {
    try {
        if (!state.selectedCard?._id) {
            alert("This card cannot be updated because it has no database ID.");
            return;
        }

        const newStorage = document.getElementById("storageNameInput")?.value || "";
        const moveQuantity = parseInt(document.getElementById("storageQuantityInput")?.value, 10);
        const currentQuantity = parseInt(state.selectedCard.quantity, 10) || 0;

        if (!newStorage.trim()) {
            alert("Please select a storage location.");
            return;
        }

        if (Number.isNaN(moveQuantity) || moveQuantity < 1) {
            alert("Please enter a valid quantity.");
            return;
        }

        if (moveQuantity > currentQuantity) {
            alert("Quantity cannot exceed the number of cards saved.");
            return;
        }

        await moveCardToStorage({
            cardId: state.selectedCard._id,
            storageLocation: newStorage.trim(),
            quantityToMove: moveQuantity
        });

        const modal = document.getElementById("storageModal");
        if (modal) {
            modal.style.display = "none";
        }

        state.selectedCard = null;
        await reloadCards();
    } catch (error) {
        console.error("Error saving storage:", error);
        alert(error.message || "Storage update failed.");
    }
}

export function bindStorageModal(reloadCards) {
    document.getElementById("btnSaveStorage")?.addEventListener("click", () => {
        saveStorageChanges(reloadCards);
    });

    document.getElementById("btnCancelStorage")?.addEventListener("click", () => {
        const modal = document.getElementById("storageModal");
        if (modal) {
            modal.style.display = "none";
        }
        state.selectedCard = null;
    });
}