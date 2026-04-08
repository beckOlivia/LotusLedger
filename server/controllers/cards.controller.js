const {
    saveCards,
    getAllCards,
    getCardImageById,
    editCard,
    removeCard,
    moveCardToStorage
} = require("../services/cards.service");

async function saveCardsHandler(req, res) {
    try {
        const cards = req.body.cards || [];
        const result = await saveCards(cards);
        res.json(result);
    } catch (error) {
        console.error("Failed to save cards:", error);
        res.status(500).json({ error: "Failed to save cards" });
    }
}

async function getCardsHandler(req, res) {
    try {
        const cards = await getAllCards();
        res.json({ data: { cards } });
    } catch (error) {
        console.error("Failed to fetch cards:", error);
        res.status(500).json({ error: "Failed to fetch cards" });
    }
}

async function getCardImageHandler(req, res) {
    try {
        const card = await getCardImageById(req.params.id);

        if (!card?.image?.data) {
            return res.status(404).send("No image");
        }

        res.set("Content-Type", card.image.contentType || "image/jpeg");
        res.send(card.image.data);
    } catch (error) {
        console.error("Failed to fetch card image:", error);
        res.status(500).json({ error: "Failed to fetch card image" });
    }
}

async function updateCardHandler(req, res) {
    try {
        const result = await editCard(req.params.id, req.body);
        res.json(result);
    } catch (error) {
        console.error("Failed to update card:", error);
        res.status(500).json({ error: "Failed to update card" });
    }
}

async function deleteCardHandler(req, res) {
    try {
        const result = await removeCard(req.params.id);
        res.json(result);
    } catch (error) {
        console.error("Failed to delete card:", error);
        res.status(500).json({ error: "Failed to delete card" });
    }
}

async function updateCardStorageHandler(req, res) {
    try {
        const { cardId, storageLocation, quantityToMove } = req.body || {};

        const result = await moveCardToStorage({
            cardId,
            storageLocation,
            quantityToMove
        });

        res.json({
            success: true,
            ...result
        });
    } catch (error) {
        console.error("Failed to update card storage:", error);
        res.status(400).json({
            success: false,
            error: error.message || "Failed to update card storage"
        });
    }
}

module.exports = {
    saveCardsHandler,
    getCardsHandler,
    getCardImageHandler,
    updateCardHandler,
    deleteCardHandler,
    updateCardStorageHandler
};