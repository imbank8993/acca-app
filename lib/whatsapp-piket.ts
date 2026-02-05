
const FONNTE_TOKEN = 'wKoRYfEomVBMXKGCuoV1';
const WA_TARGET = '120363422816819001@g.us';

export async function sendWhatsAppPiket(data: any) {
    try {
        const { guruPiket, jamPiket, keteranganTambahan, details, timestamp } = data;

        const dateObj = new Date(timestamp);
        // Format date: dd MMMM yyyy, HH:mm
        const options: Intl.DateTimeFormatOptions = {
            day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
        };
        const waktuLengkap = dateObj.toLocaleDateString('id-ID', options);

        let message = `*📝Laporan Guru Piket Jam Ke- ${jamPiket}*\n\n`;

        if (details && details.length > 0) {
            details.forEach((d: any) => {
                message += `• *${d.kelas}* │ ${d.guru} │ ${d.status || '-'}\n`;
            });
        } else {
            message += `Tidak ada data kelas terisi.\n`;
        }

        message += `\nCatatan tambahan : ${keteranganTambahan || '-'}`;
        message += `\n\nTerima Kasih Bapak/Ibu Hebat MAN IC Gowa.`;
        message += `\nDilaporkan oleh ${guruPiket} pada ${waktuLengkap}`;

        const payload = {
            target: WA_TARGET,
            message: message,
        };

        const res = await fetch("https://api.fonnte.com/send", {
            method: "POST",
            headers: {
                "Authorization": FONNTE_TOKEN,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const result = await res.json();
        console.log("Fonnte Response:", result);
        return result.status === true;

    } catch (error) {
        console.error("Failed to send WhatsApp:", error);
        return false;
    }
}
