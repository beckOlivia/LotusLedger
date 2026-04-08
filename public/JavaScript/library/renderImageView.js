import { preloadCards, calculateTotalMana } from "../getCardData.js";
import { openImageZoom } from "../modals/imageZoomModal.js";
import { createOptionsMenu, wireOptionsButton } from "./optionsMenu.js";

function getImageSrc(card) {
    if (!card) return "";

    if (card.sourceURL) return card.sourceURL;

    if (card.image?.data) {
        return card.image.data.startsWith("data:")
            ? card.image.data
            : `data:${card.image.contentType || "image/png"};base64,${card.image.data}`;
    }

    if (card.imageUris?.normal) return card.imageUris.normal;
    if (card.imageUris?.large) return card.imageUris.large;
    if (card.imageUris?.small) return card.imageUris.small;

    if (card.image_uris?.normal) return card.image_uris.normal;
    if (card.image_uris?.large) return card.image_uris.large;
    if (card.image_uris?.small) return card.image_uris.small;

    if (card.imageUrl) {
        return card.imageUrl.startsWith("http")
            ? card.imageUrl
            : `http://localhost:3000${card.imageUrl}`;
    }

    if (card.image_url) {
        return card.image_url.startsWith("http")
            ? card.image_url
            : `http://localhost:3000${card.image_url}`;
    }

    return "";
}

function getManaCostText(card) {
    const manaCost =
        card.manaCost ??
        card.mana_cost ??
        card.mana ??
        "";

    const cmc =
        card.cmc ??
        card.convertedManaCost ??
        card.converted_mana_cost ??
        card.cost;

    if (cmc !== undefined && cmc !== null && cmc !== "") {
        return cmc;
    }

    if (manaCost) {
        const calculated = calculateTotalMana(manaCost);
        return calculated !== undefined && calculated !== null && calculated !== ""
            ? calculated
            : manaCost;
    }

    return "";
}

function getColorText(card) {
    const rawColors =
        card.colors ??
        card.colorIdentity ??
        card.color_identity ??
        "";

    if (Array.isArray(rawColors)) {
        return rawColors.join(", ");
    }

    if (typeof rawColors === "string") {
        return rawColors;
    }

    return "";
}

function getTypeText(card) {
    return card.typeLine ?? card.type_line ?? card.type ?? "";
}

function getSetText(card) {
    return card.setName ?? card.set_name ?? card.set ?? "";
}

function getStorageText(card) {
    return card.storage ?? card.storageLocation ?? card.storage_location ?? "";
}

export async function renderImageView(cards, actions) {
    const container = document.getElementById("imageViewContainer");
    if (!container) return;

    container.innerHTML = "";

    await preloadCards(cards.map(card => card.name).filter(Boolean));

    for (const card of cards) {
        const cardDiv = document.createElement("div");
        cardDiv.className = "image-card";

        const optionsButton = document.createElement("button");
        optionsButton.className = "options-button";
        optionsButton.textContent = "⋮";

        const optionsMenu = createOptionsMenu(card, actions);
        wireOptionsButton(optionsButton, optionsMenu);

        const img = document.createElement("img");
        img.alt = card.name || "Card image";

        const imageSrc = getImageSrc(card);
        img.src = imageSrc || "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" width="300" height="420">
                <rect width="100%" height="100%" fill="#202138"/>
                <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
                    fill="white" font-size="20" font-family="Arial">
                    No Image
                </text>
            </svg>
        `);

        img.addEventListener("click", () => {
            if (img.src) {
                openImageZoom(img.src, card.name || "Zoomed card image");
            }
        });

        img.onerror = () => {
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
            const safeValue =
                value === undefined || value === null || value === ""
                    ? "—"
                    : value;
            p.innerHTML = `<strong>${label}:</strong> ${safeValue}`;
            details.appendChild(p);
        };

        addDetail("Quantity", card.quantity);
        addDetail("Card Name", card.name);
        addDetail("Type", getTypeText(card));
        addDetail("Cost", getManaCostText(card));
        addDetail("Colors", getColorText(card));
        addDetail("Set", getSetText(card));
        addDetail("Art", card.art);
        addDetail("Storage", getStorageText(card));
        addDetail("Last Updated", card.lastUpdated ?? card.updatedAt ?? card.updated_at);

        cardDiv.appendChild(optionsButton);
        cardDiv.appendChild(optionsMenu);
        cardDiv.appendChild(img);
        cardDiv.appendChild(title);
        cardDiv.appendChild(details);

        container.appendChild(cardDiv);
    }
}