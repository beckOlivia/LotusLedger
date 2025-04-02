const { MongoClient } = require('mongodb');
const uri = "mongodb+srv://LotusAdmin:240amasS@lotusledger.swfam.mongodb.net/";
const dbName = 'LotusLedger';
const collectionName = 'Cards';

// MongoDB connection function
async function connectMongo() {
    try {
        const client = new MongoClient(uri);
        await client.connect();
        console.log("Connected");
        return client.db(dbName);
    } catch (error) {
        console.error("Connection error:", error);
        throw error;
    }
    
}

// Function to save cards to the database
const saveCardToDatabase = async (cardData) => {
    const { cards } = cardData;  // Get cards array from the request data
    try {
        const db = await connectMongo();  // Connect to the LotusLedger database
        const cardsCollection = db.collection('Cards');  // Get the Cards collection

        // Map the cards to only include the required fields
        const mappedCards = cards.map(card => ({
            quantity: card.quantity,
            name: card.name,
            type: card.type,
            set: card.set,
            art: card.art
        }));

        const result = await cardsCollection.insertMany(mappedCards);  // Insert the cards into the database

        // Fetch the inserted cards to return them (or just confirm success)
        const savedCards = await cardsCollection.find({}).toArray();
        return savedCards;  // Return the saved cards (this can be used in displayCards)
    } catch (error) {
        throw new Error('Error saving cards: ' + error.message);  // Throw error if the insert fails
    }
};



// Function to get cards from the database
const getCardFromDatabase = async () => {
    try {
        const db = await connectMongo();  // Connect to the LotusLedger database
        // Query the database for cards and project only the required fields
        const cardsCollection = db.collection(collectionName);
        const cards = await cardsCollection.find({}, { projection: { quantity: 1, name: 1, set: 1, art: 1 } }).toArray();
         return cards;  // Return the cards as an array
    } catch (error) {
        console.error('Error fetching cards from DB:', error);
        throw error;
    }
};




module.exports = { saveCardToDatabase, getCardFromDatabase };
