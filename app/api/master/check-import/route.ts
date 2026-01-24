import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const body = await request.json();
        const { type, data } = body; // type: 'siswa' | 'guru' | 'mapel', data: Array of objects

        if (!data || !Array.isArray(data) || data.length === 0) {
            return NextResponse.json({ ok: true, conflicts: [], cleanData: [] });
        }

        let table = '';
        let keyField = ''; // DB Column Unique
        let keyProp = ''; // Excel Property Name
        let nameField = ''; // DB Column Name
        let nameProp = ''; // Excel Property Name

        // Map configuration
        if (type === 'siswa') {
            table = 'master_siswa';
            keyField = 'nisn'; keyProp = 'nisn';
            nameField = 'nama_lengkap'; nameProp = 'nama_lengkap';
        } else if (type === 'guru') {
            table = 'master_guru';
            keyField = 'nip'; keyProp = 'nip';
            nameField = 'nama_lengkap'; nameProp = 'nama_lengkap';
        } else if (type === 'mapel') {
            table = 'master_mapel';
            keyField = 'kode'; keyProp = 'kode';
            nameField = 'nama'; nameProp = 'nama';
        } else {
            // Default passthrough if unknown
            return NextResponse.json({ ok: true, conflicts: [], cleanData: data });
        }

        // 1. Fetch relevant data from DB to compare
        const keys = data.map(d => String(d[keyProp])).filter(Boolean);
        const names = data.map(d => String(d[nameProp]).toLowerCase().trim()).filter(Boolean);

        // Optimization: Instead of complex OR, simply fetch ALL relevant records by Key OR Name?
        // Actually, fetching by Key is fast (Indexed). Fetching by Name is good too.
        // Supabase/Postgrest URL limit is ~2KB. 500 keys might exceed.
        // Strategy: 
        // 1. Fetch by Keys (Batch if needed, but 1000 UUIDs is fine in body, but GET URL limit exists).
        // 2. Fetch by Names?
        // Better: For "Master Data" tables which usually have < 10,000 rows, fetching ALL IDs and Names is often faster and safer than complex filtering.
        // Let's implement a 'Fetch All' strategy for these Master Tables to guarantee finding duplicates without URL limits.

        const { data: dbData, error } = await supabase
            .from(table)
            .select(`${keyField}, ${nameField}, aktif`);

        // Note: For huge tables (100k+), this is bad. But for Master Siswa/Guru/Mapel in a school, it's usually < 2000.
        // This effectively solves the "URI Too Long" and "Complex Query Timeout" issues.

        if (error) throw error;

        const conflicts: any[] = [];
        const newItems: any[] = [];
        const identicalItems: any[] = [];

        const dbMapByKey = new Map(dbData?.map(d => [d[keyField], d]));
        const dbMapByName = new Map(dbData?.map(d => [d[nameField].toLowerCase(), d]));

        for (const row of data) {
            const rowKey = String(row[keyProp]);
            const rowName = String(row[nameProp]).trim();
            const rowNameLower = rowName.toLowerCase();

            const matchByKey = dbMapByKey.get(rowKey);
            const matchByName = dbMapByName.get(rowNameLower);

            // 1. Check Key Match (Update Scenario)
            if (matchByKey) {
                const dbName = matchByKey[nameField].trim();
                // Conflict A: ID Match BUT Name Different
                if (dbName.toLowerCase() !== rowNameLower) {
                    conflicts.push({
                        id: rowKey,
                        type: 'ID_MATCH_NAME_DIFF',
                        excel: row,
                        db: matchByKey
                    });
                    continue;
                }
                // ID Match AND Name Match -> Identical
                identicalItems.push(row);
                continue;
            }

            // 2. Check Name Match (Potential Duplicate Scenario)
            if (matchByName) {
                // Key (NISN) is different, but Name is same.
                conflicts.push({
                    id: rowKey,
                    type: 'NAME_MATCH_ID_DIFF',
                    excel: row,
                    db: matchByName
                });
                continue;
            }

            // 3. No Key Match, No Name Match -> New Data
            newItems.push(row);
        }

        return NextResponse.json({ ok: true, conflicts, newItems, identicalItems });

    } catch (error: any) {
        console.error('Check Import Error:', error);
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
}
