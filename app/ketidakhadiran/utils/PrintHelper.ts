import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { saveAs } from 'file-saver';
import Swal from 'sweetalert2';

// @ts-ignore
import ImageModule from 'docxtemplater-image-module-free';

export const generateFromTemplate = async (templatePath: string, data: any, outputFilename: string) => {
    try {
        console.log(`Fetching template from: ${templatePath}`);

        // 1. Fetch template binary
        const response = await fetch(templatePath);
        if (!response.ok) {
            throw new Error(`Gagal membuka template: ${templatePath} (${response.status})`);
        }

        const arrayBuffer = await response.arrayBuffer();

        // 2. Load into PizZip
        const zip = new PizZip(arrayBuffer);

        // 3. Image Module Configuration
        const opts: any = {
            centered: false,
            getImage: async (tagValue: string) => {
                if (!tagValue || typeof tagValue !== 'string' || !tagValue.startsWith('http')) {
                    console.warn('Invalid image URL:', tagValue);
                    return null;
                }
                try {
                    // Use a proxy to avoid CORS issues
                    const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(tagValue)}`;
                    const res = await fetch(proxyUrl);
                    if (!res.ok) throw new Error('Proxy fetch failed');
                    return await res.arrayBuffer();
                } catch (e) {
                    console.error('Failed to fetch image via proxy:', tagValue, e);
                    return null;
                }
            },
            getSize: () => [450, 300], // Default size for photos (landscape)
        };
        const imageModule = new ImageModule(opts);

        // 4. Create Docxtemplater instance
        const doc = new Docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
            modules: [imageModule]
        });

        // 5. Render data (async for images)
        await doc.renderAsync(data);

        // 6. Generate output blob
        const out = doc.getZip().generate({
            type: 'blob',
            mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        });

        // 7. Save file
        saveAs(out, outputFilename);

    } catch (error: any) {
        console.error('Docx Error:', error);

        // Detailed error for Docxtemplater
        if (error.properties && error.properties.errors) {
            const errorMessages = error.properties.errors.map((e: any) => e.message).join('\n');
            Swal.fire('Error Template', `Ada masalah pada tag template Anda:\n${errorMessages}`, 'error');
        } else {
            Swal.fire('Gagal Mencetak', `Pastikan file template "${templatePath.split('/').pop()}" sudah ada di folder "public/templates/"`, 'error');
        }
    }
};

// Data formatter helper
export const formatDataForPrint = (row: any) => {
    const formatDate = (dateString: string) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('id-ID', {
            day: 'numeric', month: 'long', year: 'numeric'
        });
    };

    const getDayName = (dateString: string) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('id-ID', { weekday: 'long' });
    };

    const hari_mulai = getDayName(row.tgl_mulai);
    const hari_selesai = getDayName(row.tgl_selesai);
    const isSameDay = row.tgl_mulai === row.tgl_selesai;

    // Split Keterangan by '|'
    const ketParts = (row.keterangan || '').split('|').map((s: string) => s.trim());
    const ket_1 = ketParts[0] || '';
    const ket_2 = ketParts[1] || '';
    const ket_3 = ketParts[2] || '';

    const tgl_mulai_fmt = formatDate(row.tgl_mulai);
    const tgl_selesai_fmt = formatDate(row.tgl_selesai);

    return {
        ...row,
        tgl_mulai_fmt,
        tgl_selesai_fmt,
        tgl_range: isSameDay ? tgl_mulai_fmt : `${tgl_mulai_fmt} s.d. ${tgl_selesai_fmt}`,

        hari_mulai,
        hari_selesai,
        hari_range: isSameDay ? hari_mulai : `${hari_mulai} s.d. ${hari_selesai}`,

        // Keterangan Parts
        keterangan: (row.keterangan || '').replace(/\|/g, ', '), // Clean version for standard view
        ket_1,
        ket_2,
        ket_3,

        is_one_day: isSameDay,
        is_multi_day: !isSameDay,

        today: formatDate(new Date().toISOString()),
        today_hari: getDayName(new Date().toISOString()),
        current_year: new Date().getFullYear(),
        is_izin: row.jenis === 'IZIN',
        is_sakit: row.jenis === 'SAKIT'
    };
};
