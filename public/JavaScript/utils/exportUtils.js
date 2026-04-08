export async function exportCardsToCSV() {
    try {
        const response = await fetch("http://localhost:3000/getCards");

        if (!response.ok) {
            throw new Error("Failed to fetch cards for export.");
        }

        const result = await response.json();
        const cards = Array.isArray(result) ? result : (result?.data?.cards || []);

        if (!cards.length) {
            alert("No cards to export.");
            return;
        }

        const headers = ["Quantity", "Name", "Set", "Art"];

        const rows = cards.map(card => [
            card.quantity ?? "",
            card.name ?? "",
            card.set ?? card.setName ?? "",
            card.art ?? "Normal"
        ]);

        const csv = [headers, ...rows]
            .map(row =>
                row.map(value => {
                    const str = String(value ?? "");
                    return /[",\n]/.test(str)
                        ? `"${str.replace(/"/g, '""')}"`
                        : str;
                }).join(",")
            )
            .join("\n");

        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = url;
        link.download = "Card_List_Export.csv";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(url);
    } catch (error) {
        console.error("Export failed:", error);
        alert("Export failed.");
    }
}