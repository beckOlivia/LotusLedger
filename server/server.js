const express = require('express');
const app = express();
const bodyParser = require('body-parser');  
const cors = require('cors');
const mongoose = require('mongoose');
app.use(cors());
app.use(express.json()); 

mongoose.connect('mongodb+srv://LotusAdmin:Password123@lotusledger.swfam.mongodb.net/', { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        console.log("MongoDB connected successfully");
    })
    .catch(err => {
        console.error("Error connecting to MongoDB", err);
    });

const { saveCardToDatabase, getCardFromDatabase } = require('./controllers/saveCardController'); // Ensure correct import
const { saveStorageToDatabase, getStorageFromDatabase, addCardToStorage } = require('./controllers/storageController');
const CardModel = require('./models/cards_model');  // Adjust path as necessary

const cardRoutes = require("./routes/cards");
app.use('/api/cards', cardRoutes);

app.use(bodyParser.json());


// Route to save cards to the database
app.post('/saveCards', async (req, res) => {
    try {
        const savedCards = await saveCardToDatabase(req.body);
        res.json({
            message: 'Card(s) saved successfully',
            result: savedCards  // Return the saved cards
        });
    } catch (error) {
        console.error('Error saving cards:', error);
        res.status(500).json({ error: 'Server error while saving cards.' });
    }
});

app.delete('/clearCards', async (req, res) => {
    try {
        const db = await connectMongo();  // Connect to the database
        const cardsCollection = db.collection('Cards');  // Get the Cards collection

        // Delete all documents in the Cards collection
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

// Route to get cards from the database
app.get('/getCards', async (req, res) => {
    try {
        console.log("Fetching cards from database...");
        const cards = await getCardFromDatabase();
        console.log("Fetched cards:", cards);
        res.status(200).json({ data: { cards } });
    } catch (error) {
        console.error("Error fetching cards:", error);
        res.status(500).json({ error: 'Error fetching cards', details: error.message });
    }
});


// Example route to export cards to CSV (this would trigger the export function)
app.get('/exportCards', async (req, res) => {
    try {
        await exportCardsToCSV();
        res.status(200).send('Export successful');
    } catch (error) {
        res.status(500).send('Error exporting cards: ' + error.message);
    }
});

// Start the server
const port = 3000;
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
// Assuming you're using Express.js
app.post('/getCardsByIds', async (req, res) => {
    try {
        const { ids } = req.body;
        if (!ids || !Array.isArray(ids)) {
            return res.status(400).json({ error: 'Invalid IDs array' });
        }

        // Fetch cards from the database using the provided IDs
        const cards = await Card.find({ '_id': { $in: ids } });

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

app.post('/saveStorage', async (req, res) => {
    try {
        const { storageData } = req.body;
        console.log("Received storage data:", storageData);  // Log received data for debugging
        
        if (!storageData || !Array.isArray(storageData) || storageData.length === 0) {
            throw new Error("Invalid storage data: Data must be a non-empty array");
        }

        // Validate each storage entry
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

app.get('/getStorage', async (req, res) => {
    try {
        // Fetch the storage entries from the database or in-memory storage
        const storageEntries = await getStorageFromDatabase();
        res.status(200).json({ result: storageEntries });
    } catch (error) {
        console.error('Error fetching storage entries:', error);
        res.status(500).json({ error: 'Server error while fetching storage entries.' });
    }
});
app.get("/getPartialCardData", async (req, res) => {
    try {
        const cards = await CardModel.find({}, "quantity name set art");
        res.json({ result: cards }); // Return data under 'result' key
    } catch (error) {
        console.error("Error fetching card data:", error);
        res.status(500).json({ error: "Failed to fetch card data" });
    }
});

app.put('/updateCardStorage', async (req, res) => {
    const { cardId, storageLocation } = req.body;

    if (!cardId || !storageLocation) {
        return res.status(400).json({ message: 'Card ID and Storage Location are required.' });
    }

    try {
        console.log('Updating card storage:', { cardId, storageLocation });
        
        // Call the addCardToStorage function with proper data
        // Update the storageData object to match the expected format in addCardToStorage function
        const storageData = { location: storageLocation };  // Adjusting storage format to match expected argument
        const updatedCard = await addCardToStorage(storageData, { _id: cardId });
        
        return res.status(200).json(updatedCard);  // Return the updated card to the client
    } catch (error) {
        console.error('Error updating card storage:', error.message);  // Log the exact error message
        return res.status(500).json({ message: 'Error updating card storage', error: error.message });
    }
});




app.use(cors({
    origin: 'http://127.0.0.1:5500', // Allow frontend requests
    methods: ['GET', 'POST', 'DELETE'], // Allow necessary HTTP methods
    allowedHeaders: ['Content-Type'] // Allow necessary headers
}));

