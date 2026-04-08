export function normalizeHeader(header) {
    return String(header || "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
}

export function splitDelimitedLine(line, delimiter) {
    const row = [];
    let inQuotes = false;
    let currentValue = "";

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];

        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                currentValue += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
            continue;
        }

        if (char === delimiter && !inQuotes) {
            row.push(currentValue.trim());
            currentValue = "";
        } else {
            currentValue += char;
        }
    }

    row.push(currentValue.trim());
    return row;
}

export function detectDelimiter(text, fileName = "") {
    const extension = fileName.split(".").pop()?.toLowerCase();

    if (extension === "txt") return "\t";
    if (extension === "csv") return ",";

    const firstNonEmptyLine =
        text.split(/\r?\n/).find(line => line.trim().length > 0) || "";

    const commaCount = (firstNonEmptyLine.match(/,/g) || []).length;
    const tabCount = (firstNonEmptyLine.match(/\t/g) || []).length;

    return tabCount > commaCount ? "\t" : ",";
}

export function parseDelimitedText(text, fileName = "") {
    const delimiter = detectDelimiter(text, fileName);
    const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
    return lines.map(line => splitDelimitedLine(line, delimiter));
}

export function getColumnMapping(headerRow) {
    const mapping = {
        quantity: -1,
        cardName: -1,
        type: -1,
        cost: -1,
        colors: -1,
        set: -1,
        art: -1,
        storage: -1,
        lastUpdated: -1,
        collectorNumber: -1,
        foil: -1,
        condition: -1,
        language: -1,
        alter: -1,
        proxy: -1,
        setName: -1,
        manaCost: -1,
        rarity: -1,
        scryfallId: -1
    };

    headerRow.forEach((header, index) => {
        const h = normalizeHeader(header);

        if (["quantity", "count", "qty"].includes(h)) mapping.quantity = index;
        else if (["name", "card name"].includes(h)) mapping.cardName = index;
        else if (["type", "type line"].includes(h)) mapping.type = index;
        else if (["cost"].includes(h)) mapping.cost = index;
        else if (["mana cost"].includes(h)) mapping.manaCost = index;
        else if (["color", "colors", "colour", "colours"].includes(h)) mapping.colors = index;
        else if (["set", "edition", "set code"].includes(h)) mapping.set = index;
        else if (["art", "artist"].includes(h)) mapping.art = index;
        else if (["storage", "location"].includes(h)) mapping.storage = index;
        else if (["update", "updated", "last updated", "last modified", "date"].includes(h)) mapping.lastUpdated = index;
        else if (["collector number", "collector no"].includes(h)) mapping.collectorNumber = index;
        else if (["foil", "finish"].includes(h)) mapping.foil = index;
        else if (["condition"].includes(h)) mapping.condition = index;
        else if (["language"].includes(h)) mapping.language = index;
        else if (["alter"].includes(h)) mapping.alter = index;
        else if (["proxy"].includes(h)) mapping.proxy = index;
        else if (["set name"].includes(h)) mapping.setName = index;
        else if (["rarity"].includes(h)) mapping.rarity = index;
        else if (["scryfall id"].includes(h)) mapping.scryfallId = index;
    });

    return mapping;
}

export function getValue(row, index, fallback = "") {
    if (index === -1 || index == null) return fallback;
    return row[index] ?? fallback;
}