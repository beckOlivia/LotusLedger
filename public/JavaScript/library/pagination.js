import { state } from "./state.js";

export function getPaginatedCards() {
    const startIndex = (state.currentPage - 1) * state.itemsPerPage;
    const endIndex = startIndex + state.itemsPerPage;
    return state.filteredCards.slice(startIndex, endIndex);
}

export function updatePaginationControls() {
    const totalPages = Math.max(1, Math.ceil(state.filteredCards.length / state.itemsPerPage));
    document.getElementById("pageInfo").textContent = `Page ${state.currentPage} of ${totalPages}`;
    document.getElementById("btnPrevPage").disabled = state.currentPage === 1;
    document.getElementById("btnNextPage").disabled = state.currentPage === totalPages;
}