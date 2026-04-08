export function openImageZoom(src, alt = "Zoomed card image") {
    const modal = document.getElementById("imageZoomModal");
    const zoomedImg = document.getElementById("zoomedCardImage");

    if (!modal || !zoomedImg || !src) return;

    zoomedImg.src = src;
    zoomedImg.alt = alt;
    modal.classList.remove("hidden");
}

export function closeImageZoom() {
    const modal = document.getElementById("imageZoomModal");
    const zoomedImg = document.getElementById("zoomedCardImage");

    if (!modal || !zoomedImg) return;

    modal.classList.add("hidden");
    zoomedImg.src = "";
}

export function bindImageZoomEvents() {
    document.getElementById("closeImageZoomModal")?.addEventListener("click", closeImageZoom);

    document.getElementById("imageZoomModal")?.addEventListener("click", e => {
        if (e.target.id === "imageZoomModal") {
            closeImageZoom();
        }
    });

    document.addEventListener("keydown", e => {
        if (e.key === "Escape") {
            closeImageZoom();
        }
    });
}