export async function searchCardsByNameFromApi(name) {
    const trimmed = String(name || "").trim();
    if (!trimmed) return [];

    try {
        const query = `!"${trimmed}" unique:prints`;
        let url = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(query)}`;
        const allResults = [];

        while (url) {
            const response = await fetch(url);

            if (!response.ok) {
                if (response.status === 404) return [];
                throw new Error(`Search failed: ${response.status}`);
            }

            const data = await response.json();

            if (Array.isArray(data.data)) {
                allResults.push(...data.data);
            }

            url = data.has_more ? data.next_page : null;
        }

        allResults.sort((a, b) => (b.released_at || "").localeCompare(a.released_at || ""));
        return allResults;
    } catch (error) {
        console.error("Error searching cards by name:", error);
        return [];
    }
}