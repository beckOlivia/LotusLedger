const { MongoClient } = require('mongodb')
const uri = "mongodb+srv://LotusAdmin:Password123@lotusledger.swfam.mongodb.net/";
const dbName = 'LotusLedger';
const collectionName = 'Storage';
const { ObjectId } = require('mongodb'); 

async function connectMongo() {
    try {
        const client = new MongoClient(uri);
        await client.connect();
        console.log("Connected to MongoDB successfully");
        return client.db(dbName);
    } catch (error) {
        console.error("Error connecting to MongoDB:", error.message);
        throw new Error('Failed to connect to MongoDB: ' + error.message);
    }
}

const saveStorageToDatabase = async (storageData) => {
    console.log("Received storage data:", storageData);  // Check the data being passed
    if (!Array.isArray(storageData)) {
        throw new Error("Invalid data format. Expected an array of storage entries.");
    }

    const storage = storageData;  // Now clearly an array of storage entries
    try {
        const db = await connectMongo();
        const storageCollection = db.collection(collectionName);  // Get the correct collection

        const mappedStorage = storage.map(entry => ({
            name: entry.name,
            capacity: entry.capacity,
            location: entry.location,
            lastUpdated: new Date().toISOString()
        }));

        const result = await storageCollection.insertMany(mappedStorage);

        const savedStorage = await storageCollection.find({}).toArray();
        console.log("Inserted storage entries:", savedStorage);

        return savedStorage;
    } catch (error) {
        console.error('Error saving storage:', error);
        throw new Error('Error saving storage: ' + error.message);
    }
};

const addCardToStorage = async (storageData, cardData) => {
    if (!storageData || !cardData || !cardData._id) {
        throw new Error("Invalid data: storageData and cardData with _id are required.");
    }

    try {
        const db = await connectMongo();
        const cardsCollection = db.collection('Cards');

        // Convert the card ID to ObjectId
        const cardId = new ObjectId(cardData._id);

        console.log(`Updating card storage: Card ID: ${cardId}, Storage: ${JSON.stringify(storageData)}`);

        // Find the card by its ID and update its storage field
        const updatedCard = await cardsCollection.findOneAndUpdate(
            { _id: cardId },
            { $set: { storage: storageData } },
            { returnDocument: 'after' }
        );

        console.log("Result of findOneAndUpdate:", updatedCard);

        // Check if update was successful
        // The updated document is directly in updatedCard, not in updatedCard.value
        if (!updatedCard) {
            console.log(`Card update failed with ID: ${cardId}`);
            throw new Error(`Card with ID ${cardId} not found or update failed.`);
        }

        console.log(`Updated card: ${JSON.stringify(updatedCard)}`);

        // Return the updated card directly
        return updatedCard;
    } catch (error) {
        console.error('Error adding card to storage:', error);
        throw new Error('Error adding card to storage: ' + error.message);
    }
};





const getStorageFromDatabase = async () => {
    try {
        const db = await connectMongo();  // Connect to the LotusLedger database
        const storageCollection = db.collection(collectionName);  // Get the collection

        console.log("Querying the storage collection...");
        const storage = await storageCollection.find().toArray();  // Fetch all entries

        console.log("Fetched storage entries:", storage);
        return storage;  // Return the results from the database
    } catch (error) {
        console.error('Error fetching storage from database:', error.message);
        throw new Error('Error fetching storage entries from database: ' + error.message);
    }
};



module.exports = { saveStorageToDatabase, getStorageFromDatabase, addCardToStorage};
