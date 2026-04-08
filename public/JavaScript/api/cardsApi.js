export async function fetchAllCards() {
    const response = await fetch("http://localhost:3000/getCards");

    if (!response.ok) {
        throw new Error(`Failed to fetch cards: ${response.status}`);
    }

    const savedCards = await response.json();

    if (Array.isArray(savedCards)) return savedCards;
    if (savedCards?.data?.cards && Array.isArray(savedCards.data.cards)) {
        return savedCards.data.cards;
    }

    return [];
}

export async function saveCards(cardsToSave) {
    const response = await fetch("http://localhost:3000/saveCards", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ cards: cardsToSave })
    });

    const result = await response.json().catch(() => null);

    if (!response.ok) {
        throw new Error(result?.error || `Failed to save cards: ${response.status}`);
    }

    return result;
}

export async function updateCard(cardId, updatedCard) {
    const response = await fetch(`http://localhost:3000/updateCard/${cardId}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(updatedCard)
    });

    if (!response.ok) {
        throw new Error("Failed to update card");
    }

    return response.json();
}

export async function deleteCardById(cardId) {
    const response = await fetch(`http://localhost:3000/deleteCard/${cardId}`, {
        method: "DELETE"
    });

    if (!response.ok) {
        throw new Error("Failed to delete card");
    }

    return response.json();
}

export async function moveCardToStorage(payload) {
    const response = await fetch("http://localhost:3000/updateCardStorage", {
        method: "PUT",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    });

    const result = await response.json().catch(() => null);

    if (!response.ok) {
        throw new Error(result?.error || "Failed to move card to storage");
    }

    return result;
}