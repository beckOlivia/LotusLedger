const mongoose = require("mongoose");

const cardSchema = new mongoose.Schema(
  {
    // app / collection data
    quantity: {
      type: Number,
      default: 1,
      min: 0,
    },
    storageLocation: {
      type: String,
      default: "",
      trim: true,
    },
    notes: {
      type: String,
      default: "",
      trim: true,
    },

    // core card identity
    name: {
      type: String,
      required: true,
      trim: true,
    },
    nameLower: {
      type: String,
      index: true,
    },

    set: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },
    setName: {
      type: String,
      default: "",
      trim: true,
    },

    collectorNumber: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },

    // search/display fields from Scryfall
    manaCost: {
      type: String,
      default: "",
    },
    cmc: {
      type: Number,
      default: 0,
    },
    typeLine: {
      type: String,
      default: "",
      index: true,
    },
    oracleText: {
      type: String,
      default: "",
    },
    colors: {
      type: [String],
      default: [],
    },
    colorIdentity: {
      type: [String],
      default: [],
    },
    rarity: {
      type: String,
      default: "",
      index: true,
    },
    artist: {
      type: String,
      default: "",
      trim: true,
    },
    finish: {
      type: String,
      default: "",
      trim: true,
    },

    // keep ids so you can update/re-sync later
    scryfallId: {
      type: String,
      default: "",
      index: true,
    },
    oracleId: {
      type: String,
      default: "",
      index: true,
    },

    // image urls from Scryfall
    imageUris: {
      small: { type: String, default: "" },
      normal: { type: String, default: "" },
      large: { type: String, default: "" },
      png: { type: String, default: "" },
      art_crop: { type: String, default: "" },
      border_crop: { type: String, default: "" },
    },

    // actual image stored in MongoDB
    image: {
      data: Buffer,
      contentType: String,
      sourceUrl: String,
      fileName: String,
    },

    // optional art field if your frontend already expects it
    art: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// useful text search
cardSchema.index({
  name: "text",
  set: "text",
  setName: "text",
  typeLine: "text",
  oracleText: "text",
  artist: "text",
  collectorNumber: "text",
});

// normalize lowercase search field
cardSchema.pre("save", function (next) {
  this.nameLower = this.name ? this.name.toLowerCase() : "";
  next();
});

module.exports = mongoose.model("Card", cardSchema);