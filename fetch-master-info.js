
async function fetchData() {
    try {
        const response = await fetch('http://localhost:3001/api/informasi-akademik');
        const json = await response.json();

        if (!json.ok) {
            console.error('API Error:', json.error);
            return;
        }

        const data = json.data;
        console.log(`\n=== DATA MASTER INFORMATION (Total: ${data.length}) ===\n`);

        // Group by Category
        const grouped = {};
        data.forEach(item => {
            if (!grouped[item.category]) grouped[item.category] = [];
            grouped[item.category].push(item);
        });

        for (const [cat, items] of Object.entries(grouped)) {
            console.log(`📂 CATEGORY: ${cat}`);
            items.forEach(item => {
                console.log(`   📄 ${item.title}`);
                console.log(`      🔗 ${item.file_url}`);
            });
            console.log('');
        }

    } catch (error) {
        console.error('Fetch Failed:', error.message);
    }
}

fetchData();
