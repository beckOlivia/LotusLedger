export function openModalById(id) {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = "block";
}

export function closeModalById(id) {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = "none";
}

export function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}