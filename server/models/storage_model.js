const mongoose = require("mongoose");

const storageSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
    },
    nameLower: {
      type: String,
      index: true,
    },
    capacity: {
      type: Number,
      default: 0,
      index: true,
    },
    capacityPreset: {
      type: String,
      default: "custom",
      trim: true,
    },
    location: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },
    type: {
      type: String,
      default: "",
      trim: true,
    },
    notes: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

storageSchema.pre("save", function (next) {
  this.nameLower = this.name ? this.name.toLowerCase() : "";
  next();
});

module.exports = mongoose.model("Storage", storageSchema);