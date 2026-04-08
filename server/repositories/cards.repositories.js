const { ObjectId } = require("mongodb");
const { connectDB } = require("../config/db");

async function getCardsCollection() {
    const db = await connectDB();
    return db.collection("Cards");
}

async function insertManyCards(cards) {
    const collection = await getCardsCollection();
    return collection.insertMany(cards, { ordered: false });
}

async function insertOneCard(card) {
    const collection = await getCardsCollection();
    return collection.insertOne(card);
}

async function findAllCards() {
    const collection = await getCardsCollection();
    return collection.find().sort({ updatedAt: -1 }).toArray();
}

async function findCardById(id) {
    const collection = await getCardsCollection();
    return collection.findOne({ _id: new ObjectId(id) });
}

async function findMatchingCardForStack(card) {
    const collection = await getCardsCollection();

    return collection.findOne({
        name: String(card.name || "").trim(),
        set: String(card.set || "").trim(),
        art: String(card.art || "").trim(),
        storageLocation: String(card.storageLocation || "").trim()
    });
}

async function updateCardById(id, updates) {
    const collection = await getCardsCollection();
    return collection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updates }
    );
}

async function deleteCardById(id) {
    const collection = await getCardsCollection();
    return collection.deleteOne({ _id: new ObjectId(id) });
}

module.exports = {
    insertManyCards,
    insertOneCard,
    findAllCards,
    findCardById,
    findMatchingCardForStack,
    updateCardById,
    deleteCardById
};