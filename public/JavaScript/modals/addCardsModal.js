import { saveCards } from "../api/cardsApi.js";
import { searchCardsByNameFromApi } from "../api/scryfallApi.js";
import { parseDelimitedText, getColumnMapping, getValue } from "../utils/csvUtils.js";
import {
    buildManualCardFromScryfall,
    extractParentheticalContent,
    removeNumbers,
    aggregateCards
} from "../utils/cardTransforms.js";
import { openModalById, closeModalById, escapeHtml } from "../utils/domUtils.js";

export function bindAddCardsModal({ reloadCards }) {
    document.getElementById("btnAddCards")?.addEventListener("click", () => {
        openModalById("addCardsChoiceModal");
    });

    document.getElementById("btnAddCardsByFile")?.addEventListener("click", () => {
        closeModalById("addCardsChoiceModal");
        openFileUploadPicker(reloadCards);
    });

    document.getElementById("btnAddCardsByText")?.addEventListener("click", () => {
        closeModalById("addCardsChoiceModal");
        openModalById("manualAddModal");
        document.getElementById("manualCardNameInput")?.focus();
    });

    document.getElementById("btnManualSearchCard")?.addEventListener("click", () => {
        handleManualCardSearch(reloadCards);
    });

    document.getElementById("btnManualClearSearch")?.addEventListener("click", clearManualSearch);

    document.getElementById("manualCardNameInput")?.addEventListener("keydown", e => {
        if (e.key === "Enter") {
            e.preventDefault();
            handleManualCardSearch(reloadCards);
        }
    });

    document.getElementById("closeAddCardsChoiceModal")?.addEventListener("click", () => {
        closeModalById("addCardsChoiceModal");
    });

    document.getElementById("closeManualAddModal")?.addEventListener("click", () => {
        closeModalById("manualAddModal");
    });
}

function clearManualSearch() {
    document.getElementById("manualCardNameInput").value = "";
    document.getElementById("manualQuantityInput").value = 1;
    document.getElementById("manualStorageInput").value = "";
    document.getElementById("manualCardSearchResults").innerHTML = "";
}

async function handleManualCardSearch(reloadCards) {
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
    renderManualSearchResults(matches, reloadCards);
}

function renderManualSearchResults(cards, reloadCards) {
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
                            <div><strong>Set:</strong> ${escapeHtml(card.set_name || "")}</div>
                            <div><strong>Set Code:</strong> ${escapeHtml(card.set || "")}</div>
                            <div><strong>Collector #:</strong> ${escapeHtml(card.collector_number || "")}</div>
                            <div><strong>Artist:</strong> ${escapeHtml(card.artist || "Unknown")}</div>
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

            await saveCards([cardToSave]);
            await reloadCards();

            closeModalById("manualAddModal");
            closeModalById("addCardsChoiceModal");
            clearManualSearch();
        });
    });
}

function openFileUploadPicker(reloadCards) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".txt,.csv,text/plain,text/csv";

    input.addEventListener("change", async event => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();

        reader.onload = async e => {
            try {
                const content = e.target.result;
                const rows = parseDelimitedText(content, file.name);
                if (rows.length === 0) return;

                const columnMapping = getColumnMapping(rows[0]);
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
                        quantity: Number(getValue(row, columnMapping.quantity, "1")) || 1,
                        name: cardName,
                        nameLower: cardName.toLowerCase(),

                        set: getValue(row, columnMapping.set, "").trim(),
                        setName: getValue(row, columnMapping.setName, "").trim(),

                        typeLine: getValue(row, columnMapping.type, "").trim(),
                        manaCost: getValue(row, columnMapping.manaCost, "").trim(),
                        cmc: Number(getValue(row, columnMapping.cost, 0)) || 0,

                        colors: String(getValue(row, columnMapping.colors, ""))
                            .split(/[\s,,]+/)
                            .map(color => color.trim())
                            .filter(Boolean),

                        colorIdentity: [],
                        rarity: getValue(row, columnMapping.rarity, "").trim(),
                        artist: "",
                        oracleText: "",
                        scryfallId: "",
                        imageUrl: "",

                        art: artContent,
                        storageLocation: getValue(row, columnMapping.storage, "").trim()
                    });
                }

                const mergedCards = aggregateCards(parsedCards);
                await saveCards(mergedCards);
                await reloadCards();
            } catch (error) {
                console.error("Error processing file:", error);
                alert("There was a problem reading or saving the file.");
            }
        };

        reader.readAsText(file);
    });

    input.click();
}