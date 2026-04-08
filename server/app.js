const express = require("express");
const cors = require("cors");

const cardsRoutes = require("./routes/cards.routes");
const storageRoutes = require("./routes/storage.routes");

const app = express();

app.use(cors());
app.use(express.json({ limit: "50mb" }));

app.use("/", cardsRoutes);
app.use("/", storageRoutes);

module.exports = app;