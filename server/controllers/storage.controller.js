const {
    getAllStorages,
    saveStorage,
    saveStorages,
    editStorage,
    removeStorage
} = require("../services/storage.service");

async function getStoragesHandler(req, res) {
    try {
        const storages = await getAllStorages();

        res.json({
            success: true,
            data: { storages }
        });
    } catch (error) {
        console.error("Failed to fetch storages:", error);
        res.status(500).json({
            success: false,
            error: "Failed to fetch storages"
        });
    }
}

async function saveStorageHandler(req, res) {
    try {
        const storageData = req.body || {};
        const result = await saveStorage(storageData);

        res.json({
            success: true,
            ...result
        });
    } catch (error) {
        console.error("Failed to save storage:", error);
        res.status(400).json({
            success: false,
            error: error.message || "Failed to save storage"
        });
    }
}

async function saveStoragesHandler(req, res) {
    try {
        const storages = Array.isArray(req.body?.storages) ? req.body.storages : [];
        const result = await saveStorages(storages);

        res.json({
            success: true,
            ...result
        });
    } catch (error) {
        console.error("Failed to save storages:", error);
        res.status(500).json({
            success: false,
            error: "Failed to save storages"
        });
    }
}

async function updateStorageHandler(req, res) {
    try {
        const storageId = req.params.id;
        const updates = req.body || {};

        const result = await editStorage(storageId, updates);

        res.json({
            success: true,
            ...result
        });
    } catch (error) {
        console.error("Failed to update storage:", error);
        res.status(500).json({
            success: false,
            error: "Failed to update storage"
        });
    }
}

async function deleteStorageHandler(req, res) {
    try {
        const storageId = req.params.id;
        const result = await removeStorage(storageId);

        res.json({
            success: true,
            ...result
        });
    } catch (error) {
        console.error("Failed to delete storage:", error);
        res.status(500).json({
            success: false,
            error: "Failed to delete storage"
        });
    }
}

module.exports = {
    getStoragesHandler,
    saveStorageHandler,
    saveStoragesHandler,
    updateStorageHandler,
    deleteStorageHandler
};