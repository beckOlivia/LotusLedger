const axios = require("axios");

async function getCardImage(scryfall) {
    const imageUrl =
        scryfall?.image_uris?.png ||
        scryfall?.image_uris?.large ||
        scryfall?.image_uris?.normal ||
        scryfall?.card_faces?.[0]?.image_uris?.png ||
        scryfall?.card_faces?.[0]?.image_uris?.large ||
        scryfall?.card_faces?.[0]?.image_uris?.normal ||
        null;

    if (!imageUrl) return null;

    try {
        const response = await axios.get(imageUrl, {
            responseType: "arraybuffer"
        });

        return {
            data: Buffer.from(response.data),
            contentType: response.headers["content-type"] || "image/png",
            sourceUrl: imageUrl
        };
    } catch (error) {
        console.error("Image download failed:", error.message);
        return null;
    }
}

module.exports = {
    getCardImage
};