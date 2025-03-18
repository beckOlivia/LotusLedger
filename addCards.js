import { getCardType, getCardCost, attachHoverEffectToArtCells } from "getCardData.js";
document.addEventListener("DOMContentLoaded", function () {
    // Function to get current date in MM/DD/YYYY format
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
function exportToCSV() {
    const rows = [];
    const tableBody = document.getElementById("cardTableBody");

    // Add header row
    rows.push(["Quantity", "Name", "Set", "Art"]);

    // Iterate through table rows to collect data
    const tableRows = tableBody.querySelectorAll("tr");
    tableRows.forEach((row) => {
        const quantity = row.cells[0]?.textContent || '';
        const cardName = row.cells[1]?.textContent || '';
        const set = row.cells[5]?.textContent || '';
        const art = row.cells[6]?.textContent || '';

        // Add row to CSV data, ensuring the name is properly quoted if it contains commas
        rows.push([quoteCSVValue(quantity), quoteCSVValue(cardName), quoteCSVValue(set), quoteCSVValue(art)]);
    });

    // Convert array of rows into CSV string
    const csvContent = rows.map(row => row.join(",")).join("\n");

    // Create a downloadable link
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "cards_export.csv";
    link.click();
}

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
        input.accept = ".csv";

        input.addEventListener("change", function (event) {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function (e) {
                    const content = e.target.result;
                    const rows = parseCSV(content);
                    
                    if (rows.length === 0) return;
                    
                    // Get column mapping from the header row (first row)
                    const columnMapping = getColumnMapping(rows[0]);
                    
                    // Clear previous table content
                    const tableBody = document.getElementById("cardTableBody");
                    tableBody.innerHTML = "";
                    
                    // Get current date for "Last Updated" field
                    const currentDate = getCurrentDate();
                    
                    // Start from index 1 to skip the header row
                    for (let i = 1; i < rows.length; i++) {
                        const row = rows[i];
                        if (row.length === 0 || (row.length === 1 && !row[0])) continue;
                        
                        const tr = document.createElement("tr");
                        
                        // Process the card name and extract parenthetical content
                        let cardName = row[columnMapping.cardName] || '';
                        let artContent = row[columnMapping.art] || '';
                        
                        // Extract content from parentheses if present
                        let extracted = extractParentheticalContent(cardName);
                        cardName = extracted.cleanedName;
                        
                        // If no parenthetical content, set "Normal" in the art column
                        if (!extracted.parentheticalContent) {
                            artContent = "Normal";
                        } else {
                            // If there's already content in the art field, add the parenthetical content with a separator
                            if (artContent && extracted.parentheticalContent) {
                                artContent = `${extracted.parentheticalContent} ${artContent}`;
                            } else {
                                artContent = extracted.parentheticalContent;
                            }
                        }

                        // Remove numbers from the art content
                        artContent = removeNumbers(artContent);

                        // Add cells for each column
                        const addCell = (content) => {
                            const td = document.createElement("td");
                            td.textContent = content || '';
                            tr.appendChild(td);
                            return td;
                        };
                        
                        addCell(row[columnMapping.quantity] || '');
                        addCell(cardName); // Use cleaned card name
                        addCell(row[columnMapping.type] || '');
                        addCell(row[columnMapping.cost] || '');
                        addCell(row[columnMapping.colors] || '');
                        addCell(row[columnMapping.set] || '');
                        addCell(artContent); // Use updated art content
                        addCell(row[columnMapping.storage] || '');
                        
                        // For Last Updated, use today's date instead of the CSV value
                        addCell(currentDate);
                        
                        // Add options button
                        const optionsTd = document.createElement("td");
                        const optionsButton = document.createElement("button");
                        optionsButton.className = "options-button";
                        optionsButton.textContent = "⋮";
                        optionsButton.title = "Options";
                        optionsTd.appendChild(optionsButton);
                        tr.appendChild(optionsTd);
                        
                        tableBody.appendChild(tr);
                        getCardType(cardName, tr);
                        getCardCost(cardName, tr);
                    }
                    attachHoverEffectToArtCells();
                };
                reader.readAsText(file);
            }
        });

        input.click(); // Open file dialog
    });

    // Add event listener for the Export CSV button
    document.getElementById("btnExportCards").addEventListener("click", exportToCSV);
});
