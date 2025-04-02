const mongoose = require('mongoose');

const cardSchema = new mongoose.Schema({
    quantity: String,
    name: String,
    type: String,  // Ensure 'type' is a defined field
    cost: String,
    colors: String,
    set: String,
    art: String,
    storage: String,
    lastUpdated: Date
});

const CardModel = mongoose.model('Card', cardSchema);

module.exports = { CardModel };
