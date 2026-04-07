import {
    getCardType,
    getCardCost,
    attachHoverEffectToArtCells,
    getManaColors,
    preloadCards,
    calculateTotalMana,
    extractSymbols
} from "./getCardData.js";

let allCards = [];
let filteredCards = [];
let currentAdvancedFilters = {};
let advancedFilteredCards = [];
let currentSortColumn = null;
let currentSortDirection = "asc";
let currentPage = 1;
const itemsPerPage = 20;
let currentView = "list";
let selectedCard = null;

function getSortableValue(card, column) {
    switch (column) {
        case "quantity":
            return Number(card.quantity || 0);

        case "name":
            return String(card.name || "").toLowerCase();

        case "type":
            return String(card.typeLine || card.type || "").toLowerCase();

        case "cost":
            return Number(card.cmc ?? card.cost ?? 0);

        case "colors": {
            const colors = Array.isArray(card.colors)
                ? card.colors.join(" ")
                : String(card.colors || "");
            return colors.toLowerCase();
        }

        case "set":
            return String(card.setName || card.set || "").toLowerCase();

        case "art":
            return String(card.art || "").toLowerCase();

        case "storage":
            return String(card.storage || card.storageLocation || "").toLowerCase();

        case "lastUpdated": {
            const raw = String(card.lastUpdated || "");
            const parts = raw.split("/");
            if (parts.length === 3) {
                const [month, day, year] = parts;
                return new Date(`${year}-${month}-${day}`).getTime() || 0;
            }
            return 0;
        }

        default:
            return "";
    }
}

function sortCards(cards, column, direction = "asc") {
    return [...cards].sort((a, b) => {
        const aVal = getSortableValue(a, column);
        const bVal = getSortableValue(b, column);

        if (typeof aVal === "number" && typeof bVal === "number") {
            return direction === "asc" ? aVal - bVal : bVal - aVal;
        }

        return direction === "asc"
            ? String(aVal).localeCompare(String(bVal))
            : String(bVal).localeCompare(String(aVal));
    });
}

function updateSortIcons() {
    document.querySelectorAll(".sortable").forEach(header => {
        const icon = header.querySelector(".sort-icon");
        header.classList.remove("active", "desc");

        if (icon) {
            icon.textContent = "↕";
        }

        if (header.dataset.column === currentSortColumn) {
            header.classList.add("active");

            if (icon) {
                icon.textContent = currentSortDirection === "asc" ? "▲" : "▼";
            }

            if (currentSortDirection === "desc") {
                header.classList.add("desc");
            }
        }
    });
}

function handleColumnSort(column) {
    if (currentSortColumn === column) {
        currentSortDirection = currentSortDirection === "asc" ? "desc" : "asc";
    } else {
        currentSortColumn = column;
        currentSortDirection = "asc";
    }

    filteredCards = sortCards(filteredCards, currentSortColumn, currentSortDirection);
    currentPage = 1;
    updateSortIcons();
    renderCurrentPage();
}

function getCurrentDate() {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const year = now.getFullYear();
    return `${month}/${day}/${year}`;
}

function extractParentheticalContent(name) {
    const parenthesesRegex = /\(([^)]+)\)/;
    const match = name.match(parenthesesRegex);

    if (match && match[1]) {
        const cleanedName = name.replace(parenthesesRegex, "").trim();
        const parentheticalContent = match[1].trim();
        return { cleanedName, parentheticalContent };
    }

    return { cleanedName: name, parentheticalContent: "" };
}

function removeNumbers(str) {
    return (str || "").replace(/[0-9]/g, "").trim();
}

function normalizeHeader(header) {
    return String(header || "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
}

function applySearchFilter() {
    const query = document.getElementById("txtSearchLibrary").value.trim().toLowerCase();
    const base = advancedFilteredCards.length > 0 ? advancedFilteredCards : allCards;

    if (!query) {
        filteredCards = [...base];
    } else {
        filteredCards = base.filter(card =>
            String(card.name || "").toLowerCase().includes(query)
        );
    }

    if (currentSortColumn) {
        filteredCards = sortCards(filteredCards, currentSortColumn, currentSortDirection);
    }

    currentPage = 1;
    renderCurrentPage();
}

function splitDelimitedLine(line, delimiter) {
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

function detectDelimiter(text, fileName = "") {
    const extension = fileName.split(".").pop()?.toLowerCase();

    if (extension === "txt") return "\t";
    if (extension === "csv") return ",";

    const firstNonEmptyLine =
        text.split(/\r?\n/).find(line => line.trim().length > 0) || "";

    const commaCount = (firstNonEmptyLine.match(/,/g) || []).length;
    const tabCount = (firstNonEmptyLine.match(/\t/g) || []).length;

    return tabCount > commaCount ? "\t" : ",";
}

function parseDelimitedText(text, fileName = "") {
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

function getValue(row, index, fallback = "") {
    if (index === -1 || index == null) return fallback;
    return row[index] ?? fallback;
}

function normalizeBool(value) {
    const v = String(value || "").trim().toLowerCase();
    return v === "true" || v === "yes" || v === "1" || v === "foil";
}

function buildMergeKey(card) {
    return [
        card.name,
        card.set,
        card.collectorNumber,
        card.art,
        card.foil,
        card.condition,
        card.language,
        card.alter,
        card.proxy,
        card.storage || card.storageLocation || ""
    ]
        .map(v => String(v || "").trim().toLowerCase())
        .join("||");
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
        Array.isArray(card.colors) ? card.colors.join("|") : card.colors
    ]
        .map(v => String(v || "").trim().toLowerCase())
        .join("||");
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

function quoteCSVValue(value) {
    if (value.includes(",") || value.includes('"') || value.includes("\n")) {
        value = '"' + value.replace(/"/g, '""') + '"';
    }
    return value;
}

const exportCardsToCSV = async () => {
    try {
        const response = await fetch("http://localhost:3000/getCards");
        const cards = await response.json();

        const cardList = Array.isArray(cards) ? cards : cards?.data?.cards || [];

        if (!cardList.length) {
            console.log("No cards to export.");
            return;
        }

        const rows = [["Quantity", "Name", "Set", "Art"]];
        cardList.forEach(card => {
            rows.push([card.quantity, card.name, card.setName || card.set, card.art]);
        });

        const csvContent = rows
            .map(row => row.map(value => quoteCSVValue(String(value ?? ""))).join(","))
            .join("\n");

        const blob = new Blob([csvContent], { type: "text/csv" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "Card_List_Export.csv";
        link.click();
    } catch (error) {
        console.error("Error exporting cards to CSV:", error);
    }
};

function getPaginatedCards() {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredCards.slice(startIndex, endIndex);
}

function updatePaginationControls() {
    const totalPages = Math.max(1, Math.ceil(filteredCards.length / itemsPerPage));
    document.getElementById("pageInfo").textContent = `Page ${currentPage} of ${totalPages}`;
    document.getElementById("btnPrevPage").disabled = currentPage === 1;
    document.getElementById("btnNextPage").disabled = currentPage === totalPages;
}

function createOptionsMenu(card) {
    const menu = document.createElement("div");
    menu.className = "options-menu";

    const list = document.createElement("ul");

    const deleteItem = document.createElement("li");
    deleteItem.textContent = "Delete";
    deleteItem.addEventListener("click", async () => {
        await deleteCard(card);
        menu.style.display = "none";
    });

    const editItem = document.createElement("li");
    editItem.textContent = "Edit";
    editItem.addEventListener("click", () => {
        openEditModal(card);
        menu.style.display = "none";
    });

    const storageItem = document.createElement("li");
    storageItem.textContent = "Add to Storage";
    storageItem.addEventListener("click", () => {
        openStorageModal(card);
        menu.style.display = "none";
    });

    list.appendChild(deleteItem);
    list.appendChild(editItem);
    list.appendChild(storageItem);
    menu.appendChild(list);

    return menu;
}

async function deleteCard(card) {
    try {
        if (!card._id) {
            alert("This card does not have an ID, so it cannot be deleted yet.");
            return;
        }

        const response = await fetch(`http://localhost:3000/deleteCard/${card._id}`, {
            method: "DELETE"
        });

        if (!response.ok) {
            throw new Error("Failed to delete card");
        }

        await loadCards();
    } catch (error) {
        console.error("Error deleting card:", error);
        alert("Delete failed. Make sure your backend route exists.");
    }
}

function openEditModal(card) {
    selectedCard = card;
    document.getElementById("editQuantity").value = card.quantity || 1;
    document.getElementById("editStorage").value = card.storage || card.storageLocation || "";
    document.getElementById("editArt").value = card.art || "";
    document.getElementById("editModal").style.display = "block";
}

function openStorageModal(card) {
    selectedCard = card;

    document.getElementById("storageNameInput").value = "";
    document.getElementById("storageQuantityInput").value = 1;
    document.getElementById("storageQuantityInput").min = 1;
    document.getElementById("storageQuantityInput").max = parseInt(card.quantity, 10) || 1;

    const currentQtyLabel = document.getElementById("storageCurrentQuantity");
    if (currentQtyLabel) {
        currentQtyLabel.textContent = `Available: ${card.quantity || 1}`;
    }

    document.getElementById("storageModal").style.display = "block";
}

async function saveEditChanges() {
    try {
        if (!selectedCard?._id) {
            alert("This card cannot be edited because it has no database ID.");
            return;
        }

        const updatedCard = {
            quantity: document.getElementById("editQuantity").value,
            storage: document.getElementById("editStorage").value,
            storageLocation: document.getElementById("editStorage").value,
            art: document.getElementById("editArt").value
        };

        const response = await fetch(`http://localhost:3000/updateCard/${selectedCard._id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(updatedCard)
        });

        if (!response.ok) {
            throw new Error("Failed to update card");
        }

        document.getElementById("editModal").style.display = "none";
        selectedCard = null;
        await loadCards();
    } catch (error) {
        console.error("Error updating card:", error);
        alert("Edit failed. Make sure your backend route exists.");
    }
}

async function saveStorageChanges() {
    try {
        if (!selectedCard?._id) {
            alert("This card cannot be updated because it has no database ID.");
            return;
        }

        const newStorage = document.getElementById("storageNameInput").value.trim();
        const moveQuantity = parseInt(document.getElementById("storageQuantityInput").value, 10);
        const currentQuantity = parseInt(selectedCard.quantity, 10) || 0;

        if (!newStorage) {
            alert("Please enter a storage name.");
            return;
        }

        if (Number.isNaN(moveQuantity) || moveQuantity < 1) {
            alert("Please enter a valid quantity.");
            return;
        }

        if (moveQuantity > currentQuantity) {
            alert("Quantity cannot exceed the number of cards saved.");
            return;
        }

        const response = await fetch("http://localhost:3000/moveCardToStorage", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                cardId: selectedCard._id,
                storageLocation: newStorage,
                quantityToMove: moveQuantity
            })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result?.error || "Failed to move card to storage");
        }

        document.getElementById("storageModal").style.display = "none";
        selectedCard = null;
        await loadCards();
    } catch (error) {
        console.error("Error saving storage:", error);
        alert(error.message || "Storage update failed.");
    }
}

function renderListView(cards) {
    const tableBody = document.getElementById("displayTableBody");
    tableBody.innerHTML = "";

    cards.forEach(card => {
        const tr = document.createElement("tr");

        const addCell = content => {
            const td = document.createElement("td");
            td.textContent = content || "";
            tr.appendChild(td);
        };

        addCell(card.quantity);
        addCell(card.name);
        addCell(card.typeLine || card.type);
        addCell(card.cmc ?? card.cost ?? "");
        addCell(Array.isArray(card.colors) ? card.colors.join(" ") : card.colors);
        addCell(card.setName || card.set);
        addCell(card.art);
        addCell(card.storage || card.storageLocation);
        addCell(card.lastUpdated);

        const optionsTd = document.createElement("td");
        optionsTd.style.position = "relative";

        const optionsButton = document.createElement("button");
        optionsButton.className = "options-button";
        optionsButton.textContent = "⋮";
        optionsButton.title = "Options";

        const optionsMenu = createOptionsMenu(card);

        optionsButton.addEventListener("click", e => {
            e.stopPropagation();
            document.querySelectorAll(".options-menu").forEach(menu => {
                if (menu !== optionsMenu) menu.style.display = "none";
            });
            optionsMenu.style.display = optionsMenu.style.display === "block" ? "none" : "block";
        });

        optionsTd.appendChild(optionsButton);
        optionsTd.appendChild(optionsMenu);
        tr.appendChild(optionsTd);

        tableBody.appendChild(tr);

        getCardType(card.name, tr);
        getCardCost(card.name, tr);
        getManaColors(card.name, tr);
    });

    attachHoverEffectToArtCells();
}

function openImageZoom(src, alt = "Zoomed card image") {
    const modal = document.getElementById("imageZoomModal");
    const zoomedImg = document.getElementById("zoomedCardImage");

    if (!modal || !zoomedImg || !src) return;

    zoomedImg.src = src;
    zoomedImg.alt = alt;
    modal.classList.remove("hidden");
}

function closeImageZoom() {
    const modal = document.getElementById("imageZoomModal");
    const zoomedImg = document.getElementById("zoomedCardImage");

    if (!modal || !zoomedImg) return;

    modal.classList.add("hidden");
    zoomedImg.src = "";
}

async function renderImageView(cards) {
    const container = document.getElementById("imageViewContainer");
    container.innerHTML = "";

    await preloadCards(cards.map(card => card.name));

    for (const card of cards) {
        const cardDiv = document.createElement("div");
        cardDiv.className = "image-card";

        const optionsButton = document.createElement("button");
        optionsButton.className = "options-button";
        optionsButton.textContent = "⋮";

        const optionsMenu = createOptionsMenu(card);
        optionsButton.addEventListener("click", e => {
            e.stopPropagation();
            document.querySelectorAll(".options-menu").forEach(menu => {
                if (menu !== optionsMenu) menu.style.display = "none";
            });
            optionsMenu.style.display = optionsMenu.style.display === "block" ? "none" : "block";
        });

        const img = document.createElement("img");
        img.alt = card.name || "Card image";
        let imageSrc = "";

        if (card.sourceURL) {
            imageSrc = card.sourceURL;
        }
        else if (card.image?.data) {
            imageSrc = card.image.data.startsWith("data:")
                ? card.image.data
                : `data:${card.image.contentType || "image/png"};base64,${card.image.data}`;
        }
        else if (card.imageUrls?.cardImage) {
            imageSrc = card.imageUrls.cardImage;
        }
        else if (card.imageUrls?.small) {
            imageSrc = card.imageUrls.small;
        }

        img.src = imageSrc;

        img.addEventListener("click", () => {
            openImageZoom(img.src, card.name || "Zoomed card image");
        }); 

        img.onerror = () => {
            console.error("Image failed:", card.name, imageSrc, card);

            img.onerror = null;
            img.src = "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(`
                <svg xmlns="http://www.w3.org/2000/svg" width="300" height="420">
                    <rect width="100%" height="100%" fill="#202138"/>
                    <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
                        fill="white" font-size="20" font-family="Arial">
                        No Image
                    </text>
                </svg>
            `);
        };
        const title = document.createElement("h4");
        title.textContent = `${card.quantity || ""}x ${card.name || ""}`;

        const details = document.createElement("div");
        details.className = "image-card-details";

        const addDetail = (label, value) => {
            const p = document.createElement("p");
            p.innerHTML = `<strong>${label}:</strong> ${value || ""}`;
            details.appendChild(p);
        };

        const manaCost = card.manaCost || "";
        const colorText = Array.isArray(card.colors) ? card.colors.join(" ") : (card.colors || "");

        addDetail("Quantity", card.quantity);
        addDetail("Card Name", card.name);
        addDetail("Type", card.typeLine || card.type);
        addDetail("Cost", card.cmc ?? calculateTotalMana(manaCost) ?? card.cost);
        addDetail("Colors", colorText);
        addDetail("Set", card.setName || card.set);
        addDetail("Art", card.art);
        addDetail("Storage", card.storage || card.storageLocation);
        addDetail("Last Updated", card.lastUpdated);

        cardDiv.appendChild(optionsButton);
        cardDiv.appendChild(optionsMenu);
        cardDiv.appendChild(img);
        cardDiv.appendChild(title);
        cardDiv.appendChild(details);

        container.appendChild(cardDiv);
    }
}

function getCardsForDetailsPanel() {
    return Array.isArray(filteredCards) ? filteredCards : [];
}

function getNumericCost(card) {
    const value = Number(card.cmc ?? card.cost ?? 0);
    return Number.isFinite(value) ? value : 0;
}

function getCardQuantity(card) {
    const qty = Number(card.quantity || 0);
    return Number.isFinite(qty) ? qty : 0;
}

function getDisplayName(card) {
    return String(card.name || "Unknown");
}

function getSetName(card) {
    return String(card.setName || card.set || "Unknown");
}

function getStorageName(card) {
    return String(card.storage || card.storageLocation || "Unassigned").trim() || "Unassigned";
}

function getColorArray(card) {
    if (Array.isArray(card.colors)) return card.colors;
    return String(card.colors || "")
        .split(/[\s,]+/)
        .map(x => x.trim())
        .filter(Boolean);
}

function formatStatNumber(value) {
    return new Intl.NumberFormat().format(value);
}

function formatStatValue(value) {
    if (typeof value === "number" && Number.isFinite(value)) {
        return Number.isInteger(value) ? String(value) : value.toFixed(2);
    }
    return String(value ?? "");
}

function getTopEntry(mapObj) {
    const entries = Object.entries(mapObj);
    if (!entries.length) return ["None", 0];
    entries.sort((a, b) => b[1] - a[1]);
    return entries[0];
}

function buildDetailsStats(cards) {
    const uniqueCards = cards.length;
    const totalCards = cards.reduce((sum, card) => sum + getCardQuantity(card), 0);

    let totalManaValue = 0;
    let weightedManaValue = 0;

    let highestCard = null;
    let cheapestCard = null;

    const setCounts = {};
    const storageCounts = {};
    const colorCounts = {};
    const manaCurveCounts = {
        "0": 0,
        "1": 0,
        "2": 0,
        "3": 0,
        "4": 0,
        "5+": 0
    };

    for (const card of cards) {
        const qty = getCardQuantity(card);
        const cost = getNumericCost(card);
        const setName = getSetName(card);
        const storageName = getStorageName(card);
        const colors = getColorArray(card);

        totalManaValue += cost;
        weightedManaValue += cost * qty;

        if (!highestCard || cost > getNumericCost(highestCard)) {
            highestCard = card;
        }

        if (!cheapestCard || cost < getNumericCost(cheapestCard)) {
            cheapestCard = card;
        }

        setCounts[setName] = (setCounts[setName] || 0) + qty;
        storageCounts[storageName] = (storageCounts[storageName] || 0) + qty;

        if (colors.length) {
            for (const color of colors) {
                colorCounts[color] = (colorCounts[color] || 0) + qty;
            }
        } else {
            colorCounts["Colorless"] = (colorCounts["Colorless"] || 0) + qty;
        }

        if (cost >= 5) {
            manaCurveCounts["5+"] += qty;
        } else {
            manaCurveCounts[String(cost)] = (manaCurveCounts[String(cost)] || 0) + qty;
        }
    }

    const [topSet, topSetCount] = getTopEntry(setCounts);
    const [topStorage, topStorageCount] = getTopEntry(storageCounts);
    const [topColor, topColorCount] = getTopEntry(colorCounts);

    const averageManaValue = uniqueCards ? totalManaValue / uniqueCards : 0;
    const averageManaValueWeighted = totalCards ? weightedManaValue / totalCards : 0;

    return {
        uniqueCards,
        totalCards,
        totalSets: Object.keys(setCounts).length,
        totalStorages: Object.keys(storageCounts).length,
        averageManaValue,
        averageManaValueWeighted,
        highestCardName: highestCard ? getDisplayName(highestCard) : "None",
        highestCardCost: highestCard ? getNumericCost(highestCard) : 0,
        cheapestCardName: cheapestCard ? getDisplayName(cheapestCard) : "None",
        cheapestCardCost: cheapestCard ? getNumericCost(cheapestCard) : 0,
        topSet,
        topSetCount,
        topStorage,
        topStorageCount,
        topColor,
        topColorCount,
        manaCurveCounts
    };
}

function renderDetailsPanel() {
    const container = document.getElementById("detailsPanelContent");
    if (!container) return;

    const cards = getCardsForDetailsPanel();

    if (!cards.length) {
        container.innerHTML = `<div class="details-empty">No cards match the current filters.</div>`;
        return;
    }

    const stats = buildDetailsStats(cards);

    container.innerHTML = `
        <div class="details-section">
            <h4>Overview</h4>
            <div class="details-stat-grid">
                <div class="details-stat-card">
                    <span class="details-stat-label">Unique Entries</span>
                    <span class="details-stat-value">${formatStatNumber(stats.uniqueCards)}</span>
                </div>
                <div class="details-stat-card">
                    <span class="details-stat-label">Total Cards</span>
                    <span class="details-stat-value">${formatStatNumber(stats.totalCards)}</span>
                </div>
                <div class="details-stat-card">
                    <span class="details-stat-label">Unique Sets</span>
                    <span class="details-stat-value">${formatStatNumber(stats.totalSets)}</span>
                </div>
                <div class="details-stat-card">
                    <span class="details-stat-label">Storage Locations</span>
                    <span class="details-stat-value">${formatStatNumber(stats.totalStorages)}</span>
                </div>
            </div>
        </div>

        <div class="details-section">
            <h4>Mana / Cost</h4>
            <div class="details-stat-grid">
                <div class="details-stat-card">
                    <span class="details-stat-label">Avg Card Cost</span>
                    <span class="details-stat-value">${formatStatValue(stats.averageManaValue)}</span>
                </div>
                <div class="details-stat-card">
                    <span class="details-stat-label">Avg Cost by Quantity</span>
                    <span class="details-stat-value">${formatStatValue(stats.averageManaValueWeighted)}</span>
                </div>
                <div class="details-stat-card">
                    <span class="details-stat-label">Highest Card Cost</span>
                    <span class="details-stat-value">${formatStatValue(stats.highestCardCost)}</span>
                </div>
                <div class="details-stat-card">
                    <span class="details-stat-label">Cheapest Card Cost</span>
                    <span class="details-stat-value">${formatStatValue(stats.cheapestCardCost)}</span>
                </div>
            </div>
            <div class="details-list" style="margin-top: 12px;">
                <div class="details-list-row">
                    <span>Highest Cost Card</span>
                    <strong>${stats.highestCardName}</strong>
                </div>
                <div class="details-list-row">
                    <span>Cheapest Card</span>
                    <strong>${stats.cheapestCardName}</strong>
                </div>
            </div>
        </div>

        <div class="details-section">
            <h4>Collection Insights</h4>
            <div class="details-list">
                <div class="details-list-row">
                    <span>Most Common Set</span>
                    <strong>${stats.topSet} (${formatStatNumber(stats.topSetCount)})</strong>
                </div>
                <div class="details-list-row">
                    <span>Top Storage</span>
                    <strong>${stats.topStorage} (${formatStatNumber(stats.topStorageCount)})</strong>
                </div>
                <div class="details-list-row">
                    <span>Most Common Color</span>
                    <strong>${stats.topColor} (${formatStatNumber(stats.topColorCount)})</strong>
                </div>
            </div>
        </div>

        <div class="details-section">
            <h4>Mana Curve</h4>
            <div class="details-list">
                <div class="details-list-row"><span>0 Cost</span><strong>${formatStatNumber(stats.manaCurveCounts["0"])}</strong></div>
                <div class="details-list-row"><span>1 Cost</span><strong>${formatStatNumber(stats.manaCurveCounts["1"])}</strong></div>
                <div class="details-list-row"><span>2 Cost</span><strong>${formatStatNumber(stats.manaCurveCounts["2"])}</strong></div>
                <div class="details-list-row"><span>3 Cost</span><strong>${formatStatNumber(stats.manaCurveCounts["3"])}</strong></div>
                <div class="details-list-row"><span>4 Cost</span><strong>${formatStatNumber(stats.manaCurveCounts["4"])}</strong></div>
                <div class="details-list-row"><span>5+ Cost</span><strong>${formatStatNumber(stats.manaCurveCounts["5+"])}</strong></div>
            </div>
        </div>
    `;
}

function openDetailsPanel() {
    const panel = document.getElementById("detailsPanel");
    if (!panel) return;

    renderDetailsPanel();
    panel.classList.remove("hidden");
    document.body.classList.add("details-panel-open");
}

function closeDetailsPanel() {
    const panel = document.getElementById("detailsPanel");
    if (!panel) return;

    panel.classList.add("hidden");
    document.body.classList.remove("details-panel-open");
}

function toggleDetailsPanel() {
    const panel = document.getElementById("detailsPanel");
    if (!panel) return;

    if (panel.classList.contains("hidden")) {
        openDetailsPanel();
    } else {
        closeDetailsPanel();
    }
}

async function renderCurrentPage() {
    const paginatedCards = getPaginatedCards();

    const listViewContainer = document.getElementById("listViewContainer");
    const imageViewContainer = document.getElementById("imageViewContainer");

    if (currentView === "list") {
        listViewContainer.classList.remove("hidden");
        imageViewContainer.classList.add("hidden");
        renderListView(paginatedCards);
    } else {
        imageViewContainer.classList.remove("hidden");
        listViewContainer.classList.add("hidden");
        await renderImageView(paginatedCards);
    }

    updatePaginationControls();
    const detailsPanel = document.getElementById("detailsPanel");
    if (detailsPanel && !detailsPanel.classList.contains("hidden")) {
        renderDetailsPanel();
    }
}

async function loadCards() {
    try {
        const response = await fetch("http://localhost:3000/getCards");

        if (!response.ok) {
            throw new Error(`Failed to fetch cards: ${response.status}`);
        }

        const savedCards = await response.json();

        if (Array.isArray(savedCards)) {
            allCards = savedCards;
        } else if (savedCards?.data?.cards && Array.isArray(savedCards.data.cards)) {
            allCards = savedCards.data.cards;
        } else {
            allCards = [];
        }

        advancedFilteredCards = [];
        filteredCards = [...allCards];

        if (currentSortColumn) {
            filteredCards = sortCards(filteredCards, currentSortColumn, currentSortDirection);
        }

        const totalPages = Math.max(1, Math.ceil(filteredCards.length / itemsPerPage));
        if (currentPage > totalPages) currentPage = totalPages;

        updateSortIcons();
        await renderCurrentPage();
    } catch (error) {
        console.error("Error fetching data from the server", error);
        allCards = [];
        advancedFilteredCards = [];
        filteredCards = [];
        await renderCurrentPage();
    }
}
document.getElementById("closeImageZoomModal").addEventListener("click", closeImageZoom);

document.getElementById("imageZoomModal").addEventListener("click", e => {
    if (e.target.id === "imageZoomModal") {
        closeImageZoom();
    }
});

document.addEventListener("keydown", e => {
    if (e.key === "Escape") {
        closeImageZoom();
    }
});
function openModalById(id) {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = "block";
}

function closeModalById(id) {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = "none";
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

async function searchCardsByNameFromApi(name) {
    const trimmed = String(name || "").trim();
    if (!trimmed) return [];

    try {
        // EXACT name + include ALL printings (arts)
        const query = `!"${trimmed}" unique:prints`;

        let url = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(query)}`;
        let allResults = [];

        // Handle pagination (Scryfall returns 175 per page max)
        while (url) {
            const response = await fetch(url);

            if (!response.ok) {
                if (response.status === 404) return [];
                throw new Error(`Search failed: ${response.status}`);
            }

            const data = await response.json();

            if (Array.isArray(data.data)) {
                allResults.push(...data.data);
            }

            url = data.has_more ? data.next_page : null;
        }

        return allResults;
    } catch (error) {
        console.error("Error searching cards by name:", error);
        return [];
    }
}

function buildManualCardFromScryfall(card, overrides = {}) {
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

async function saveParsedCardsToDatabase(cardsToSave) {
    if (!Array.isArray(cardsToSave) || !cardsToSave.length) {
        alert("No cards to save.");
        return false;
    }

    try {
        const response = await fetch("http://localhost:3000/saveCards", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ cards: cardsToSave })
        });

        const result = await response.json().catch(() => null);

        if (!response.ok) {
            throw new Error(result?.error || `Failed to save cards: ${response.status}`);
        }

        await loadCards();
        return true;
    } catch (error) {
        console.error("Error saving cards:", error);
        alert(error.message || "Failed to save cards.");
        return false;
    }
}

function renderManualSearchResults(cards) {
    const resultsContainer = document.getElementById("manualCardSearchResults");
    if (!resultsContainer) return;

    if (!cards.length) {
        resultsContainer.innerHTML = `<div class="manual-search-empty">No matching cards were found.</div>`;
        return;
    }

    resultsContainer.innerHTML = `
        <div class="manual-search-results">
            ${cards.map((card, index) => {
                const imageUrl =
                    card.image_uris?.normal ||
                    card.image_uris?.large ||
                    card.card_faces?.[0]?.image_uris?.normal ||
                    "";

                return `
                    <div class="manual-search-card">
                        <h4>${escapeHtml(card.name)}</h4>

                        <div class="manual-search-meta">
                            <div><strong>Set:</strong> ${escapeHtml(card.set_name || card.set || "")}</div>
                            <div><strong>Collector #:</strong> ${escapeHtml(card.collector_number || "")}</div>
                            <div><strong>Type:</strong> ${escapeHtml(card.type_line || "")}</div>
                            <div><strong>Rarity:</strong> ${escapeHtml(card.rarity || "")}</div>
                        </div>

                        ${imageUrl ? `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(card.name)}" style="width:120px; border-radius:8px; margin-bottom:12px;">` : ""}

                        <div class="manual-search-actions">
                            <label>
                                <input type="checkbox" class="manual-foil-checkbox" data-index="${index}">
                                Foil
                            </label>

                            <label>
                                Art
                                <input type="text" class="manual-art-input" data-index="${index}" placeholder="Normal">
                            </label>

                            <button type="button" class="btnSelectManualCard" data-index="${index}">Add This Card</button>
                        </div>
                    </div>
                `;
            }).join("")}
        </div>
    `;

        resultsContainer.querySelectorAll(".btnSelectManualCard").forEach(button => {
        button.addEventListener("click", async () => {
            const index = Number(button.dataset.index);
            const card = cards[index];
            if (!card) return;

            const foilCheckbox = resultsContainer.querySelector(`.manual-foil-checkbox[data-index="${index}"]`);
            const artInput = resultsContainer.querySelector(`.manual-art-input[data-index="${index}"]`);

            const quantity = parseInt(document.getElementById("manualQuantityInput").value, 10) || 1;
            const storage = document.getElementById("manualStorageInput").value.trim();
            const foil = foilCheckbox ? foilCheckbox.checked : false;
            const art = (artInput?.value || "").trim() || "Normal";

            const cardToSave = buildManualCardFromScryfall(card, {
                quantity,
                storage,
                foil,
                art
            });

            const saved = await saveParsedCardsToDatabase([cardToSave]);
            if (!saved) return;

            closeModalById("manualAddModal");
            closeModalById("addCardsChoiceModal");

            document.getElementById("manualCardNameInput").value = "";
            document.getElementById("manualQuantityInput").value = 1;
            document.getElementById("manualStorageInput").value = "";
            resultsContainer.innerHTML = "";
        });
    });
}

async function handleManualCardSearch() {
    const input = document.getElementById("manualCardNameInput");
    const resultsContainer = document.getElementById("manualCardSearchResults");

    if (!input || !resultsContainer) return;

    const query = input.value.trim();
    if (!query) {
        alert("Card name is required.");
        input.focus();
        return;
    }

    resultsContainer.innerHTML = `<div class="manual-search-empty">Searching...</div>`;

    const matches = await searchCardsByNameFromApi(query);

    const filteredMatches = matches.filter(card =>
        String(card.name || "").toLowerCase().includes(query.toLowerCase())
    );

    renderManualSearchResults(filteredMatches);
}

function openFileUploadPicker() {
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
                    if (!row.length || row.every(cell => !String(cell || "").trim())) continue;

                    let cardName = getValue(row, columnMapping.cardName, "").trim();
                    if (!cardName) continue;

                    let artContent = getValue(row, columnMapping.art, "").trim();
                    const extracted = extractParentheticalContent(cardName);
                    cardName = extracted.cleanedName;

                    if (!extracted.parentheticalContent) {
                        artContent = artContent || "Normal";
                    } else {
                        artContent = artContent
                            ? `${extracted.parentheticalContent} ${artContent}`
                            : extracted.parentheticalContent;
                    }

                    artContent = removeNumbers(artContent) || "Normal";

                    parsedCards.push({
                        quantity: getValue(row, columnMapping.quantity, "1"),
                        name: cardName,
                        type: getValue(row, columnMapping.type, ""),
                        cost: getValue(row, columnMapping.cost, ""),
                        colors: getValue(row, columnMapping.colors, ""),
                        set: getValue(row, columnMapping.set, ""),
                        art: artContent,
                        storage: getValue(row, columnMapping.storage, ""),
                        storageLocation: getValue(row, columnMapping.storage, ""),
                        lastUpdated: currentDate,
                        collectorNumber: getValue(row, columnMapping.collectorNumber, ""),
                        foil: normalizeBool(getValue(row, columnMapping.foil, "")),
                        condition: getValue(row, columnMapping.condition, ""),
                        language: getValue(row, columnMapping.language, ""),
                        alter: normalizeBool(getValue(row, columnMapping.alter, "")),
                        proxy: normalizeBool(getValue(row, columnMapping.proxy, ""))
                    });
                }

                const mergedCards = aggregateCards(parsedCards);
                await saveParsedCardsToDatabase(mergedCards);
            } catch (error) {
                console.error("Error processing file:", error);
                alert("There was a problem reading the file.");
            }
        };

        reader.readAsText(file);
    });

    input.click();
}
document.getElementById("btnAddCards").addEventListener("click", () => {
    openModalById("addCardsChoiceModal");
});

document.getElementById("btnAddCardsByFile").addEventListener("click", () => {
    closeModalById("addCardsChoiceModal");
    openFileUploadPicker();
});

document.getElementById("btnAddCardsByText").addEventListener("click", () => {
    closeModalById("addCardsChoiceModal");
    openModalById("manualAddModal");

    const input = document.getElementById("manualCardNameInput");
    if (input) input.focus();
});

document.getElementById("btnManualSearchCard").addEventListener("click", handleManualCardSearch);

document.getElementById("btnManualClearSearch").addEventListener("click", () => {
    document.getElementById("manualCardNameInput").value = "";
    document.getElementById("manualQuantityInput").value = 1;
    document.getElementById("manualStorageInput").value = "";
    document.getElementById("manualCardSearchResults").innerHTML = "";
});

document.getElementById("manualCardNameInput").addEventListener("keydown", e => {
    if (e.key === "Enter") {
        e.preventDefault();
        handleManualCardSearch();
    }
});

document.getElementById("closeAddCardsChoiceModal").addEventListener("click", () => {
    closeModalById("addCardsChoiceModal");
});

document.getElementById("closeManualAddModal").addEventListener("click", () => {
    closeModalById("manualAddModal");
});

window.addEventListener("click", e => {
    if (e.target === document.getElementById("addCardsChoiceModal")) {
        closeModalById("addCardsChoiceModal");
    }

    if (e.target === document.getElementById("manualAddModal")) {
        closeModalById("manualAddModal");
    }
});

function normalizeText(value) {
    return String(value || "").toLowerCase().trim();
}

function includesAllWords(target, query) {
    const targetText = normalizeText(target);
    const words = normalizeText(query).split(/\s+/).filter(Boolean);
    return words.every(word => targetText.includes(word));
}

function compareNumber(value, comparison, target) {
    const num = Number(value);
    const test = Number(target);

    if (Number.isNaN(num) || Number.isNaN(test)) return true;

    switch (comparison) {
        case "eq": return num === test;
        case "lt": return num < test;
        case "lte": return num <= test;
        case "gt": return num > test;
        case "gte": return num >= test;
        default: return true;
    }
}

function parseStoredColors(card) {
    const colors = Array.isArray(card.colors)
        ? card.colors.map(c => String(c).toUpperCase())
        : String(card.colors || "").toUpperCase();

    return ["W", "U", "B", "R", "G", "C"].filter(c =>
        Array.isArray(colors) ? colors.includes(c) : colors.includes(c)
    );
}

function matchesColorFilter(cardColors, selectedColors, comparisonMode) {
    if (!selectedColors.length || !comparisonMode) return true;

    const selected = new Set(selectedColors);
    const actual = new Set(cardColors);

    if (comparisonMode === "exactly") {
        if (selected.size !== actual.size) return false;
        return [...selected].every(color => actual.has(color));
    }

    if (comparisonMode === "including") {
        return [...selected].every(color => actual.has(color));
    }

    if (comparisonMode === "atMost") {
        return [...actual].every(color => selected.has(color) || color === "C");
    }

    return true;
}

function getSelectedValues(selector) {
    return Array.from(document.querySelectorAll(selector))
        .filter(el => el.checked)
        .map(el => el.value);
}

function getAdvancedSearchFilters() {
    return {
        cardName: document.getElementById("advCardName").value.trim(),
        text: document.getElementById("advText").value.trim(),
        typeLine: document.getElementById("advTypeLine").value.trim(),
        allowPartialType: document.getElementById("advAllowPartialType").checked,
        colors: getSelectedValues(".advColor"),
        colorComparison: document.getElementById("advColorComparison").value,
        manaCost: document.getElementById("advManaCost").value.trim(),
        manaValueComparison: document.getElementById("advManaValueComparison").value,
        manaValue: document.getElementById("advManaValue").value.trim(),
        set: document.getElementById("advSet").value.trim(),
        rarities: getSelectedValues(".advRarity"),
        artist: document.getElementById("advArtist").value.trim(),
        flavorText: document.getElementById("advFlavorText").value.trim(),
        loreFinder: document.getElementById("advLoreFinder").value.trim(),
        storage: document.getElementById("advStorage").value.trim(),
        language: document.getElementById("advLanguage").value.trim(),
        sortBy: document.getElementById("advSortBy").value,
        display: document.getElementById("advDisplay").value
    };
}

function sortFilteredCards(cards, sortBy) {
    cards.sort((a, b) => {
        switch (sortBy) {
            case "set":
                return String(a._searchMeta?.setName || a.set || "").localeCompare(
                    String(b._searchMeta?.setName || b.set || "")
                );
            case "manaValue":
                return Number(a._searchMeta?.manaValue || 0) - Number(b._searchMeta?.manaValue || 0);
            case "lastUpdated":
                return getSortableValue(a, "lastUpdated") - getSortableValue(b, "lastUpdated");
            case "quantity":
                return Number(b.quantity || 0) - Number(a.quantity || 0);
            case "name":
            default:
                return String(a.name || "").localeCompare(String(b.name || ""));
        }
    });
}

async function applyAdvancedSearch() {
    currentAdvancedFilters = getAdvancedSearchFilters();
    const results = [];

    for (const card of allCards) {
        const name = card.name || "";
        const typeLine = card.typeLine || card.type || "";
        const oracleText = card.oracleText || card.oracle_text || "";
        const flavorText = card.flavorText || card.flavor_text || "";
        const manaCost = card.manaCost || "";
        const manaValue = card.cmc ?? card.cost ?? "";
        const rarity = card.rarity || "";
        const artist = card.artist || card.art || "";
        const setName = card.setName || card.set_name || card.set || "";
        const language = card.lang || card.language || "";
        const cardColors = Array.isArray(card.colors) && card.colors.length
            ? card.colors
            : parseStoredColors(card);

        let matches = true;

        if (currentAdvancedFilters.cardName && !includesAllWords(name, currentAdvancedFilters.cardName)) {
            matches = false;
        }

        if (matches && currentAdvancedFilters.text && !includesAllWords(oracleText, currentAdvancedFilters.text)) {
            matches = false;
        }

        if (matches && currentAdvancedFilters.typeLine) {
            const filterType = normalizeText(currentAdvancedFilters.typeLine);
            const actualType = normalizeText(typeLine);

            if (currentAdvancedFilters.allowPartialType) {
                if (!actualType.includes(filterType)) matches = false;
            } else {
                const parts = actualType.split(/\s+|—|-/).map(x => x.trim()).filter(Boolean);
                if (!parts.includes(filterType)) matches = false;
            }
        }

        if (matches && currentAdvancedFilters.colors.length) {
            if (!matchesColorFilter(cardColors, currentAdvancedFilters.colors, currentAdvancedFilters.colorComparison)) {
                matches = false;
            }
        }

        if (matches && currentAdvancedFilters.manaCost) {
            if (normalizeText(manaCost) !== normalizeText(currentAdvancedFilters.manaCost)) {
                matches = false;
            }
        }

        if (matches && currentAdvancedFilters.manaValueComparison && currentAdvancedFilters.manaValue) {
            if (!compareNumber(manaValue, currentAdvancedFilters.manaValueComparison, currentAdvancedFilters.manaValue)) {
                matches = false;
            }
        }

        if (
            matches &&
            currentAdvancedFilters.set &&
            !includesAllWords(setName, currentAdvancedFilters.set) &&
            !includesAllWords(card.set || "", currentAdvancedFilters.set)
        ) {
            matches = false;
        }

        if (matches && currentAdvancedFilters.rarities.length) {
            if (!currentAdvancedFilters.rarities.includes(normalizeText(rarity))) {
                matches = false;
            }
        }

        if (matches && currentAdvancedFilters.artist && !includesAllWords(artist, currentAdvancedFilters.artist)) {
            matches = false;
        }

        if (matches && currentAdvancedFilters.flavorText && !includesAllWords(flavorText, currentAdvancedFilters.flavorText)) {
            matches = false;
        }

        if (matches && currentAdvancedFilters.loreFinder) {
            const loreBlob = [name, typeLine, oracleText, flavorText, artist, setName].join(" ");
            if (!includesAllWords(loreBlob, currentAdvancedFilters.loreFinder)) {
                matches = false;
            }
        }

        if (matches && currentAdvancedFilters.storage && !includesAllWords(card.storage || card.storageLocation || "", currentAdvancedFilters.storage)) {
            matches = false;
        }

        if (matches && currentAdvancedFilters.language && !includesAllWords(language, currentAdvancedFilters.language)) {
            matches = false;
        }

        if (matches) {
            results.push({
                ...card,
                _searchMeta: {
                    typeLine,
                    oracleText,
                    flavorText,
                    manaCost,
                    manaValue,
                    rarity,
                    artist,
                    setName,
                    language,
                    cardColors
                }
            });
        }
    }

    sortFilteredCards(results, currentAdvancedFilters.sortBy);

    advancedFilteredCards = [...results];
    filteredCards = [...results];

    if (currentSortColumn) {
        filteredCards = sortCards(filteredCards, currentSortColumn, currentSortDirection);
    }

    if (currentAdvancedFilters.display === "list") {
        currentView = "list";
    } else if (currentAdvancedFilters.display === "image") {
        currentView = "image";
    }

    currentPage = 1;
    updateSortIcons();
    document.getElementById("advancedSearchModal").style.display = "none";
    await renderCurrentPage();
}

function clearAdvancedSearch() {
    document.getElementById("advCardName").value = "";
    document.getElementById("advText").value = "";
    document.getElementById("advTypeLine").value = "";
    document.getElementById("advAllowPartialType").checked = false;
    document.querySelectorAll(".advColor").forEach(el => (el.checked = false));
    document.getElementById("advColorComparison").value = "";
    document.getElementById("advManaCost").value = "";
    document.getElementById("advManaValueComparison").value = "";
    document.getElementById("advManaValue").value = "";
    document.getElementById("advSet").value = "";
    document.querySelectorAll(".advRarity").forEach(el => (el.checked = false));
    document.getElementById("advArtist").value = "";
    document.getElementById("advFlavorText").value = "";
    document.getElementById("advLoreFinder").value = "";
    document.getElementById("advStorage").value = "";
    document.getElementById("advLanguage").value = "";
    document.getElementById("advSortBy").value = "name";
    document.getElementById("advDisplay").value = "";

    currentAdvancedFilters = {};
    advancedFilteredCards = [];

    applySearchFilter();
    document.getElementById("advancedSearchModal").style.display = "none";
}

function toggleView() {
    currentView = currentView === "list" ? "image" : "list";
    const toggleButton = document.getElementById("btnToggleView");
    if (toggleButton) {
        toggleButton.textContent =
            currentView === "list" ? "Switch to Image View" : "Switch to List View";
    }
    renderCurrentPage();
}

function closeEditModal() {
    document.getElementById("editModal").style.display = "none";
    selectedCard = null;
}

function closeStorageModal() {
    document.getElementById("storageModal").style.display = "none";
    selectedCard = null;
}

function closeAdvancedSearchModal() {
    document.getElementById("advancedSearchModal").style.display = "none";
}

document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".sortable").forEach(header => {
        header.addEventListener("click", () => {
            handleColumnSort(header.dataset.column);
        });
    });
    document.getElementById("btnToggleDetailsPanel")?.addEventListener("click", () => {
        toggleDetailsPanel();
        document.getElementById("settingsMenu").style.display = "none";
    });

document.getElementById("btnCloseDetailsPanel")?.addEventListener("click", closeDetailsPanel);
    document.getElementById("txtSearchLibrary")?.addEventListener("input", applySearchFilter);
    document.getElementById("btnExportCards")?.addEventListener("click", exportCardsToCSV);

    document.getElementById("btnPrevPage")?.addEventListener("click", async () => {
        if (currentPage > 1) {
            currentPage--;
            await renderCurrentPage();
        }
    });

    document.getElementById("btnNextPage")?.addEventListener("click", async () => {
        const totalPages = Math.max(1, Math.ceil(filteredCards.length / itemsPerPage));
        if (currentPage < totalPages) {
            currentPage++;
            await renderCurrentPage();
        }
    });

    document.getElementById("saveEditButton")?.addEventListener("click", saveEditChanges);
    document.getElementById("closeEditModal")?.addEventListener("click", closeEditModal);

    document.getElementById("btnSaveStorage")?.addEventListener("click", saveStorageChanges);
    document.getElementById("btnCancelStorage")?.addEventListener("click", closeStorageModal);

    document.getElementById("btnAdvanceSearch")?.addEventListener("click", () => {
        document.getElementById("advancedSearchModal").style.display = "block";
    });

    document.getElementById("closeAdvancedSearchModal")?.addEventListener("click", closeAdvancedSearchModal);
    document.getElementById("btnApplyAdvancedSearch")?.addEventListener("click", applyAdvancedSearch);
    document.getElementById("btnClearAdvancedSearch")?.addEventListener("click", clearAdvancedSearch);

    document.getElementById("btnSettings")?.addEventListener("click", e => {
        e.stopPropagation();
        const menu = document.getElementById("settingsMenu");
        menu.style.display = menu.style.display === "block" ? "none" : "block";
    });

    document.getElementById("btnToggleView")?.addEventListener("click", () => {
        toggleView();
        document.getElementById("settingsMenu").style.display = "none";
    });

    window.addEventListener("click", e => {
        const settingsMenu = document.getElementById("settingsMenu");
        const settingsButton = document.getElementById("btnSettings");

        if (settingsMenu && settingsButton) {
            if (!settingsMenu.contains(e.target) && !settingsButton.contains(e.target)) {
                settingsMenu.style.display = "none";
            }
        }

        if (e.target === document.getElementById("editModal")) closeEditModal();
        if (e.target === document.getElementById("storageModal")) closeStorageModal();
        if (e.target === document.getElementById("advancedSearchModal")) closeAdvancedSearchModal();

        document.querySelectorAll(".options-menu").forEach(menu => {
            if (!menu.contains(e.target)) {
                menu.style.display = "none";
            }
        });
    });

    loadCards();
});