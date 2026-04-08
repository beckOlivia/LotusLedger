export function createOptionsMenu(card, actions) {
    const menu = document.createElement("div");
    menu.className = "options-menu";

    const list = document.createElement("ul");

    const deleteItem = document.createElement("li");
    deleteItem.textContent = "Delete";
    deleteItem.addEventListener("click", async () => {
        await actions.onDelete(card);
        menu.style.display = "none";
    });

    const editItem = document.createElement("li");
    editItem.textContent = "Edit";
    editItem.addEventListener("click", () => {
        actions.onEdit(card);
        menu.style.display = "none";
    });

    const storageItem = document.createElement("li");
    storageItem.textContent = "Add to Storage";
    storageItem.addEventListener("click", () => {
        actions.onStorage(card);
        menu.style.display = "none";
    });

    list.appendChild(deleteItem);
    list.appendChild(editItem);
    list.appendChild(storageItem);
    menu.appendChild(list);

    return menu;
}

export function wireOptionsButton(button, menu) {
    button.addEventListener("click", e => {
        e.stopPropagation();

        document.querySelectorAll(".options-menu").forEach(existingMenu => {
            if (existingMenu !== menu) {
                existingMenu.style.display = "none";
            }
        });

        menu.style.display = menu.style.display === "block" ? "none" : "block";
    });
}

export function bindGlobalOptionsMenuCloser() {
    document.addEventListener("click", () => {
        document.querySelectorAll(".options-menu").forEach(menu => {
            menu.style.display = "none";
        });
    });
}