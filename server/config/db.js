const { MongoClient } = require("mongodb");

const uri = process.env.MONGO_URI;
const dbName = "LotusLedger";

let client;
let db;

async function connectDB() {
    if (db) return db;

    client = new MongoClient(uri);
    await client.connect();
    db = client.db(dbName);
    console.log("Connected to MongoDB");
    return db;
}

module.exports = {
    connectDB
};