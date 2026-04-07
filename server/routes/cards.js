const mongoose = require('mongoose');
const express = require('express');
const router = express.Router();
const CardModel = require('../models/cards_model');

router.get("/getPartialCardData", async (req, res) => {
    try {
        console.log("Connecting to the database...");
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Database connected successfully");

        const cards = await CardModel.find({}, "art name quantity set");
        console.log("Fetched cards:", cards);
        res.json({ result: cards });
    } catch (error) {
        console.error("Error fetching card data:", error);
        res.status(500).json({ error: "Failed to fetch card data" });
    }
});

router.put("/updateCard/:id", async (req, res) => {
    try {
        console.log("UPDATE HIT:", req.params.id, req.body);

        const updatedCard = await CardModel.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );

        if (!updatedCard) {
            return res.status(404).json({ error: "Card not found" });
        }

        res.json(updatedCard);
    } catch (error) {
        console.error("Update error:", error);
        res.status(500).json({ error: "Failed to update card" });
    }
});

router.put("/updateCardStorage", async (req, res) => {
    const { cardId, storageLocation } = req.body;

    if (!cardId || !storageLocation) {
        return res.status(400).json({ error: 'Card ID and storage location are required' });
    }

    try {
        const updatedCard = await CardModel.findByIdAndUpdate(
            cardId,
            { storage: storageLocation },
            { new: true }
        );

        if (!updatedCard) {
            return res.status(404).json({ error: 'Card not found' });
        }

        res.json(updatedCard);
    } catch (error) {
        console.error('Error updating card storage:', error);
        res.status(500).json({ error: 'Failed to update card storage' });
    }
});

module.exports = router;