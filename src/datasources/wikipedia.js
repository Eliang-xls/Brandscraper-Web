// Wikipedia brand/company list scraper (client-side, uses CORS proxy)

export async function fetchBrandsFromWikipedia() {
    // Example Wikipedia page: List of largest companies by revenue
    const url = "https://en.wikipedia.org/wiki/List_of_largest_companies_by_revenue";
    // Use AllOrigins proxy to bypass CORS in browser
    const resp = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`);
    const html = await resp.text();
    const doc = new DOMParser().parseFromString(html, "text/html");
    const table = doc.querySelector("table.wikitable");
    const brands = [];
    if (table) {
        for (const row of table.querySelectorAll("tbody tr")) {
            const cells = row.querySelectorAll("td");
            if (cells.length >= 2) {
                // Brand name column (usually 2nd col on this page)
                const name = cells[1].innerText.trim();
                // Try to infer classification from industry col, and founder from none (Wikipedia doesn't provide)
                const classification = cells[2] ? cells[2].innerText.trim() : "";
                brands.push({
                    name,
                    founder: "",
                    classification,
                    source: "Wikipedia"
                });
            }
        }
    }
    return brands;
}
