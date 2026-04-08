import { createOptionsMenu, wireOptionsButton } from "./optionsMenu.js";
import { showHoverImage, moveHoverImage, hideHoverImage } from "../utils/getCardHover.js";
import { fetchCardData, calculateTotalMana, extractSymbols } from "../getCardData.js";

function firstNonEmpty(...values) {
    for (const value of values) {
        if (value !== undefined && value !== null && value !== "") {
            return value;
        }
    }
    return "";
}

function getCardFace(card) {
    if (Array.isArray(card.card_faces) && card.card_faces.length > 0) {
        return card.card_faces[0];
    }

    if (Array.isArray(card.cardFaces) && card.cardFaces.length > 0) {
        return card.cardFaces[0];
    }

    return null;
}

function getImageSrc(card) {
    const face = getCardFace(card);

    const source = firstNonEmpty(
        card.sourceURL,
        card.sourceUrl,
        card.imageUrl,
        card.image_url,
        card.imageUris?.normal,
        card.imageUris?.large,
        card.imageUris?.small,
        card.image_uris?.normal,
        card.image_uris?.large,
        card.image_uris?.small,
        face?.image_uris?.normal,
        face?.image_uris?.large,
        face?.image_uris?.small,
        face?.imageUris?.normal,
        face?.imageUris?.large,
        face?.imageUris?.small
    );

    if (!source) return "";

    if (
        source.startsWith("http://") ||
        source.startsWith("https://") ||
        source.startsWith("data:")
    ) {
        return source;
    }

    if (source.startsWith("/")) {
        return `http://localhost:3000${source}`;
    }

    return source;
}

function getTypeText(card) {
    const face = getCardFace(card);

    return firstNonEmpty(
        card.typeLine,
        card.type_line,
        card.type,
        face?.type_line,
        face?.typeLine,
        face?.type
    );
}

function getManaCostString(card) {
    const face = getCardFace(card);

    return firstNonEmpty(
        card.manaCost,
        card.mana_cost,
        card.mana,
        face?.mana_cost,
        face?.manaCost
    );
}

function getFallbackCost(card) {
    return firstNonEmpty(
        card.cmc,
        card.mv,
        card.convertedManaCost,
        card.converted_mana_cost,
        card.cost
    );
}

function getSetText(card) {
    return firstNonEmpty(
        card.setName,
        card.set_name,
        card.set
    );
}

function getStorageText(card) {
    return firstNonEmpty(
        card.storageLocation,
        card.storage_location,
        card.storage
    );
}

function getUpdatedText(card) {
    const updatedValue = firstNonEmpty(
        card.updatedAt,
        card.updated_at,
        card.lastUpdated
    );

    if (!updatedValue) return "";

    const date = new Date(updatedValue);
    return Number.isNaN(date.getTime()) ? updatedValue : date.toLocaleString();
}

function createManaSymbolContainer() {
    const wrapper = document.createElement("div");
    wrapper.className = "mana-symbols-cell";
    return wrapper;
}

function appendManaSymbols(container, manaCost) {
    if (!container || !manaCost) return;

    const symbols = extractSymbols(manaCost);

    symbols.forEach(symbol => {
        const img = document.createElement("img");
        img.src = `https://svgs.scryfall.io/card-symbols/${symbol.toUpperCase()}.svg`;
        img.alt = symbol;
        img.title = symbol;
        img.className = "mana-symbol-icon";
        img.onerror = () => {
            img.style.display = "none";
        };
        container.appendChild(img);
    });
}

export async function renderListView(cards, actions) {
    const tableBody = document.getElementById("displayTableBody");
    if (!tableBody) return;

    tableBody.innerHTML = "";

    for (const card of cards) {
        const tr = document.createElement("tr");

        const addTextCell = (content, options = {}) => {
            const td = document.createElement("td");
            td.textContent = content ?? "";

            if (options.isArtCell) {
                const hoverSrc = getImageSrc(card);

                if (hoverSrc) {
                    td.style.cursor = "zoom-in";

                    td.addEventListener("mouseenter", event => {
                        showHoverImage(event, hoverSrc);
                    });

                    td.addEventListener("mousemove", event => {
                        moveHoverImage(event);
                    });

                    td.addEventListener("mouseleave", () => {
                        hideHoverImage();
                    });
                }
            }

            tr.appendChild(td);
            return td;
        };

        const addNodeCell = node => {
            const td = document.createElement("td");
            td.appendChild(node);
            tr.appendChild(td);
            return td;
        };

        addTextCell(card.quantity ?? "");
        addTextCell(card.name ?? "");
        addTextCell(getTypeText(card));

        const manaCost = getManaCostString(card);
        const totalCost =
            manaCost
                ? calculateTotalMana(manaCost)
                : getFallbackCost(card);

        addTextCell(totalCost ?? "");

        const colorsContainer = createManaSymbolContainer();
        addNodeCell(colorsContainer);

        addTextCell(getSetText(card));
        addTextCell(card.art || "Preview", { isArtCell: true });
        addTextCell(getStorageText(card));
        addTextCell(getUpdatedText(card));

        const optionsTd = document.createElement("td");
        optionsTd.style.position = "relative";

        const optionsButton = document.createElement("button");
        optionsButton.className = "options-button";
        optionsButton.textContent = "⋮";
        optionsButton.title = "Options";

        const optionsMenu = createOptionsMenu(card, actions);
        wireOptionsButton(optionsButton, optionsMenu);

        optionsTd.appendChild(optionsButton);
        optionsTd.appendChild(optionsMenu);
        tr.appendChild(optionsTd);

        tableBody.appendChild(tr);

        if (manaCost) {
            appendManaSymbols(colorsContainer, manaCost);
        } else {
            try {
                const scryfallData = await fetchCardData(card.name);
                const fetchedManaCost =
                    scryfallData?.mana_cost ||
                    scryfallData?.card_faces?.[0]?.mana_cost ||
                    "";

                if (fetchedManaCost) {
                    colorsContainer.innerHTML = "";
                    appendManaSymbols(colorsContainer, fetchedManaCost);

                    if (totalCost === "" || totalCost === null || totalCost === undefined) {
                        tr.cells[3].textContent = calculateTotalMana(fetchedManaCost);
                    }
                }
            } catch (error) {
                console.error(`Failed to fetch mana symbols for ${card.name}:`, error);
            }
        }
    }
}