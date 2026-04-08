const mongoose = require("mongoose");
const { Schema } = mongoose;

const cardSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            index: true
        },

        nameLower: {
            type: String,
            default: "",
            index: true
        },

        quantity: {
            type: Number,
            default: 1,
            min: 0
        },

        storageLocation: {
            type: String,
            default: "",
            trim: true,
            index: true
        },

        set: {
            type: String,
            default: "",
            trim: true,
            index: true
        },

        setName: {
            type: String,
            default: "",
            trim: true
        },

        collectorNumber: {
            type: String,
            default: "",
            trim: true
        },

        typeLine: {
            type: String,
            default: "",
            trim: true,
            index: true
        },

        manaCost: {
            type: String,
            default: "",
            trim: true
        },

        cmc: {
            type: Number,
            default: 0
        },

        colors: {
            type: [String],
            default: []
        },

        colorIdentity: {
            type: [String],
            default: []
        },

        rarity: {
            type: String,
            default: "",
            trim: true,
            index: true
        },

        artist: {
            type: String,
            default: "",
            trim: true
        },

        oracleText: {
            type: String,
            default: ""
        },

        scryfallId: {
            type: String,
            default: "",
            trim: true,
            index: true
        },

        imageUrl: {
            type: String,
            default: "",
            trim: true
        },
        
        art: {
            type: String,
            default: "",
            trim: true
        }
        
    },
    {
        timestamps: true
    }
);

cardSchema.index({
    name: "text",
    set: "text",
    setName: "text",
    typeLine: "text",
    oracleText: "text",
    artist: "text"
});

cardSchema.pre("save", function (next) {
    this.nameLower = this.name ? this.name.toLowerCase() : "";
    next();
});

module.exports = mongoose.model("Card", cardSchema);