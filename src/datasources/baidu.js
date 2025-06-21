// Baidu brand/company list scraper (client-side, uses CORS proxy)
// NOTE: Public Baidu pages in Chinese may change layout; adjust selector if needed.

export async function fetchBrandsFromBaidu() {
    // Example: Fortune China 500 (财富中国500强) 2023
    const url = "https://www.fortunechina.com/fortune500/c/2023-07/25/content_431571.htm";
    const resp = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`);
    const html = await resp.text();
    const doc = new DOMParser().parseFromString(html, "text/html");
    const brands = [];
    // Try to select table rows with company info
    // Adjust selector if table structure changes
    const table = doc.querySelector("table, .content .table_box, .content .table-responsive");
    if (table) {
        for (const row of table.querySelectorAll("tbody tr")) {
            const cells = row.querySelectorAll("td");
            if (cells.length >= 3) {
                // company name in 2nd column, industry in 3rd
                const name = cells[1].innerText.trim();
                const classification = cells[2].innerText.trim();
                brands.push({
                    name,
                    founder: "",
                    classification,
                    source: "Baidu"
                });
            }
        }
    }
    // If table not found, fallback: try list-style extraction (future-proof)
    if (!brands.length) {
        const listItems = doc.querySelectorAll(".content li, .article li");
        listItems.forEach(li => {
            const name = li.textContent.trim();
            if (name && name.length > 2) {
                brands.push({
                    name,
                    founder: "",
                    classification: "",
                    source: "Baidu"
                });
            }
        });
    }
    return brands;
}
