// Test script untuk debug API Informasi Akademik
// Jalankan di browser console atau Node.js

async function testInformasiAPI() {
    console.log('🔍 Testing Informasi Akademik API...\n');

    const baseUrl = 'https://acca.icgowa.sch.id';

    // Test 1: Ambil semua dokumen
    console.log('📄 Test 1: Fetch ALL documents');
    try {
        const res1 = await fetch(`${baseUrl}/api/informasi-akademik`);
        const json1 = await res1.json();
        console.log(`Total dokumen: ${json1.data?.length || 0}`);
        console.log('Sample data:', json1.data?.[0]);
        console.log('Apakah ada field show_on_landing?', json1.data?.[0]?.show_on_landing !== undefined ? '✅ Ada' : '❌ Tidak ada (Migration belum jalan!)');
        console.log('\n');
    } catch (err) {
        console.error('Error:', err.message);
    }

    // Test 2: Ambil hanya yang show_on_landing = true
    console.log('📄 Test 2: Fetch documents with show_on_landing=true');
    try {
        const res2 = await fetch(`${baseUrl}/api/informasi-akademik?show_on_landing=true`);
        const json2 = await res2.json();
        console.log(`Total dokumen (show_on_landing=true): ${json2.data?.length || 0}`);
        console.log('\n');
    } catch (err) {
        console.error('Error:', err.message);
    }

    // Test 3: Ambil hanya yang show_on_landing = false
    console.log('📄 Test 3: Fetch documents with show_on_landing=false');
    try {
        const res3 = await fetch(`${baseUrl}/api/informasi-akademik?show_on_landing=false`);
        const json3 = await res3.json();
        console.log(`Total dokumen (show_on_landing=false): ${json3.data?.length || 0}`);
        console.log('\n');
    } catch (err) {
        console.error('Error:', err.message);
    }

    console.log('✅ Testing selesai!');
}

// Jalankan test
testInformasiAPI();
