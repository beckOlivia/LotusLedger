const express = require("express");
const router = express.Router();

const {
    getStoragesHandler,
    saveStorageHandler,
    saveStoragesHandler,
    updateStorageHandler,
    deleteStorageHandler
} = require("../controllers/storage.controller");

router.get("/getStorages", getStoragesHandler);
router.post("/saveStorage", saveStorageHandler);
router.post("/saveStorages", saveStoragesHandler);
router.put("/updateStorage/:id", updateStorageHandler);
router.delete("/deleteStorage/:id", deleteStorageHandler);

module.exports = router;