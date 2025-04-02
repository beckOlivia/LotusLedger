document.addEventListener("DOMContentLoaded", function () {
    let selectedStorageLocation = null;
    
    function openEditCardLightbox(storageLocationName) {
        console.log('Opening lightbox for storage:', storageLocationName);
        
        // Fetch cards for the selected storage location, or all if undefined
        fetchPartialCardData(storageLocationName)
            .then(cards => {
                displayPartialCardData(cards, storageLocationName);
                // Open your lightbox here, if necessary
            })
            .catch(error => {
                console.error("Error fetching cards:", error);
            });
            openLightbox(storageLocationName);
    }
    
    async function fetchPartialCardData(storageLocation) {
        try {
            // If storageLocation is undefined or empty, fetch all cards
            const url = storageLocation ? 
                `http://localhost:3000/getCards?storageLocation=${storageLocation}` : 
                'http://localhost:3000/getCards'; // URL without storageLocation to fetch all cards
            
            console.log("Fetching from URL:", url);
            
            const response = await fetch(url);
    
            if (!response.ok) {
                throw new Error(`Failed to fetch cards: ${response.statusText}`);
            }
    
            const result = await response.json();
    
            // Ensure the data property is an object and contains the 'cards' array
            if (result && result.data && Array.isArray(result.data.cards)) {
                console.log("Fetched result:", result);
                return result.data.cards;  // Return the 'cards' array directly
            } else {
                console.error("Expected an array inside the 'cards' property, but got:", result.data);
                return [];  // Return an empty array if the cards are not properly formatted
            }
        } catch (error) {
            console.error("Error fetching card data:", error);
            return [];  // Return an empty array in case of error
        }
    }
    
    function displayPartialCardData(cards, storageLocation) {
        const lightboxTableBody = document.getElementById('displayMiniTableBody');
        
        console.log('Displaying storage:', storageLocation);
        if (lightboxTableBody) {
            lightboxTableBody.innerHTML = '';  // Clear existing rows
    
            // Ensure that cards is an array before proceeding
            if (Array.isArray(cards)) {
                cards.forEach(card => {
                    const tr = document.createElement('tr');
                    addCell(tr, card.name);
                    addCell(tr, card.quantity);
                    addCell(tr, card.type);
                    addCell(tr, card.set);
                    addCell(tr, card.art);
    
                    // Add storage location selector for each card
                    const addToStoragebtn = document.createElement("td");
                    const addToStorage = document.createElement("button");
                    addToStorage.className = "addToStorage-button";
                    addToStorage.id = "addToStorageButton";
                    addToStorage.textContent = "Add to Storage";
                    addToStorage.title = "Add";
                    addToStoragebtn.appendChild(addToStorage);
                    tr.appendChild(addToStoragebtn);
                    lightboxTableBody.appendChild(tr);
    
                    // Add event listener for the 'Add to Storage' button
                    addToStorage.addEventListener('click', () => {
                        addToStorageFunction(card, storageLocation);
                    });
                });
            } else {
                console.error('Expected an array of cards but got:', cards);
            }
        }
    }
    
    // Move the addToStorage function outside of the loop
    async function addToStorageFunction(card, storageLocation) {
        console.log('Adding to storage:', storageLocation);
    
        if (storageLocation) {
            try {
                const response = await fetch('http://localhost:3000/updateCardStorage', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        cardId: String(card._id),  // Ensure it's a string
                        storageLocation: storageLocation
                    })
                });
    
                if (response.ok) {
                    const updatedCard = await response.json();
                    console.log('Card updated successfully:', updatedCard);
                    alert('Card storage updated!');
                } else {
                    console.error('Failed to update card storage');
                    alert('Failed to update card storage');
                }
            } catch (error) {
                console.error('Error updating card storage:', error);
                alert('Error updating card storage');
            }
        }
    }
    
    
    
    function addCell(row, content) {
        const td = document.createElement('td');
        td.textContent = content || '';
        row.appendChild(td);
    }
    
    
    async function fetchStorage() {
        try {
            const response = await fetch('http://localhost:3000/getStorage', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch storage entries');
            }

            const result = await response.json();
            console.log('Fetched storage entries:', result);

            const tableBody = document.getElementById("displayTableBody");
            result.result.forEach(entry => {
                const tr = document.createElement("tr");
                addCell(tr, entry.name);
                addCell(tr, entry.capacity);
                addCell(tr, entry.location);
                addCell(tr, entry.lastUpdated);

                // Set the storage location as a data attribute on the row
                tr.dataset.storageLocation = entry.location;

                // Add options button
                const optionsTd = document.createElement("td");
                const optionsButton = document.createElement("button");
                optionsButton.className = "options-button";
                optionsButton.textContent = "⋮";
                optionsButton.title = "Options";
                optionsTd.appendChild(optionsButton);
                tr.appendChild(optionsTd);

                tableBody.appendChild(tr);

                // Event listener for "three dots" button
                optionsButton.addEventListener("click", function (event) {
                    event.stopPropagation(); // Prevent the click from closing the menu immediately

                    // Get the storage location from the row
                    const storageLocation = tr.dataset.storageLocation;

                    console.log("Storage location selected:", storageLocation);

                    // Show the options menu and handle edit actions
                    const optionsMenu = createOptionsMenu();
                    optionsMenu.style.display = 'block'; // Show options menu
                    document.body.appendChild(optionsMenu);

                    // Handle "Edit Cards" action in options menu
                    const editCardLink = optionsMenu.querySelector(".edit-card");
                    if (editCardLink) {
                        editCardLink.addEventListener("click", async function (event) {
                            event.preventDefault(); // Prevent default link behavior
                            openLightbox(); // Open the lightbox to edit cards
                            
                            try {
                                const cards = await fetchPartialCardData(); // Fetch card data
                                displayPartialCardData(cards); // Display cards in lightbox
                            } catch (error) {
                                console.error("Error fetching card data:", error);
                            }
                        });
                    }

                    // Handle "Change Storage Location" action in options menu
                    const changeStorageLink = optionsMenu.querySelector(".change-storage");
                    if (changeStorageLink) {
                        changeStorageLink.addEventListener("click", function (event) {
                            event.preventDefault(); // Prevent default link behavior
                            openStorageModal(); // Open the modal for storage selection

                            // Handle saving the updated storage location
                            document.getElementById("saveStorage").addEventListener("click", async function () {
                                const newLocation = document.getElementById("storageLocation").value.trim();
                                if (newLocation) {
                                    try {
                                        const response = await fetch('http://localhost:3000/updateCardStorage', {
                                            method: 'POST',
                                            headers: {
                                                'Content-Type': 'application/json',
                                            },
                                            body: JSON.stringify({
                                                cardId: card.id, // assuming the card has an id property
                                                newStorageLocation: newLocation
                                            })
                                        });

                                        if (!response.ok) {
                                            throw new Error('Failed to update card storage');
                                        }

                                        // Update the card storage location on the client side
                                        card.storageLocation = newLocation;
                                        console.log('Card storage location updated successfully:', card);
                                    } catch (error) {
                                        console.error('Error updating card storage:', error);
                                    }
                                }
                            });
                        });
                    }

                    window.addEventListener("click", function (event) {
                        if (!optionsMenu.contains(event.target) && event.target !== optionsButton) {
                            optionsMenu.style.display = 'none';
                        }
                    });
                });
            });
        } catch (error) {
            console.error('Error fetching storage:', error);
        }
    }

    // Function to create the options menu with an additional "Change Storage Location" link
    function createOptionsMenu() {
        const optionsMenu = document.createElement("div");
        optionsMenu.className = "options-menu";
        optionsMenu.innerHTML = `
            <ul>
                <li><a href="#" class="edit-card">Edit Cards</a></li>
                <li><a href="#" class="change-storage">Change Storage Location</a></li>
                <li><a href="#">Edit Name</a></li>
                <li><a href="#">Edit Capacity</a></li>
                <li><a href="#">Edit Location</a></li>
            </ul>
        `;
        return optionsMenu;
    }

    // Fetching storage entries and populating the table
    fetchStorage();

    // Helper function to add a table cell
    function addCell(tr, content) {
        const td = document.createElement("td");
        td.textContent = content || '';
        tr.appendChild(td);
    }

    function openLightbox(storage) {
        document.getElementById('light').style.display = 'block';
        document.getElementById('fade').style.display = 'block';
    }

    function closeLightbox() {
        document.getElementById('light').style.display = 'none';
        document.getElementById('fade').style.display = 'none';
    }

    function openStorageModal() {
        document.getElementById("storageModal").style.display = "block";
    }

    function closeStorageModal() {
        document.getElementById("storageModal").style.display = "none";
    }

    // Add event listener to open storage modal
    document.getElementById("btnAddStorage").addEventListener("click", openStorageModal);
    document.getElementById("closeStorageModal").addEventListener("click", closeStorageModal);
});
