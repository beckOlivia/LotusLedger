import { state } from "./state.js";

export function getSortableValue(card, column) {
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

export function sortCards(cards, column, direction = "asc") {
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

export function updateSortIcons() {
    document.querySelectorAll(".sortable").forEach(header => {
        const icon = header.querySelector(".sort-icon");
        header.classList.remove("active", "desc");

        if (icon) icon.textContent = "↕";

        if (header.dataset.column === state.currentSortColumn) {
            header.classList.add("active");

            if (icon) {
                icon.textContent = state.currentSortDirection === "asc" ? "▲" : "▼";
            }

            if (state.currentSortDirection === "desc") {
                header.classList.add("desc");
            }
        }
    });
}