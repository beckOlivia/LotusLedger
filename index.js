document.addEventListener("DOMContentLoaded", function(event) {
    document.getElementById("txtSearchLibrary").addEventListener("keydown", function(event) {
        if (event.key === "Enter") {
            //Need display search results on the view library page
            window.location.href = "viewLibrary.html";
        }
    });

    document.getElementById("btnViewLibrary").addEventListener("click", function(e) {
        window.location.href = "viewLibrary.html";
    });
});

