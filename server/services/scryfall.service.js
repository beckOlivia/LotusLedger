const axios = require("axios");

const cardCache = new Map();
const pendingDelayQueue = [];
let activeRequest = false;
const REQUEST_DELAY_MS = 120;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function runQueued(task) {
    return new Promise((resolve, reject) => {
        pendingDelayQueue.push({ task, resolve, reject });
        processQueue();
    });
}

async function processQueue() {
    if (activeRequest || pendingDelayQueue.length === 0) return;

    activeRequest = true;
    const { task, resolve, reject } = pendingDelayQueue.shift();

    try {
        const result = await task();
        resolve(result);
    } catch (error) {
        reject(error);
    } finally {
        await sleep(REQUEST_DELAY_MS);
        activeRequest = false;
        processQueue();
    }
}

function makeCacheKey(name, set = "") {
    return `${String(name || "").trim().toLowerCase()}|${String(set || "").trim().toLowerCase()}`;
}

async function fetchCardFromScryfall(name, set = "") {
    const trimmedName = String(name || "").trim();
    const trimmedSet = String(set || "").trim().toLowerCase();

    if (!trimmedName) return null;

    const cacheKey = makeCacheKey(trimmedName, trimmedSet);
    if (cardCache.has(cacheKey)) {
        return cardCache.get(cacheKey);
    }

    const result = await runQueued(async () => {
        try {
            let response;

            if (trimmedSet) {
                response = await axios.get("https://api.scryfall.com/cards/search", {
                    params: {
                        q: `!"${trimmedName}" set:${trimmedSet} unique:prints`
                    },
                    timeout: 15000
                });

                if (response.data?.data?.length) {
                    return response.data.data[0];
                }
            }

            response = await axios.get("https://api.scryfall.com/cards/named", {
                params: {
                    fuzzy: trimmedName
                },
                timeout: 15000
            });

            if (response.data?.object === "card") {
                return response.data;
            }

            return null;
        } catch (error) {
            const status = error.response?.status;

            if (status === 404) {
                console.warn(`Scryfall 404 for: ${trimmedName} (${trimmedSet})`);
                return null;
            }

            if (status === 429) {
                console.warn(`Scryfall 429 for: ${trimmedName} (${trimmedSet})`);
                await sleep(1000);
                return null;
            }

            console.error(`Scryfall fetch failed for ${trimmedName}:`, error.message);
            return null;
        }
    });

    cardCache.set(cacheKey, result);
    return result;
}

async function enrichCard(card) {
    const name = String(card.name || "").trim();
    const set = String(card.set || "").trim();

    const scryfallCard = await fetchCardFromScryfall(name, set);

    if (!scryfallCard) {
        return {
            ...card,
            name,
            nameLower: name.toLowerCase()
        };
    }

    return {
        ...card,
        name: scryfallCard.name || name,
        nameLower: (scryfallCard.name || name).toLowerCase(),
        set: scryfallCard.set || card.set || "",
        setName: scryfallCard.set_name || card.setName || "",
        collectorNumber: scryfallCard.collector_number || card.collectorNumber || "",
        typeLine: scryfallCard.type_line || card.typeLine || "",
        manaCost: scryfallCard.mana_cost || card.manaCost || "",
        cmc: scryfallCard.cmc ?? card.cmc ?? 0,
        colors: scryfallCard.colors || card.colors || [],
        colorIdentity: scryfallCard.color_identity || card.colorIdentity || [],
        rarity: scryfallCard.rarity || card.rarity || "",
        artist: scryfallCard.artist || card.artist || "",
        oracleText: scryfallCard.oracle_text || card.oracleText || "",
        scryfallId: scryfallCard.id || card.scryfallId || "",
        imageUrl:
            scryfallCard.image_uris?.normal ||
            scryfallCard.card_faces?.[0]?.image_uris?.normal ||
            card.imageUrl ||
            ""
    };
}

async function enrichCards(cards = []) {
    const results = [];

    for (const card of cards) {
        results.push(await enrichCard(card));
    }

    return results;
}

module.exports = {
    enrichCards
};