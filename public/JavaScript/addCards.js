import { getCardType, getCardCost, attachHoverEffectToArtCells, getManaColors } from "./getCardData.js";

function getCurrentDate() {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const year = now.getFullYear();
    return `${month}/${day}/${year}`;
}

function extractParentheticalContent(name) {
    const parenthesesRegex = /\(([^)]+)\)/;
    const match = name.match(parenthesesRegex);

    if (match && match[1]) {
        const cleanedName = name.replace(parenthesesRegex, '').trim();
        const parentheticalContent = match[1].trim();
        return { cleanedName, parentheticalContent };
    }

    return { cleanedName: name, parentheticalContent: '' };
}

function removeNumbers(str) {
    return (str || '').replace(/[0-9]/g, '').trim();
}

function normalizeHeader(header) {
    return String(header || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

function splitDelimitedLine(line, delimiter) {
    const row = [];
    let inQuotes = false;
    let currentValue = '';

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
            currentValue = '';
        } else {
            currentValue += char;
        }
    }

    row.push(currentValue.trim());
    return row;
}

function detectDelimiter(text, fileName = '') {
    const extension = fileName.split('.').pop()?.toLowerCase();

    if (extension === 'txt') return '\t';
    if (extension === 'csv') return ',';

    const firstNonEmptyLine = text
        .split(/\r?\n/)
        .find(line => line.trim().length > 0) || '';

    const commaCount = (firstNonEmptyLine.match(/,/g) || []).length;
    const tabCount = (firstNonEmptyLine.match(/\t/g) || []).length;

    return tabCount > commaCount ? '\t' : ',';
}

function parseDelimitedText(text, fileName = '') {
    const delimiter = detectDelimiter(text, fileName);
    const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
    return lines.map(line => splitDelimitedLine(line, delimiter));
}

function getColumnMapping(headerRow) {
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
        proxy: -1
    };

    headerRow.forEach((header, index) => {
        const h = normalizeHeader(header);

        if (["quantity", "count", "qty"].includes(h)) mapping.quantity = index;
        else if (["name", "card name"].includes(h)) mapping.cardName = index;
        else if (["type", "type line"].includes(h)) mapping.type = index;
        else if (["cost", "mana cost"].includes(h)) mapping.cost = index;
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
    });

    return mapping;
}

function getValue(row, index, fallback = '') {
    if (index === -1 || index == null) return fallback;
    return row[index] ?? fallback;
}

function normalizeBool(value) {
    const v = String(value || '').trim().toLowerCase();
    return v === 'true' || v === 'yes' || v === '1' || v === 'foil';
}

function buildCardKey(card) {
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
        card.colors
    ].map(v => String(v || '').trim().toLowerCase()).join('||');
}

function aggregateCards(cards) {
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

const exportCardsToCSV = async () => {
    try {
        const cards = await getCardFromDatabase();

        if (!cards || cards.length === 0) {
            console.log('No cards to export.');
            return;
        }

        const rows = [['Quantity', 'Name', 'Set', 'Art']];
        cards.forEach(card => {
            rows.push([card.quantity, card.name, card.set, card.art]);
        });

        const csvContent = rows
            .map(row => row.map(value => quoteCSVValue(String(value ?? ''))).join(','))
            .join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'Card_List_Export.csv';
        link.click();

        console.log('CSV export successful.');
    } catch (error) {
        console.error('Error exporting cards to CSV:', error);
    }
};

function quoteCSVValue(value) {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        value = '"' + value.replace(/"/g, '""') + '"';
    }
    return value;
}

document.getElementById("btnAddCards").addEventListener("click", function () {
    const input = document.createElement("input");

    input.type = "file";
    input.accept = ".txt,.csv,text/plain,text/csv";

    input.addEventListener("change", async function (event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async function (e) {
            try {
                const content = e.target.result;
                const rows = parseDelimitedText(content, file.name);

                if (rows.length === 0) return;

                const columnMapping = getColumnMapping(rows[0]);
                const currentDate = getCurrentDate();
                const parsedCards = [];

                for (let i = 1; i < rows.length; i++) {
                    const row = rows[i];
                    if (!row.length || row.every(cell => !String(cell || '').trim())) continue;

                    let cardName = getValue(row, columnMapping.cardName, '').trim();
                    if (!cardName) continue;

                    let artContent = getValue(row, columnMapping.art, '').trim();
                    const extracted = extractParentheticalContent(cardName);
                    cardName = extracted.cleanedName;

                    if (!extracted.parentheticalContent) {
                        artContent = artContent || 'Normal';
                    } else {
                        artContent = artContent
                            ? `${extracted.parentheticalContent} ${artContent}`
                            : extracted.parentheticalContent;
                    }

                    artContent = removeNumbers(artContent) || 'Normal';

                    const card = {
                        quantity: getValue(row, columnMapping.quantity, '1'),
                        name: cardName,
                        type: getValue(row, columnMapping.type, ''),
                        cost: getValue(row, columnMapping.cost, ''),
                        colors: getValue(row, columnMapping.colors, ''),
                        set: getValue(row, columnMapping.set, ''),
                        art: artContent,
                        storage: getValue(row, columnMapping.storage, ''),
                        lastUpdated: currentDate,
                        collectorNumber: getValue(row, columnMapping.collectorNumber, ''),
                        foil: normalizeBool(getValue(row, columnMapping.foil, '')),
                        condition: getValue(row, columnMapping.condition, ''),
                        language: getValue(row, columnMapping.language, ''),
                        alter: normalizeBool(getValue(row, columnMapping.alter, '')),
                        proxy: normalizeBool(getValue(row, columnMapping.proxy, ''))
                    };

                    parsedCards.push(card);
                }

const cardsToInsert = aggregateCards(parsedCards);

async function sendCardsInBatches(cards, batchSize = 50) {
    const allInsertedIds = [];

    for (let i = 0; i < cards.length; i += batchSize) {
        const batch = cards.slice(i, i + batchSize);
        const payload = JSON.stringify({ cards: batch });

        console.log(`Sending batch ${i / batchSize + 1}: ${batch.length} cards, ${payload.length} chars`);

        const response = await fetch('http://localhost:3000/saveCards', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: payload
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed on batch starting at index ${i}: ${errorText}`);
        }

        const savedResponse = await response.json();
        const insertedIds = savedResponse.insertedIds || [];
        allInsertedIds.push(...insertedIds);
    }

    return allInsertedIds;
}

try {
    // ✅ THIS is the missing piece
    const insertedIds = await sendCardsInBatches(cardsToInsert, 50);

    console.log('Cards successfully saved!');

// Just reload the saved cards from the DB instead of posting all IDs back
const refreshResponse = await fetch('http://localhost:3000/getCards');

if (refreshResponse.ok) {
    const savedCards = await refreshResponse.json();

    if (savedCards && savedCards.data && Array.isArray(savedCards.data.cards)) {
        displayCards(savedCards.data.cards);
    } else if (Array.isArray(savedCards)) {
        displayCards(savedCards);
    } else {
        console.error('Unexpected getCards response:', savedCards);
    }
} else {
    console.error('Failed to refresh cards after import');
}

    

} catch (error) {
    console.error('Batch upload failed:', error);
}

            } catch (error) {
                console.error('Error processing import file:', error);
            }
        };

        reader.readAsText(file);
    });

    input.click();
});

async function displayCards(cards) {
    if (!Array.isArray(cards)) {
        console.error('Expected an array of cards, but received:', cards);
        return;
    }

    const tableBody = document.getElementById("displayTableBody");
    tableBody.innerHTML = "";

    cards.forEach(card => {
        const tr = document.createElement("tr");

        const addCell = (content) => {
            const td = document.createElement("td");
            td.textContent = content || '';
            tr.appendChild(td);
        };

        addCell(card.quantity);
        addCell(card.name);
        addCell(card.type);
        addCell(card.cost);
        addCell(card.colors);
        addCell(card.set);
        addCell(card.art);
        addCell(card.storage);
        addCell(card.lastUpdated);

        const optionsTd = document.createElement("td");
        const optionsButton = document.createElement("button");
        optionsButton.className = "options-button";
        optionsButton.textContent = "⋮";
        optionsButton.title = "Options";
        optionsTd.appendChild(optionsButton);
        tr.appendChild(optionsTd);

        tableBody.appendChild(tr);

        getCardType(card.name, tr);
        getCardCost(card.name, tr);
        getManaColors(card.name, tr);
    });

    attachHoverEffectToArtCells();
}

document.addEventListener("DOMContentLoaded", function () {
    fetch('http://localhost:3000/getCards')
        .then(function(response) {
            if (response.ok) {
                return response.json();
            } else {
                console.error('Failed to fetch cards:', response.status);
                throw new Error('Failed to fetch cards');
            }
        })
        .then(function(savedCards) {
            if (savedCards && Array.isArray(savedCards)) {
                displayCards(savedCards);
            } else if (savedCards && savedCards.data && Array.isArray(savedCards.data.cards)) {
                displayCards(savedCards.data.cards);
            } else {
                console.error('Expected data.cards to be an array, but received:', savedCards);
                displayCards([]);
            }
        })
        .catch(function(error) {
            console.error('Error fetching data from the server', error);
        });
});