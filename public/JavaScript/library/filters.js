import { state } from "./state.js";

export function applySearchFilter(renderCurrentPage) {
    const query = document.getElementById("txtSearchLibrary")?.value.trim().toLowerCase() || "";

    const base = state.advancedFilteredCards.length
        ? state.advancedFilteredCards
        : state.allCards;

    if (!query) {
        state.filteredCards = [...base];
    } else {
        state.filteredCards = base.filter(card =>
            String(card.name || "").toLowerCase().includes(query)
        );
    }

    state.currentPage = 1;
    renderCurrentPage();
}

export function applyAdvancedSearch(renderCurrentPage) {
    const cardName = document.getElementById("advCardName")?.value.trim().toLowerCase() || "";
    const text = document.getElementById("advText")?.value.trim().toLowerCase() || "";
    const typeLine = document.getElementById("advTypeLine")?.value.trim().toLowerCase() || "";
    const set = document.getElementById("advSet")?.value.trim().toLowerCase() || "";
    const storage = document.getElementById("advStorage")?.value.trim().toLowerCase() || "";
    const artist = document.getElementById("advArtist")?.value.trim().toLowerCase() || "";
    const flavorText = document.getElementById("advFlavorText")?.value.trim().toLowerCase() || "";
    const manaCost = document.getElementById("advManaCost")?.value.trim().toLowerCase() || "";
    const raritySelections = [...document.querySelectorAll(".advRarity:checked")]
        .map(input => input.value.toLowerCase());

    state.advancedFilteredCards = state.allCards.filter(card => {
        const matchesCardName =
            !cardName || String(card.name || "").toLowerCase().includes(cardName);

        const matchesText =
            !text || String(card.oracleText || "").toLowerCase().includes(text);

        const matchesType =
            !typeLine || String(card.typeLine || "").toLowerCase().includes(typeLine);

        const matchesSet =
            !set ||
            String(card.set || "").toLowerCase().includes(set) ||
            String(card.setName || "").toLowerCase().includes(set);

        const matchesStorage =
            !storage || String(card.storageLocation || "").toLowerCase().includes(storage);

        const matchesArtist =
            !artist || String(card.artist || "").toLowerCase().includes(artist);

        const matchesFlavor =
            !flavorText || String(card.flavorText || "").toLowerCase().includes(flavorText);

        const matchesManaCost =
            !manaCost || String(card.manaCost || "").toLowerCase().includes(manaCost);

        const matchesRarity =
            raritySelections.length === 0 ||
            raritySelections.includes(String(card.rarity || "").toLowerCase());

        return (
            matchesCardName &&
            matchesText &&
            matchesType &&
            matchesSet &&
            matchesStorage &&
            matchesArtist &&
            matchesFlavor &&
            matchesManaCost &&
            matchesRarity
        );
    });

    state.filteredCards = [...state.advancedFilteredCards];
    state.currentPage = 1;
    renderCurrentPage();
}

export function clearAdvancedSearch(renderCurrentPage) {
    document.getElementById("advCardName").value = "";
    document.getElementById("advText").value = "";
    document.getElementById("advTypeLine").value = "";
    document.getElementById("advAllowPartialType").checked = false;
    document.querySelectorAll(".advColor").forEach(input => input.checked = false);
    document.getElementById("advColorComparison").value = "";
    document.getElementById("advManaCost").value = "";
    document.getElementById("advManaValueComparison").value = "";
    document.getElementById("advManaValue").value = "";
    document.getElementById("advSet").value = "";
    document.querySelectorAll(".advRarity").forEach(input => input.checked = false);
    document.getElementById("advArtist").value = "";
    document.getElementById("advFlavorText").value = "";
    document.getElementById("advLoreFinder").value = "";
    document.getElementById("advStorage").value = "";
    document.getElementById("advLanguage").value = "";
    document.getElementById("advSortBy").value = "name";
    document.getElementById("advDisplay").value = "";

    state.advancedFilteredCards = [];
    state.filteredCards = [...state.allCards];
    state.currentPage = 1;
    renderCurrentPage();
}