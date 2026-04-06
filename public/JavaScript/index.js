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
});

