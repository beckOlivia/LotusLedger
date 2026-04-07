const hoverImage = document.createElement("img");
hoverImage.style.position = "absolute";
hoverImage.style.display = "none";
hoverImage.style.border = "2px solid black";
hoverImage.style.borderRadius = "5px";
hoverImage.style.maxWidth = "200px";
hoverImage.style.zIndex = "1000";
document.body.appendChild(hoverImage);

// -----------------------
// CACHE
// -----------------------
const cardCache = new Map();
let symbologyCache = null;
let symbologyPromise = null;

// -----------------------
// SHARED FETCH HELPERS
// -----------------------
export async function fetchCardData(cardName) {
    const key = String(cardName || "").trim().toLowerCase();

    if (!key) return null;

    if (cardCache.has(key)) {
        return cardCache.get(key);
    }

    try {
        const apiUrl = `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(cardName)}`;
        const response = await fetch(apiUrl);
        const data = await response.json();

        if (data.object === "card") {
            cardCache.set(key, data);
            return data;
        }

        return null;
    } catch (error) {
        console.error(`Error fetching card data for ${cardName}:`, error);
        return null;
    }
}

async function fetchSymbology() {
    if (symbologyCache) {
        return symbologyCache;
    }

    if (symbologyPromise) {
        return symbologyPromise;
    }

    symbologyPromise = fetch(`https://api.scryfall.com/symbology`)
        .then(response => response.json())
        .then(data => {
            symbologyCache = data;
            return data;
        })
        .catch(error => {
            console.error("Error fetching symbology:", error);
            return null;
        })
        .finally(() => {
            symbologyPromise = null;
        });

    return symbologyPromise;
}

// Optional: preload a batch of cards for current page
export async function preloadCards(cardNames = []) {
    const uniqueNames = [...new Set(cardNames.filter(Boolean))];
    await Promise.all(uniqueNames.map(name => fetchCardData(name)));
}

// -----------------------
// EXISTING FEATURES
// -----------------------
export async function getCardType(cardName, row) {
    const data = await fetchCardData(cardName);

    if (!data) return;

    const cardType = data.type_line || "Unknown Type";
    const typeCell = row.cells[2];

    if (typeCell) {
        typeCell.textContent = cardType;
    }
}

export function calculateTotalMana(manaCost) {
    if (!manaCost || manaCost === "N/A") return 0;

    let total = 0;
    const matches = manaCost.match(/\{([^}]+)\}/g);

    if (matches) {
        matches.forEach(match => {
            const value = match.replace(/\{|\}/g, "");

            if (!isNaN(value)) {
                total += parseInt(value, 10);
            } else if (value !== "X") {
                total += 1;
            }
        });
    }

    return total;
}

export async function getManaColors(cardName, row) {
    const data = await fetchCardData(cardName);
    if (!data) return;

    const manaCost = data.mana_cost || "";
    const typeCell = row.cells[4];

    if (!typeCell) return;

    typeCell.innerHTML = "";

    const symbolData = await fetchSymbology();
    if (!symbolData?.data) return;

    const symbols = extractSymbols(manaCost);
    symbols.forEach(symbol => {
        makeSymbol(symbol, symbolData, typeCell);
    });
}

export function extractSymbols(manaCost) {
    const matches = manaCost.match(/\{([^}]+)\}/g) || [];
    return matches.map(match => match.replace(/[{}]/g, ""));
}

function makeSymbol(symbol, symbolData, typeCell) {
    const foundSymbol = symbolData.data.find(s => s.symbol === `{${symbol}}`);
    const imageUrl = foundSymbol
        ? foundSymbol.svg_uri
        : `https://c2.scryfall.com/file/scryfall-symbols/card-symbols/${symbol}.svg`;

    const img = document.createElement("img");
    img.src = imageUrl;
    img.alt = symbol;
    img.style.width = "20px";
    img.style.marginRight = "5px";
    typeCell.appendChild(img);
}

export async function getCardCost(cardName, row) {
    const data = await fetchCardData(cardName);
    if (!data) return;

    const cardCost = data.mana_cost || "";
    const totalMana = calculateTotalMana(cardCost);
    const typeCell = row.cells[3];

    if (typeCell) {
        typeCell.textContent = totalMana;
    }
}

export async function showHoverImage(event, cardName, setName, artType) {
    const data = await fetchCardData(cardName);

    if (!data) {
        hoverImage.style.display = "none";
        return;
    }

    if (data.image_uris?.normal) {
        hoverImage.src = data.image_uris.normal;
    } else if (data.card_faces?.[0]?.image_uris?.normal) {
        hoverImage.src = data.card_faces[0].image_uris.normal;
    } else {
        hoverImage.style.display = "https://static.vecteezy.com/system/resources/previews/065/319/368/non_2x/team-management-failure-with-error-or-process-slowdown-vector.jpg";
        return;
    }

    hoverImage.style.display = "block";
    hoverImage.style.top = `${event.pageY + 10}px`;
    hoverImage.style.left = `${event.pageX + 10}px`;
}

export function hideHoverImage() {
    hoverImage.style.display = "none";
}

export function attachHoverEffectToArtCells() {
    const tableBody = document.getElementById("displayTableBody");
    tableBody.querySelectorAll("tr").forEach(row => {
        const artCell = row.cells[6];
        const cardName = row.cells[1]?.textContent || "";
        const setName = row.cells[5]?.textContent || "";
        const artType = row.cells[6]?.textContent || "";

        if (artCell) {
            artCell.addEventListener("mouseenter", (event) =>
                showHoverImage(event, cardName, setName, artType)
            );
            artCell.addEventListener("mouseleave", hideHoverImage);
        }
    });
}