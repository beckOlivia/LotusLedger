import { state } from "./state.js";

function getCardsForDetailsPanel() {
    return Array.isArray(state.filteredCards) ? state.filteredCards : [];
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

export function renderDetailsPanel() {
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

export function openDetailsPanel() {
    const panel = document.getElementById("detailsPanel");
    if (!panel) return;

    renderDetailsPanel();
    panel.classList.remove("hidden");
    document.body.classList.add("details-panel-open");
}

export function closeDetailsPanel() {
    const panel = document.getElementById("detailsPanel");
    if (!panel) return;

    panel.classList.add("hidden");
    document.body.classList.remove("details-panel-open");
}

export function toggleDetailsPanel() {
    const panel = document.getElementById("detailsPanel");
    if (!panel) return;

    if (panel.classList.contains("hidden")) {
        openDetailsPanel();
    } else {
        closeDetailsPanel();
    }
}