// routes/cards.js
const mongoose = require('mongoose');
const express = require('express');
const router = express.Router();
const CardModel = require('../models/cards_model');  // Import the card model

// Define the route

router.get("/getPartialCardData", async (req, res) => {
    try {
        console.log("Connecting to the database...");
        await mongoose.connect('mongodb+srv://LotusAdmin:Password123@lotusledger.swfam.mongodb.net/');
        console.log("Database connected successfully");

        const cards = await CardModel.find({}, "art name quantity set"); // Select only needed fields
        console.log("Fetched cards:", cards);
        res.json({ result: cards });
    } catch (error) {
        console.error("Error fetching card data:", error);
        res.status(500).json({ error: "Failed to fetch card data" });
   
    }
});

// routes/cards.js

router.put("/updateCardStorage", async (req, res) => {
    const { cardId, storageLocation } = req.body;

    if (!cardId || !storageLocation) {
        return res.status(400).json({ error: 'Card ID and storage location are required' });
    }

    try {
        const updatedCard = await CardModel.findByIdAndUpdate(
            cardId,
            { storage: storageLocation },  // Update the storage field
            { new: true }  // Return the updated card
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
