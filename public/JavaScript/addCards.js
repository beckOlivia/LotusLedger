import { getCardType, getCardCost, attachHoverEffectToArtCells, getManaColors } from "./getCardData.js";

function getCurrentDate() {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const year = now.getFullYear();
    return `${month}/${day}/${year}`;
}

// Function to extract parenthetical content from a name
function extractParentheticalContent(name) {
    const parenthesesRegex = /\(([^)]+)\)/;
    const match = name.match(parenthesesRegex);
    
    if (match && match[1]) {
        // Return the cleaned name and the content within parentheses
        const cleanedName = name.replace(parenthesesRegex, '').trim();
        const parentheticalContent = match[1].trim();
        return { cleanedName, parentheticalContent };
    }
    
    // If no parentheses found, return the original name
    return { cleanedName: name, parentheticalContent: '' };
}

// Function to remove numbers from a string
function removeNumbers(str) {
    return str.replace(/[0-9]/g, '');
}

// Function to properly parse CSV, respecting quoted fields
function parseCSV(text) {
    const rows = [];
    const lines = text.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        
        let row = [];
        let inQuotes = false;
        let currentValue = '';
        
        for (let j = 0; j < lines[i].length; j++) {
            const char = lines[i][j];
            const nextChar = lines[i][j + 1];
            
            if (char === '"' && !inQuotes) {
                inQuotes = true;
                continue;
            }
            
            if (char === '"' && inQuotes) {
                if (nextChar === '"') {
                    currentValue += '"';
                    j++; // Skip the next quote
                } else {
                    inQuotes = false;
                    continue;
                }
            } else if (char === ',' && !inQuotes) {
                row.push(currentValue.trim());
                currentValue = '';
            } else {
                currentValue += char;
            }
        }
        
        // Add the last value
        row.push(currentValue.trim());
        rows.push(row);
    }
    
    return rows;
}

function getColumnMapping(headerRow) {
    const mapping = {
        quantity: 0,
        cardName: 0,
        type: 0,
        cost: 0,
        colors: 0,
        set: 0,
        art: 0,
        storage: 0,
        lastUpdated: 0
    };
    
    // Try to map based on common header names
    headerRow.forEach((header, index) => {
        const headerLower = header.toLowerCase();
        if (headerLower.includes('quantity')) {
            mapping.quantity = index;
        } else if (headerLower.includes('name') || headerLower.includes('card')) {
            mapping.cardName = index;
        } else if (headerLower.includes('type')) {
            mapping.type = index;
        } else if (headerLower.includes('cost') || headerLower.includes('mana')) {
            mapping.cost = index;
        } else if (headerLower.includes('color')) {
            mapping.colors = index;
        } else if (headerLower.includes('set') || headerLower.includes('edition')) {
            mapping.set = index;
        } else if (headerLower.includes('art') || headerLower.includes('artist')) {
            mapping.art = index;
        } else if (headerLower.includes('storage') || headerLower.includes('location')) {
            mapping.storage = index;
        } else if (headerLower.includes('update') || headerLower.includes('date')) {
            mapping.lastUpdated = index;
        }
    });
    
    return mapping;
}

// Function to export table data as CSV
const exportCardsToCSV = async () => {
    try {
        const cards = await getCardFromDatabase();  // Get cards from the database

        // If no cards found, exit early
        if (!cards || cards.length === 0) {
            console.log('No cards to export.');
            return;
        }

        // Create CSV string
        const rows = [['Quantity', 'Name', 'Set', 'Art']];  // Add header row
        cards.forEach(card => {
            rows.push([card.quantity, card.name, card.set, card.art]);  // Add data rows
        });

        // Convert rows array to CSV string
        const csvContent = rows.map(row => row.join(',')).join('\n');

        // Create a downloadable link for the CSV file
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'Card_List_Export.csv';
        link.click();  // Trigger download

        console.log('CSV export successful.');
    } catch (error) {
        console.error('Error exporting cards to CSV:', error);
    }
};


// Function to quote values properly for CSV format
function quoteCSVValue(value) {
// If the value contains a comma or a quote, wrap it in double quotes and escape internal quotes
if (value.includes(',') || value.includes('"')) {
    value = '"' + value.replace(/"/g, '""') + '"';
}
return value;
}

document.getElementById("btnAddCards").addEventListener("click", function () {
    const input = document.createElement("input");
    
    input.type = "file";
    input.accept = ".txt";

    input.addEventListener("change", async function (event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = async function (e) {
                const content = e.target.result;
                const rows = parseCSV(content);

                if (rows.length === 0) return;

                const columnMapping = getColumnMapping(rows[0]);
                const currentDate = getCurrentDate();
                const cardsToInsert = [];  // Array to store card objects to insert into MongoDB

                for (let i = 1; i < rows.length; i++) {
                    const row = rows[i];
                    if (row.length === 0 || (row.length === 1 && !row[0])) continue;

                    let cardName = row[columnMapping.cardName] || '';
                    let artContent = row[columnMapping.art] || '';
                    let extracted = extractParentheticalContent(cardName);
                    cardName = extracted.cleanedName;

                    if (!extracted.parentheticalContent) {
                        artContent = "Normal";
                    } else {
                        if (artContent && extracted.parentheticalContent) {
                            artContent = `${extracted.parentheticalContent} ${artContent}`;
                        } else {
                            artContent = extracted.parentheticalContent;
                        }
                    }

                    artContent = removeNumbers(artContent);

                    const card = {
                        quantity: row[columnMapping.quantity] || '',
                        name: cardName,
                        type: row[columnMapping.type] || '',
                        cost: row[columnMapping.cost] || '',
                        colors: row[columnMapping.colors] || '',
                        set: row[columnMapping.set] || '',
                        art: artContent,
                        storage: row[columnMapping.storage] || '',
                        lastUpdated: currentDate
                    };
                    

                    cardsToInsert.push(card);
                }

                // Send the data to the server via an HTTP POST request
                try {
                    const response = await fetch('http://localhost:3000/saveCards', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ cards: cardsToInsert })
                    });
                
                    if (response.ok) {
                        console.log('Cards successfully saved!');
                        const savedResponse = await response.json();
                
                        // The server response contains the inserted card IDs, but not the full card data
                        const insertedIds = savedResponse.result?.insertedIds;
                        
                        if (insertedIds && Array.isArray(insertedIds)) {
                            // You can now fetch the full card details based on these IDs
                            const cardDetailsResponse = await fetch('http://localhost:3000/getCardsByIds', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({ ids: insertedIds })
                            });
                
                            if (cardDetailsResponse.ok) {
                                const cardDetails = await cardDetailsResponse.json();
                                console.log('Card details received:', cardDetails);
                                displayCards(cardDetails); // Now you have the full cards to display
                            } else {
                                console.error('Failed to fetch card details');
                            }
                        } else {
                            console.error('Inserted card IDs not found in the response');
                        }
                    } else {
                        console.error('Failed to save cards');
                    }
                } catch (error) {
                    console.error('Error sending data to the server', error);
                }
                
            };
            reader.readAsText(file);
        }
    });

    input.click();
});
// Function to display cards in the table
async function displayCards(cards) {
    // Check if cards is an array
    if (!Array.isArray(cards)) {
        console.error('Expected an array of cards, but received:', cards);
        return;  // Exit if it's not an array
    }
    const tableBody = document.getElementById("displayTableBody");
    tableBody.innerHTML = "";  // Clear existing rows

    // Iterate through the cards and add rows to the table
    cards.forEach(card => {
        const tr = document.createElement("tr");

        // Add cells for each card field
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

        // Add options button
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

    attachHoverEffectToArtCells();  // Attach hover effect for art cells
}

// Fetch and display cards when the page loads
document.addEventListener("DOMContentLoaded", function () {
    fetch('http://localhost:3000/getCards')
    .then(function(response) {
        if (response.ok) {
            return response.json();  // Parse JSON if the response is successful
        } else {
            console.error('Failed to fetch cards:', response.status);
            throw new Error('Failed to fetch cards');
        }
    })
    .then(function(savedCards) {        
        // Debug the structure of the savedCards object
        if (savedCards && Array.isArray(savedCards)) {
            // If savedCards is already an array, directly display them
            displayCards(savedCards);
        } else if (savedCards && savedCards.data && Array.isArray(savedCards.data.cards)) {
            // If there's a data object and an array of cards, display them
            displayCards(savedCards.data.cards);
        } else {
            console.error('Expected data.cards to be an array, but received:', savedCards);
            displayCards([]);  // Handle error gracefully
        }
    })
    .catch(function(error) {
        console.error('Error fetching data from the server', error);
    });
});




