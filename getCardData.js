const hoverImage = document.createElement("img");
hoverImage.style.position = "absolute";
hoverImage.style.display = "none";
hoverImage.style.border = "2px solid black";
hoverImage.style.borderRadius = "5px";
hoverImage.style.maxWidth = "200px";
hoverImage.style.zIndex = "1000";
document.body.appendChild(hoverImage);

export function getCardType(cardName, row) {
    let apiUrl = `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(cardName)}`;

    fetch(apiUrl)
        .then(response => response.json())
        .then(data => {
            if (data.object === "card") {
                let cardType = data.type_line || "Unknown Type";

                // Find the correct column for Type (assuming it's column index 2)
                let typeCell = row.cells[2];
                if (typeCell) {
                    typeCell.textContent = cardType; // Update the table
                }
            }
        })
        .catch(error => {
            console.error(`Error fetching card type for ${cardName}:`, error);
        });
}

export function calculateTotalMana(manaCost) {
    if (!manaCost || manaCost === "N/A") return 0;

    let total = 0;
    const matches = manaCost.match(/\{([^}]+)\}/g); // Match all {X} symbols

    if (matches) {
        matches.forEach(match => {
            let value = match.replace(/\{|\}/g, ""); // Remove {}

            if (!isNaN(value)) {
                total += parseInt(value); // Add generic mana
            } else if (value !== "X") {
                total += 1; // Add 1 for each specific colored mana
            }
        });
    }

    return total;
}

export function getManaColors(cardName, row) {
    let apiUrl = `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(cardName)}`;

    fetch(apiUrl)
        .then(response => response.json())
        .then(data => {
            if (data.object === "card") {
                let manaCost = data.mana_cost || ""; // Raw mana cost string
                let typeCell = row.cells[4]; // Ensure row is passed in as an argument

                if (typeCell) {
                    typeCell.innerHTML = ""; // Clear previous content

                    // Fetch symbology once
                    fetch(`https://api.scryfall.com/symbology`)
                        .then(response => response.json())
                        .then(symbolData => {
                            let symbols = extractSymbols(manaCost);
                            symbols.forEach(symbol => {
                                makeSymbol(symbol, symbolData, typeCell);
                            });
                        })
                        .catch(error => console.error("Error fetching symbology:", error));
                }
            }
        })
        .catch(error => {
            console.error(`Error fetching card data for ${cardName}:`, error);
        });
}

// Extracts individual symbols (e.g., ["3", "W", "U"]) from a mana cost string
function extractSymbols(manaCost) {
    let matches = manaCost.match(/\{([^}]+)\}/g) || []; // Find all `{X}` patterns
    return matches.map(match => match.replace(/[{}]/g, "")); // Remove `{}` brackets
}

// Helper function to append symbol images
function makeSymbol(symbol, symbolData, typeCell) {
    let foundSymbol = symbolData.data.find(s => s.symbol === `{${symbol}}`);

    // If symbol is a number, use its direct URL
    let imageUrl = foundSymbol ? foundSymbol.svg_uri : `https://c2.scryfall.com/file/scryfall-symbols/card-symbols/${symbol}.svg`;

    let img = document.createElement("img");
    img.src = imageUrl;
    img.alt = symbol;
    img.style.width = "20px"; // Adjust size as needed
    img.style.marginRight = "5px";
    typeCell.appendChild(img);
}


export function getCardCost(cardName, row) {
    let apiUrl = `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(cardName)}`;

    fetch(apiUrl)
        .then(response => response.json())
        .then(data => {
            if (data.object === "card") {
                let cardCost = data.mana_cost || " ";
                let totalMana = calculateTotalMana(cardCost);

                // Find the correct column for Type (assuming it's column index 2)
                let typeCell = row.cells[3];
                if (typeCell) {
                    typeCell.textContent = totalMana; // Update the table
                }
            }
        })
        .catch(error => {
            console.error(`Error fetching card type for ${cardName}:`, error);
        });
}

export function showHoverImage(event, cardName, setName, artType) {
    let foilStatus = "";
    let promoStatus = "";
    if (artType.toLowerCase().includes("foil")) {
        foilStatus = "yes";
    }
    if (artType.toLowerCase().includes("promo")) {
        promoStatus = "true";
    }
    let apiUrl = `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(cardName)}&set=${encodeURIComponent(setName)}`;
    
    fetch(apiUrl)
        .then(response => response.json())
        .then(data => {
            if (data.image_uris?.normal) {
                hoverImage.src = data.image_uris.normal;
            } else if (data.card_faces?.[0]?.image_uris?.normal) {
                hoverImage.src = data.card_faces[0].image_uris.normal; // Handle double-faced cards
            } else {
                hoverImage.style.display = "none";
                return;
            }

            hoverImage.style.display = "block";
            hoverImage.style.top = `${event.pageY + 10}px`;
            hoverImage.style.left = `${event.pageX + 10}px`;
        })
        .catch(() => {
            hoverImage.style.display = "none";
        });
}

export function hideHoverImage() {
    hoverImage.style.display = "none";
}

export function attachHoverEffectToArtCells() {
    const tableBody = document.getElementById("cardTableBody");
    tableBody.querySelectorAll("tr").forEach(row => {
        const artCell = row.cells[6]; // Assuming "Art" is in column index 6
        const cardName = row.cells[1]?.textContent || ''; // Assuming "Name" is in column index 1
        const setName = row.cells[5]?.textContent || ''; // Assuming "Set" is in column index 5
        const artType = row.cells[6]?.textContent || ''; // Assuming "Art" is in column index 6

        if (artCell) {
            artCell.addEventListener("mouseenter", (event) => showHoverImage(event, cardName, setName, artType));
            artCell.addEventListener("mouseleave", hideHoverImage);
        }
    });
}
