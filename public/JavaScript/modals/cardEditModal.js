import { state } from "../library/state.js";
import { updateCard } from "../api/cardsApi.js";

export function openEditModal(card) {
    state.selectedCard = card;
    document.getElementById("editQuantity").value = card.quantity || 1;
    document.getElementById("editStorage").value = card.storage || card.storageLocation || "";
    document.getElementById("editArt").value = card.art || "";
    document.getElementById("editModal").style.display = "block";
}

export async function saveEditChanges(reloadCards) {
    try {
        if (!state.selectedCard?._id) {
            alert("This card cannot be edited because it has no database ID.");
            return;
        }

        const updatedCard = {
            quantity: document.getElementById("editQuantity").value,
            storage: document.getElementById("editStorage").value,
            storageLocation: document.getElementById("editStorage").value,
            art: document.getElementById("editArt").value
        };

        await updateCard(state.selectedCard._id, updatedCard);

        document.getElementById("editModal").style.display = "none";
        state.selectedCard = null;
        await reloadCards();
    } catch (error) {
        console.error("Error updating card:", error);
        alert("Edit failed.");
    }
}

export function bindEditModal(reloadCards) {
    document.getElementById("saveEditButton")?.addEventListener("click", () => saveEditChanges(reloadCards));
    document.getElementById("closeEditModal")?.addEventListener("click", () => {
        document.getElementById("editModal").style.display = "none";
    });
}