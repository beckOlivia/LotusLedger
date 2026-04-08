const express = require("express");
const router = express.Router();

const {
    saveCardsHandler,
    getCardsHandler,
    getCardImageHandler,
    updateCardHandler,
    deleteCardHandler,
    updateCardStorageHandler
} = require("../controllers/cards.controller");

router.post("/saveCards", saveCardsHandler);
router.get("/getCards", getCardsHandler);
router.get("/cardImage/:id", getCardImageHandler);
router.put("/updateCard/:id", updateCardHandler);
router.put("/updateCardStorage", updateCardStorageHandler);
router.delete("/deleteCard/:id", deleteCardHandler);

module.exports = router;