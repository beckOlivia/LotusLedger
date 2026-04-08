export function getCurrentDate() {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const year = now.getFullYear();
    return `${month}/${day}/${year}`;
}

export function extractParentheticalContent(name) {
    const parenthesesRegex = /\(([^)]+)\)/;
    const match = String(name || "").match(parenthesesRegex);

    if (match && match[1]) {
        const cleanedName = name.replace(parenthesesRegex, "").trim();
        const parentheticalContent = match[1].trim();
        return { cleanedName, parentheticalContent };
    }

    return { cleanedName: name, parentheticalContent: "" };
}

export function removeNumbers(str) {
    return String(str || "").replace(/[0-9]/g, "").trim();
}

export function normalizeBool(value) {
    const v = String(value || "").trim().toLowerCase();
    return v === "true" || v === "yes" || v === "1" || v === "foil";
}

export function buildCardKey(card) {
    return [
        card.name,
        card.set,
        card.art,
        card.collectorNumber,
        card.foil,
        card.condition,
        card.language,
        card.alter,
        card.proxy,
        card.storage,
        card.type,
        card.cost,
        Array.isArray(card.colors) ? card.colors.join("|") : card.colors
    ]
        .map(v => String(v || "").trim().toLowerCase())
        .join("||");
}

export function aggregateCards(cards) {
    const aggregated = new Map();

    for (const card of cards) {
        const quantity = parseInt(card.quantity, 10) || 0;
        const key = buildCardKey(card);

        if (!aggregated.has(key)) {
            aggregated.set(key, {
                ...card,
                quantity
            });
        } else {
            aggregated.get(key).quantity += quantity;
        }
    }

    return Array.from(aggregated.values()).map(card => ({
        ...card,
        quantity: String(card.quantity)
    }));
}

export function buildManualCardFromScryfall(card, overrides = {}) {
    return {
        quantity: String(overrides.quantity || 1),
        name: card.name || "",
        type: card.type_line || "",
        typeLine: card.type_line || "",
        cost: card.cmc ?? 0,
        cmc: card.cmc ?? 0,
        colors: Array.isArray(card.colors) ? card.colors : [],
        manaCost: card.mana_cost || "",
        set: card.set || "",
        setName: card.set_name || "",
        art: overrides.art || "Normal",
        storage: overrides.storage || "",
        storageLocation: overrides.storage || "",
        lastUpdated: getCurrentDate(),
        collectorNumber: card.collector_number || "",
        foil: Boolean(overrides.foil),
        condition: overrides.condition || "",
        language: card.lang || "en",
        alter: false,
        proxy: false,
        oracleText: card.oracle_text || "",
        flavorText: card.flavor_text || "",
        rarity: card.rarity || "",
        artist: card.artist || "",
        sourceURL:
            card.image_uris?.normal ||
            card.image_uris?.large ||
            card.card_faces?.[0]?.image_uris?.normal ||
            card.card_faces?.[0]?.image_uris?.large ||
            ""
    };
}