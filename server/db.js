const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGO_URI;
const dbName = 'LotusLedger';

let client;
let db;

async function connectDB() {
    if (!uri) {
        throw new Error("MONGO_URI is not defined in .env");
    }

    if (db) return db;

    try {
        client = new MongoClient(uri);
        await client.connect();

        db = client.db(dbName);

        console.log("✅ Connected to MongoDB");
        return db;
    } catch (error) {
        console.error("❌ MongoDB connection failed:", error);
        throw error;
    }
}

module.exports = { connectDB };