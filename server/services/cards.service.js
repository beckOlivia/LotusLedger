const {
    insertManyCards,
    insertOneCard,
    findAllCards,
    findCardById,
    findMatchingCardForStack,
    updateCardById,
    deleteCardById
} = require("../repositories/cards.repositories");

const { fetchScryfallCard } = require("./scryfall.service");

function normalizeForStack(card) {
    return {
        name: String(card.name || "").trim(),
        set: String(card.set || "").trim(),
        art: String(card.art || "").trim(),
        storageLocation: String(card.storageLocation || "").trim()
    };
}

function makeLookupKey(name, set) {
    return `${String(name || "").trim().toLowerCase()}|${String(set || "").trim().toLowerCase()}`;
}

function normalizeColors(cardColors, scryfallColors) {
    if (Array.isArray(cardColors) && cardColors.length > 0) {
        return cardColors.map(x => String(x).trim()).filter(Boolean);
    }

    if (typeof cardColors === "string" && cardColors.trim()) {
        return cardColors
            .split(/[\s,]+/)
            .map(x => x.trim())
            .filter(Boolean);
    }

    if (Array.isArray(scryfallColors)) {
        return scryfallColors.map(x => String(x).trim()).filter(Boolean);
    }

    return [];
}

function normalizeColorIdentity(cardColorIdentity, scryfallColorIdentity) {
    if (Array.isArray(cardColorIdentity) && cardColorIdentity.length > 0) {
        return cardColorIdentity.map(x => String(x).trim()).filter(Boolean);
    }

    if (typeof cardColorIdentity === "string" && cardColorIdentity.trim()) {
        return cardColorIdentity
            .split(/[\s,]+/)
            .map(x => x.trim())
            .filter(Boolean);
    }

    if (Array.isArray(scryfallColorIdentity)) {
        return scryfallColorIdentity.map(x => String(x).trim()).filter(Boolean);
    }

    return [];
}

async function enrichOneCard(card, scryfallCache) {
    const rawName = String(card.name || "").trim();
    const rawSet = String(card.set || "").trim();

    let scryfall = null;
    const lookupKey = makeLookupKey(rawName, rawSet);

    if (rawName) {
        if (scryfallCache.has(lookupKey)) {
            scryfall = scryfallCache.get(lookupKey);
        } else {
            try {
                // Sequential fetch per card import item; cache repeated lookups in this batch
                scryfall = await fetchScryfallCard(rawName, rawSet);
            } catch (error) {
                console.warn(
                    `Scryfall fetch failed for "${rawName}" (${rawSet || "no set"}):`,
                    error.message
                );
                scryfall = null;
            }

            scryfallCache.set(lookupKey, scryfall);
        }
    }

    const normalizedName = String(card.name || scryfall?.name || "").trim();

    return {
        quantity: Number(card.quantity || 1),
        name: normalizedName,
        nameLower: normalizedName.toLowerCase(),
        storageLocation: String(card.storageLocation || "").trim(),

        set: String(card.set || scryfall?.set || "").trim(),
        setName: String(card.setName || scryfall?.set_name || "").trim(),
        collectorNumber: String(card.collectorNumber || scryfall?.collector_number || "").trim(),

        typeLine: String(card.typeLine || scryfall?.type_line || "").trim(),
        manaCost: String(card.manaCost || scryfall?.mana_cost || "").trim(),
        cmc: Number(card.cmc ?? scryfall?.cmc ?? 0),

        colors: normalizeColors(card.colors, scryfall?.colors),
        colorIdentity: normalizeColorIdentity(card.colorIdentity, scryfall?.color_identity),

        rarity: String(card.rarity || scryfall?.rarity || "").trim(),
        artist: String(card.artist || scryfall?.artist || "").trim(),
        oracleText: String(card.oracleText || scryfall?.oracle_text || "").trim(),
        scryfallId: String(card.scryfallId || scryfall?.id || "").trim(),

        art: String(card.art || "Normal").trim(),
        imageUrl: String(
            card.imageUrl ||
            scryfall?.image_uris?.normal ||
            scryfall?.card_faces?.[0]?.image_uris?.normal ||
            ""
        ).trim(),

        createdAt: new Date(),
        updatedAt: new Date()
    };
}

async function saveCards(cards = []) {
    const scryfallCache = new Map();
    const enrichedCards = [];

    // Process sequentially to avoid hammering Scryfall
    for (const card of cards) {
        const enriched = await enrichOneCard(card, scryfallCache);
        enrichedCards.push(enriched);
    }

    for (const card of enrichedCards) {
        const normalizedCard = normalizeForStack(card);
        const existing = await findMatchingCardForStack(normalizedCard);

        if (existing) {
            await updateCardById(existing._id.toString(), {
                quantity: Number(existing.quantity || 0) + Number(card.quantity || 0),
                updatedAt: new Date()
            });
        } else {
            await insertOneCard({
                ...card,
                ...normalizedCard
            });
        }
    }

    return { success: true };
}

async function getAllCards() {
    return findAllCards();
}

async function getCardImageById(id) {
    return findCardById(id);
}

async function editCard(id, updates) {
    await updateCardById(id, updates);
    return { success: true };
}

async function removeCard(id) {
    await deleteCardById(id);
    return { success: true };
}

async function moveCardToStorage({ cardId, storageLocation, quantityToMove }) {
    if (!cardId) {
        throw new Error("cardId is required.");
    }

    const targetStorage = String(storageLocation || "").trim();
    if (!targetStorage) {
        throw new Error("storageLocation is required.");
    }

    const card = await findCardById(cardId);
    if (!card) {
        throw new Error("Card not found.");
    }

    const currentQuantity = Number(card.quantity || 0);
    const moveQty = Number(quantityToMove || 0);

    if (!Number.isInteger(moveQty) || moveQty < 1) {
        throw new Error("quantityToMove must be at least 1.");
    }

    if (moveQty > currentQuantity) {
        throw new Error("quantityToMove cannot exceed current quantity.");
    }

    if (moveQty === currentQuantity) {
        await updateCardById(cardId, {
            storageLocation: targetStorage,
            updatedAt: new Date()
        });

        return { moved: true, split: false };
    }

    await updateCardById(cardId, {
        quantity: currentQuantity - moveQty,
        updatedAt: new Date()
    });

    const normalizedTargetCard = normalizeForStack({
        ...card,
        storageLocation: targetStorage
    });

    const matchingCard = await findMatchingCardForStack(normalizedTargetCard);

    if (matchingCard) {
        await updateCardById(matchingCard._id.toString(), {
            quantity: Number(matchingCard.quantity || 0) + moveQty,
            updatedAt: new Date()
        });
    } else {
        const newCardRow = {
            ...normalizeForStack(card),
            ...card,
            quantity: moveQty,
            storageLocation: targetStorage,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        delete newCardRow._id;

        await insertOneCard(newCardRow);
    }

    return { moved: true, split: true };
}

module.exports = {
    saveCards,
    getAllCards,
    getCardImageById,
    editCard,
    removeCard,
    moveCardToStorage
};