const { ObjectId } = require("mongodb");
const { connectDB } = require("../config/db");

async function getStoragesCollection() {
    const db = await connectDB();
    return db.collection("Storages");
}

async function findAllStorages() {
    const collection = await getStoragesCollection();
    return collection.find().sort({ name: 1 }).toArray();
}

async function insertOneStorage(storage) {
    const collection = await getStoragesCollection();
    return collection.insertOne(storage);
}

async function insertManyStorages(storages) {
    const collection = await getStoragesCollection();
    return collection.insertMany(storages);
}

async function findStorageById(id) {
    const collection = await getStoragesCollection();
    return collection.findOne({ _id: new ObjectId(id) });
}

async function findStorageByName(name) {
    const collection = await getStoragesCollection();
    return collection.findOne({
        name: { $regex: `^${String(name).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" }
    });
}

async function updateStorageById(id, updates) {
    const collection = await getStoragesCollection();
    return collection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updates }
    );
}

async function deleteStorageById(id) {
    const collection = await getStoragesCollection();
    return collection.deleteOne({ _id: new ObjectId(id) });
}

module.exports = {
    findAllStorages,
    insertOneStorage,
    insertManyStorages,
    findStorageById,
    findStorageByName,
    updateStorageById,
    deleteStorageById
};