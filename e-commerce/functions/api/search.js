const products = [
    { id: 1, name: "MacBook Pro M3",    price: 22500000, image: "💻" },
    { id: 2, name: "iPhone 15 Pro",     price: 16500000, image: "📱" },
    { id: 3, name: "Sony WH-1000XM5",   price: 4299000,  image: "🎧" },
    { id: 4, name: "Keychron K2",       price: 1150000,  image: "⌨️" },
    { id: 5, name: "Logitech MX Master", price: 1450000,  image: "🖱️" },
    { id: 6, name: "Apple Watch Series 9", price: 6799000, image: "⌚" },
    { id: 7, name: "Dell UltraSharp 27", price: 5699000,  image: "🖥️" },
    { id: 8, name: "Samsung 990 Pro 1TB", price: 2199000, image: "💾" }
];

export async function onRequestGet(context) {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': 'true',
        'Content-Type': 'application/json'
    };

    const url = new URL(context.request.url);
    const query = url.searchParams.get('q') || '';

    let filtered = products.filter(p =>
        p.name.toLowerCase().includes(query.toLowerCase())
    );

    let sqliDetected = false;
    let leakedData = null;

    // ❌ VULN: Simulasi SQL Injection
    if (query.includes("' OR '1'='1") || query.toLowerCase().includes("union select")) {
        sqliDetected = true;
        filtered = products;
    }

    if (query.includes("UNION SELECT")) {
        leakedData = 'admin@nexshop.com | pass_hash: 5baa61e4c9b93f3f0682250b6cf8331b7ee68fd8';
    }

    // ❌ VULN: Reflected XSS — query raw tanpa escape
    // Frontend pakai innerHTML → XSS terjadi di browser
    return new Response(JSON.stringify({
        success: true,
        query: query,
        sqli_detected: sqliDetected,
        leaked_data: leakedData,
        results: filtered
    }), { headers: corsHeaders });
}

export async function onRequestOptions() {
    return new Response(null, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Credentials': 'true'
        }
    });
}