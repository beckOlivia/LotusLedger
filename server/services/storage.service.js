const {
    findAllStorages,
    insertOneStorage,
    insertManyStorages,
    findStorageById,
    findStorageByName,
    updateStorageById,
    deleteStorageById
} = require("../repositories/storage.repositories");

function normalizeStorage(storage = {}) {
    const now = new Date();

    return {
        name: String(storage.name || "").trim(),
        capacity: Number(storage.capacity || 0),
        location: String(storage.location || "").trim(),
        type: String(storage.type || "").trim(),
        notes: String(storage.notes || "").trim(),
        createdAt: storage.createdAt || now,
        updatedAt: now
    };
}

async function getAllStorages() {
    return findAllStorages();
}

async function saveStorage(storage) {
    const normalized = normalizeStorage(storage);

    if (!normalized.name) {
        throw new Error("Storage name is required.");
    }

    const existing = await findStorageByName(normalized.name);
    if (existing) {
        return { success: true, existing: true, storage: existing };
    }

    const result = await insertOneStorage(normalized);
    return { success: true, insertedId: result.insertedId };
}

async function saveStorages(storages = []) {
    const valid = storages
        .map(normalizeStorage)
        .filter(storage => storage.name);

    if (!valid.length) {
        return { success: true, insertedCount: 0 };
    }

    const deduped = [];
    const seen = new Set();

    for (const storage of valid) {
        const key = storage.name.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);

        const existing = await findStorageByName(storage.name);
        if (!existing) {
            deduped.push(storage);
        }
    }

    if (!deduped.length) {
        return { success: true, insertedCount: 0 };
    }

    const result = await insertManyStorages(deduped);
    return {
        success: true,
        insertedCount: Object.keys(result.insertedIds).length
    };
}

async function editStorage(id, updates) {
    await updateStorageById(id, {
        ...updates,
        updatedAt: new Date()
    });

    return { success: true };
}

async function removeStorage(id) {
    await deleteStorageById(id);
    return { success: true };
}

async function getStorageById(id) {
    return findStorageById(id);
}

module.exports = {
    getAllStorages,
    saveStorage,
    saveStorages,
    editStorage,
    removeStorage,
    getStorageById
};