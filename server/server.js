const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { ObjectId } = require('mongodb');
const axios = require("axios");
const { connectDB } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// -------------------- HELPERS --------------------

async function fetchScryfallCard(name, set) {
    try {
        if (set) {
            const res = await axios.get(
                `https://api.scryfall.com/cards/search?q=${encodeURIComponent(`!"${name}" set:${set}`)}`
            );
            return res.data.data?.[0];
        } else {
            const res = await axios.get(
                `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(name)}`
            );
            return res.data;
        }
    } catch {
        return null;
    }
}

async function fetchImageBuffer(url) {
    if (!url) return null;

    const response = await axios.get(url, { responseType: 'arraybuffer' });

    return {
        data: Buffer.from(response.data),
        contentType: response.headers['content-type'] || 'image/jpeg',
        sourceUrl: url
    };
}

// -------------------- SAVE CARDS --------------------

// helper
async function getCardImage(scryfall) {
    const imageUrl =
        scryfall?.image_uris?.png ||   // BEST QUALITY
        scryfall?.image_uris?.large ||
        scryfall?.image_uris?.normal ||
        scryfall?.card_faces?.[0]?.image_uris?.png ||
        scryfall?.card_faces?.[0]?.image_uris?.large ||
        scryfall?.card_faces?.[0]?.image_uris?.normal ||
        null;

    if (!imageUrl) return null;

    try {
        const response = await axios.get(imageUrl, {
            responseType: "arraybuffer"
        });

        return {
            data: Buffer.from(response.data),
            contentType: response.headers["content-type"] || "image/png",
            sourceUrl: imageUrl
        };
    } catch (err) {
        console.error("Image download failed:", err.message);
        return null;
    }
}

app.post('/saveCards', async (req, res) => {
    try {
        const db = await connectDB();
        const collection = db.collection('Cards');

        const cards = req.body.cards || [];
        const enrichedCards = [];

        for (const card of cards) {
            const scryfall = await fetchScryfallCard(card.name, card.set);

// 🔥 GET IMAGE
const image = await getCardImage(scryfall);

enrichedCards.push({
                ...card,

                // 🔥 STORE EVERYTHING
                typeLine: scryfall?.type_line || "",
                manaCost: scryfall?.mana_cost || "",
                cmc: scryfall?.cmc || 0,
                oracleText: scryfall?.oracle_text || "",
                flavorText: scryfall?.flavor_text || "",
                colors: scryfall?.colors || [],
                colorIdentity: scryfall?.color_identity || [],
                rarity: scryfall?.rarity || "",
                artist: scryfall?.artist || "",
                setName: scryfall?.set_name || "",

                // IDs
                scryfallId: scryfall?.id || "",
                oracleId: scryfall?.oracle_id || "",

                // 🔥 IMAGE URLS (backup)
                imageUris: scryfall?.image_uris || {},

                // 🔥 ACTUAL IMAGE (THIS IS THE IMPORTANT PART)
                image: image
            });
        }

        const result = await collection.insertMany(enrichedCards);

        res.json({
            success: true,
            insertedIds: result.insertedIds
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to save cards" });
    }
});

// -------------------- GET CARDS --------------------

app.get('/getCards', async (req, res) => {
    const db = await connectDB();
    const cards = await db.collection('Cards').find().toArray();

    const cardsWithImage = cards.map(c => ({
        ...c,
        imageUrl: `/cardImage/${c._id}`
    }));

    res.json({ data: { cards: cardsWithImage } });
});

// -------------------- IMAGE ROUTE --------------------

app.get('/cardImage/:id', async (req, res) => {
    const db = await connectDB();
    const card = await db.collection('Cards').findOne({
        _id: new ObjectId(req.params.id)
    });

    if (!card?.image?.data) {
        return res.status(404).send("No image");
    }

    res.set('Content-Type', card.image.contentType || 'image/jpeg');
    res.send(card.image.data);
});

// -------------------- UPDATE --------------------

app.put('/updateCard/:id', async (req, res) => {
    const db = await connectDB();

    await db.collection('Cards').updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: req.body }
    );

    res.json({ success: true });
});

// -------------------- DELETE --------------------

app.delete('/deleteCard/:id', async (req, res) => {
    const db = await connectDB();

    await db.collection('Cards').deleteOne({
        _id: new ObjectId(req.params.id)
    });

    res.json({ success: true });
});

// --------------------
// Storage

app.post('/moveCardToStorage', async (req, res) => {
    try {
        const { cardId, storageLocation, quantityToMove } = req.body;

        if (!cardId || !storageLocation) {
            return res.status(400).json({ error: 'cardId and storageLocation are required.' });
        }

        const qtyToMove = parseInt(quantityToMove, 10);

        if (Number.isNaN(qtyToMove) || qtyToMove < 1) {
            return res.status(400).json({ error: 'quantityToMove must be at least 1.' });
        }

        const db = await connectDB();
        const cardsCollection = db.collection('Cards');

        const originalCard = await cardsCollection.findOne({ _id: new ObjectId(cardId) });

        if (!originalCard) {
            return res.status(404).json({ error: 'Card not found.' });
        }

        const originalQty = parseInt(originalCard.quantity, 10) || 0;

        if (qtyToMove > originalQty) {
            return res.status(400).json({ error: 'quantityToMove cannot exceed saved quantity.' });
        }

        // If moving all copies, just update the existing row
        if (qtyToMove === originalQty) {
            await cardsCollection.updateOne(
                { _id: new ObjectId(cardId) },
                {
                    $set: {
                        storage: storageLocation,
                        storageLocation: storageLocation
                    }
                }
            );

            return res.status(200).json({
                success: true,
                message: 'Moved entire card row to new storage.'
            });
        }

        // Otherwise split into a new row
        const newCard = {
            ...originalCard,
            _id: new ObjectId(),
            quantity: String(qtyToMove),
            storage: storageLocation,
            storageLocation: storageLocation
        };

        await cardsCollection.insertOne(newCard);

        await cardsCollection.updateOne(
            { _id: new ObjectId(cardId) },
            {
                $set: {
                    quantity: String(originalQty - qtyToMove)
                }
            }
        );

        return res.status(200).json({
            success: true,
            message: 'Card quantity split into a new storage row.'
        });
    } catch (error) {
        console.error('Error moving card to storage:', error);
        return res.status(500).json({ error: 'Failed to move card to storage.' });
    }
});

connectDB()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
        });
    })
    .catch(err => {
        console.error('Failed to connect to MongoDB', err);
    });