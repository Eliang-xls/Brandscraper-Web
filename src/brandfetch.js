// Brandfetch API logic

export async function fetchBrandFromAPI(domain, apiKey) {
    const apiUrl = `https://api.brandfetch.io/v2/brands/${domain}`;
    try {
        const response = await fetch(apiUrl, {
            headers: { "Authorization": `Bearer ${apiKey}` }
        });
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        const data = await response.json();
        return {
            name: data.name || domain,
            logo: (data.logos && data.logos[0] && data.logos[0].src) || "",
            founder: "", // Brandfetch may not provide this
            classification: data.industry || "",
            source: "Brandfetch"
        };
    } catch (err) {
        console.error(`Failed to fetch brand for ${domain}: ${err}`);
        return null;
    }
}