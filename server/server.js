const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { ObjectId } = require('mongodb');
const { connectDB } = require('./db');
const {
    saveCardToDatabase,
    getCardFromDatabase
} = require('./controllers/saveCardController');
const {
    saveStorageToDatabase,
    getStorageFromDatabase,
    addCardToStorage
} = require('./controllers/storageController');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
    origin: 'http://127.0.0.1:5500',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type']
}));

app.use(express.json());
app.use(cors({
    origin: 'http://127.0.0.1:5500',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type']
}));

const cardRoutes = require('./routes/cards');
app.use('/api/cards', cardRoutes);
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
// Route to save cards to the database
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});
app.post('/saveCards', async (req, res) => {
    try {
        const result = await saveCardToDatabase(req.body);

        res.json({
            message: 'Card(s) saved successfully',
            success: true,
            insertedIds: result.insertedIds
        });
    } catch (error) {
        console.error('Error saving cards:', error);
        res.status(500).json({ error: 'Server error while saving cards.' });
    }
});

// Route to clear all cards
app.delete('/clearCards', async (req, res) => {
    try {
        const db = await connectDB();
        const cardsCollection = db.collection('Cards');

        const result = await cardsCollection.deleteMany({});

        if (result.deletedCount > 0) {
            res.status(200).json({ message: `${result.deletedCount} cards deleted successfully.` });
        } else {
            res.status(404).json({ message: 'No cards found to delete.' });
        }
    } catch (error) {
        console.error('Error deleting cards:', error);
        res.status(500).json({ error: 'Server error while deleting cards.' });
    }
});

// Route to get all cards
app.get('/getCards', async (req, res) => {
    try {
        console.log('Fetching cards from database...');
        const cards = await getCardFromDatabase();
        console.log('Fetched cards:', cards);

        res.status(200).json({ data: { cards } });
    } catch (error) {
        console.error('Error fetching cards:', error);
        res.status(500).json({ error: 'Error fetching cards', details: error.message });
    }
});

// Route to get cards by IDs
app.post('/getCardsByIds', async (req, res) => {
    try {
        const { ids } = req.body;

        if (!ids || !Array.isArray(ids)) {
            return res.status(400).json({ error: 'Invalid IDs array' });
        }

        const db = await connectDB();
        const cardsCollection = db.collection('Cards');

        const objectIds = ids.map(id => new ObjectId(id));
        const cards = await cardsCollection.find({ _id: { $in: objectIds } }).toArray();

        if (cards.length > 0) {
            res.json(cards);
        } else {
            res.status(404).json({ error: 'No cards found for the provided IDs' });
        }
    } catch (err) {
        console.error('Error fetching card details:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Route to save storage
app.post('/saveStorage', async (req, res) => {
    try {
        const { storageData } = req.body;
        console.log('Received storage data:', storageData);

        if (!storageData || !Array.isArray(storageData) || storageData.length === 0) {
            throw new Error('Invalid storage data: Data must be a non-empty array');
        }

        storageData.forEach(entry => {
            if (!entry.name || !entry.capacity || !entry.location) {
                throw new Error("Invalid storage entry: 'name', 'capacity', and 'location' are required");
            }
        });

        const savedStorage = await saveStorageToDatabase(storageData);

        res.status(200).json({
            message: 'Storage entries saved successfully',
            result: savedStorage
        });
    } catch (err) {
        console.error('Error saving storage:', err);
        res.status(500).json({ error: 'Server error while saving storage.', details: err.message });
    }
});

// Route to get storage
app.get('/getStorage', async (req, res) => {
    try {
        const storageEntries = await getStorageFromDatabase();
        res.status(200).json({ result: storageEntries });
    } catch (error) {
        console.error('Error fetching storage entries:', error);
        res.status(500).json({ error: 'Server error while fetching storage entries.' });
    }
});

app.get('/cardData', async (req, res) => {
    try {
        const { name } = req.query;

        if (!name) {
            return res.status(400).json({ error: 'Card name is required' });
        }

        const response = await fetch(
            `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(name)}`
        );

        if (!response.ok) {
            return res.status(response.status).json({
                error: 'Failed to fetch from Scryfall'
            });
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Error fetching Scryfall data:', error);
        res.status(500).json({ error: 'Server error fetching card data' });
    }
});

// Route to get partial card data
app.get('/getPartialCardData', async (req, res) => {
    try {
        const db = await connectDB();
        const cardsCollection = db.collection('Cards');

        const cards = await cardsCollection
            .find({}, { projection: { quantity: 1, name: 1, set: 1, art: 1 } })
            .toArray();

        res.json({ result: cards });
    } catch (error) {
        console.error('Error fetching card data:', error);
        res.status(500).json({ error: 'Failed to fetch card data' });
    }
});

// Route to update card storage
app.put('/updateCardStorage', async (req, res) => {
    const { cardId, storageLocation } = req.body;

    if (!cardId || !storageLocation) {
        return res.status(400).json({ message: 'Card ID and Storage Location are required.' });
    }

    try {
        console.log('Updating card storage:', { cardId, storageLocation });

        const storageData = { location: storageLocation };
        const updatedCard = await addCardToStorage(storageData, { _id: cardId });

        return res.status(200).json(updatedCard);
    } catch (error) {
        console.error('Error updating card storage:', error.message);
        return res.status(500).json({ message: 'Error updating card storage', error: error.message });
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