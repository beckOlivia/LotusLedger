document.addEventListener("DOMContentLoaded", function () {
    // Function to get current date in MM/DD/YYYY format
    function getCurrentDate() {
        const now = new Date();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const year = now.getFullYear();
        return `${month}/${day}/${year}`;
    }

    // Function to open storage modal
    function openStorageModal() {
        document.getElementById("storageModal").style.display = "block";
    }

    // Function to close storage modal
    function closeStorageModal() {
        document.getElementById("storageModal").style.display = "none";
    }

    // Function to add a storage entry to the table
    function addStorageEntry(name, capacity, location) {
        if (!name || !capacity || !location) {
            alert("All fields must be filled!");
            return;
        }
    
        const tableBody = document.getElementById("displayTableBody"); // Ensure the table exists in your HTML
        const tr = document.createElement("tr");
    
        // Function to add a table cell
        const addCell = (content) => {
            const td = document.createElement("td");
            td.textContent = content || '';
            tr.appendChild(td);
            return td;
        };
    
        const currentDate = new Date().toLocaleDateString("en-US"); // Format: MM/DD/YYYY
    
        // Add table cells with the provided data
        addCell(name);
        addCell(capacity);
        addCell(location);
        addCell(currentDate); // "Last Updated" field
    
        // Add options button
        const optionsTd = document.createElement("td");
        const optionsButton = document.createElement("button");
        optionsButton.className = "options-button";
        optionsButton.textContent = "⋮";
        optionsButton.title = "Options";
        optionsTd.appendChild(optionsButton);
        tr.appendChild(optionsTd);
    
        // Append the new row to the table
        tableBody.appendChild(tr);
    
        closeStorageModal(); // Close the modal after adding the entry
    }
    
    function getColumnMapping(headerRow) {
        const mapping = {
            name: 0,
            capacity: 0,
            location: 0,
            lastUpdated: 0
        };
        
        // Try to map based on common header names
        headerRow.forEach((header, index) => {
            const headerLower = header.toLowerCase();
            if (headerLower.includes('name')) {
                mapping.name = index;
            } else if (headerLower.includes('capacity')) {
                mapping.capacity = index;
            } else if (headerLower.includes('location')) {
                mapping.location = index;
            } else if (headerLower.includes('lastUpdated')) {
                mapping.lastUpdated = index;
            }
        });
        
        return mapping;
    }


    // Event Listeners
    document.getElementById("btnAddStorage").addEventListener("click", openStorageModal);
    document.getElementById("closeStorageModal").addEventListener("click", closeStorageModal);
    document.getElementById("saveStorage").addEventListener("click", function () {
        const name = document.getElementById("storageName").value.trim();
        const capacity = document.getElementById("storageCapacity").value.trim();
        const location = document.getElementById("storageLocation").value.trim();
        
        addStorageEntry(name, capacity, location);
        
        // Clear input fields
        document.getElementById("storageName").value = "";
        document.getElementById("storageCapacity").value = "";
        document.getElementById("storageLocation").value = "";
    });

    // Close modal when clicking outside of it
    window.addEventListener("click", function (event) {
        const modal = document.getElementById("storageModal");
        if (event.target === modal) {
            closeStorageModal();
        }
    });
});
