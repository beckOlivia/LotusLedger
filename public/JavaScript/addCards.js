import { state } from "./library/state.js";
import { fetchAllCards, deleteCardById } from "./api/cardsApi.js";
import { bindAddCardsModal } from "./modals/addCardsModal.js";
import { bindImageZoomEvents } from "./modals/imageZoomModal.js";
import { bindEditModal, openEditModal } from "./modals/cardEditModal.js";
import { bindStorageModal, openStorageModal } from "./modals/storageModal.js";
import { renderListView } from "./library/renderTable.js";
import { renderImageView } from "./library/renderImageView.js";
import {
    renderDetailsPanel,
    toggleDetailsPanel,
    closeDetailsPanel
} from "./library/renderDetailsPanel.js";
import { getPaginatedCards, updatePaginationControls } from "./library/pagination.js";
import { sortCards, updateSortIcons } from "./library/sorting.js";
import { bindGlobalOptionsMenuCloser } from "./library/optionsMenu.js";
import { openModalById, closeModalById } from "./utils/domUtils.js";
import { exportCardsToCSV } from "./utils/exportUtils.js";
import {
    applySearchFilter,
    applyAdvancedSearch,
    clearAdvancedSearch
} from "./library/filters.js";

async function loadStorageDropdown() {
    try {
        const response = await fetch("http://localhost:3000/getStorages");

        if (!response.ok) {
            throw new Error("Failed to load storage locations");
        }

        const result = await response.json();
        const storages = result.data?.storages || [];

        const storageSelect = document.getElementById("storageNameInput");
        if (!storageSelect) return;

        storageSelect.innerHTML = `<option value="">Select a storage location</option>`;

        storages.forEach(storage => {
            const option = document.createElement("option");
            option.value = storage.name;
            option.textContent = storage.name;
            storageSelect.appendChild(option);
        });
    } catch (error) {
        console.error("Error loading storage dropdown:", error);
    }
}

async function deleteCard(card) {
    try {
        if (!card._id) {
            alert("This card does not have an ID, so it cannot be deleted yet.");
            return;
        }

        await deleteCardById(card._id);
        await loadCards();
    } catch (error) {
        console.error("Error deleting card:", error);
        alert("Delete failed.");
    }
}

const rowActions = {
    onDelete: deleteCard,
    onEdit: openEditModal,
    onStorage: openStorageModal
};

export async function renderCurrentPage() {
    const paginatedCards = getPaginatedCards();

    const listViewContainer = document.getElementById("listViewContainer");
    const imageViewContainer = document.getElementById("imageViewContainer");

    if (state.currentView === "list") {
        listViewContainer.classList.remove("hidden");
        imageViewContainer.classList.add("hidden");
        renderListView(paginatedCards, rowActions);
    } else {
        imageViewContainer.classList.remove("hidden");
        listViewContainer.classList.add("hidden");
        await renderImageView(paginatedCards, rowActions);
    }

    updatePaginationControls();

    const detailsPanel = document.getElementById("detailsPanel");
    if (detailsPanel && !detailsPanel.classList.contains("hidden")) {
        renderDetailsPanel();
    }
}

export async function loadCards() {
    try {
        state.allCards = await fetchAllCards();
        state.advancedFilteredCards = [];
        state.filteredCards = [...state.allCards];

        if (state.currentSortColumn) {
            state.filteredCards = sortCards(
                state.filteredCards,
                state.currentSortColumn,
                state.currentSortDirection
            );
        }

        const totalPages = Math.max(1, Math.ceil(state.filteredCards.length / state.itemsPerPage));
        if (state.currentPage > totalPages) {
            state.currentPage = totalPages;
        }

        updateSortIcons();
        await renderCurrentPage();
    } catch (error) {
        console.error("Error fetching data from server", error);
        state.allCards = [];
        state.advancedFilteredCards = [];
        state.filteredCards = [];
        await renderCurrentPage();
    }
}

function handleColumnSort(column) {
    if (state.currentSortColumn === column) {
        state.currentSortDirection = state.currentSortDirection === "asc" ? "desc" : "asc";
    } else {
        state.currentSortColumn = column;
        state.currentSortDirection = "asc";
    }

    state.filteredCards = sortCards(
        state.filteredCards,
        state.currentSortColumn,
        state.currentSortDirection
    );

    state.currentPage = 1;
    updateSortIcons();
    renderCurrentPage();
}

function bindSettingsMenu() {
    const settingsButton = document.getElementById("btnSettings");
    const settingsMenu = document.getElementById("settingsMenu");

    settingsButton?.addEventListener("click", event => {
        event.stopPropagation();
        if (!settingsMenu) return;

        settingsMenu.style.display = settingsMenu.style.display === "block" ? "none" : "block";
    });

    document.addEventListener("click", () => {
        if (settingsMenu) {
            settingsMenu.style.display = "none";
        }
    });

    settingsMenu?.addEventListener("click", event => {
        event.stopPropagation();
    });
}

function bindAdvancedSearchModal() {
    document.getElementById("btnAdvanceSearch")?.addEventListener("click", () => {
        openModalById("advancedSearchModal");
    });

    document.getElementById("closeAdvancedSearchModal")?.addEventListener("click", () => {
        closeModalById("advancedSearchModal");
    });

    document.getElementById("advancedSearchModal")?.addEventListener("click", event => {
        if (event.target.id === "advancedSearchModal") {
            closeModalById("advancedSearchModal");
        }
    });

    document.getElementById("btnApplyAdvancedSearch")?.addEventListener("click", () => {
        applyAdvancedSearch(renderCurrentPage);
        closeModalById("advancedSearchModal");
    });

    document.getElementById("btnClearAdvancedSearch")?.addEventListener("click", () => {
        clearAdvancedSearch(renderCurrentPage);
    });
}

function bindExportButton() {
    document.getElementById("btnExportCards")?.addEventListener("click", () => {
        const dataToExport = state.filteredCards.length
            ? state.filteredCards
            : state.allCards;

        exportCardsToCSV(dataToExport);
    });
}
function bindDetailsPanelEvents() {
    document.getElementById("btnToggleDetailsPanel")?.addEventListener("click", toggleDetailsPanel);
    document.getElementById("btnCloseDetailsPanel")?.addEventListener("click", closeDetailsPanel);
}

function bindCoreEvents() {
    bindImageZoomEvents();
    bindAddCardsModal({ reloadCards: loadCards });
    bindEditModal(loadCards);
    bindStorageModal(loadCards);
    bindGlobalOptionsMenuCloser();
    bindSettingsMenu();
    bindAdvancedSearchModal();
    bindExportButton();
    bindDetailsPanelEvents();

    document.getElementById("txtSearchLibrary")?.addEventListener("input", () => {
        applySearchFilter(renderCurrentPage);
    });

    document.getElementById("btnPrevPage")?.addEventListener("click", async () => {
        if (state.currentPage > 1) {
            state.currentPage--;
            await renderCurrentPage();
        }
    });

    document.getElementById("btnNextPage")?.addEventListener("click", async () => {
        const totalPages = Math.max(1, Math.ceil(state.filteredCards.length / state.itemsPerPage));
        if (state.currentPage < totalPages) {
            state.currentPage++;
            await renderCurrentPage();
        }
    });

    document.querySelectorAll(".sortable").forEach(header => {
        header.addEventListener("click", () => {
            handleColumnSort(header.dataset.column);
        });
    });

    document.getElementById("btnToggleView")?.addEventListener("click", async () => {
        state.currentView = state.currentView === "list" ? "image" : "list";

        const button = document.getElementById("btnToggleView");
        if (button) {
            button.textContent = state.currentView === "list"
                ? "Switch to Image View"
                : "Switch to List View";
        }

        await renderCurrentPage();
    });
}

bindCoreEvents();
loadCards();
