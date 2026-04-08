let hoverImage = null;

function ensureHoverImage() {
    if (hoverImage) return hoverImage;

    hoverImage = document.createElement("img");
    hoverImage.style.position = "absolute";
    hoverImage.style.display = "none";
    hoverImage.style.width = "260px";
    hoverImage.style.maxWidth = "260px";
    hoverImage.style.borderRadius = "10px";
    hoverImage.style.border = "1px solid rgba(255,255,255,0.15)";
    hoverImage.style.boxShadow = "0 10px 28px rgba(0,0,0,0.35)";
    hoverImage.style.background = "#202138";
    hoverImage.style.zIndex = "2000";
    hoverImage.style.pointerEvents = "none";

    document.body.appendChild(hoverImage);
    return hoverImage;
}

export function showHoverImage(event, imageUrl) {
    if (!imageUrl) return;

    const img = ensureHoverImage();
    img.src = imageUrl;
    img.style.display = "block";
    img.style.left = `${event.pageX + 16}px`;
    img.style.top = `${event.pageY + 16}px`;
}

export function moveHoverImage(event) {
    if (!hoverImage || hoverImage.style.display === "none") return;

    hoverImage.style.left = `${event.pageX + 16}px`;
    hoverImage.style.top = `${event.pageY + 16}px`;
}

export function hideHoverImage() {
    if (!hoverImage) return;
    hoverImage.style.display = "none";
}