import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { saveAs } from 'file-saver';
import Swal from 'sweetalert2';

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

        // 3. Create Docxtemplater instance
        const doc = new Docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
        });

        // 4. Render data
        doc.render(data);

        // 5. Generate output blob
        const out = doc.getZip().generate({
            type: 'blob',
            mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        });

        // 6. Save file
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
