document.addEventListener("DOMContentLoaded", function(event) {
    document.getElementById("txtSearchLibrary").addEventListener("keydown", function(event) {
        if (event.key === "Enter") {
            //Need display search results on the view library page
            window.location.href = "/public/Html/viewLibrary.html";
        }
    });

    document.getElementById("btnViewLibrary").addEventListener("click", function(e) {
        window.location.href = "/public/Html/viewLibrary.html";
    });
    
    document.getElementById("btnViewStorage").addEventListener("click", function(e) {
        window.location.href = "/public/Html/viewStorage.html";
    });
    const btnAdvancedSearch = document.getElementById("btnAdvancedSearch");
    const txtSearch = document.getElementById("txtSearchLibrary");

    btnAdvancedSearch?.addEventListener("click", function () {
        const query = txtSearch?.value?.trim() || "";

        const url = new URL("/public/Html/viewLibrary.html", window.location.origin);

        // 🔑 trigger advanced search modal
        url.searchParams.set("advanced", "true");

        if (query) {
            url.searchParams.set("query", query);
        }

        window.location.href = url.toString();
    });
});

