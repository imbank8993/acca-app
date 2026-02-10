
const {
    Document,
    Packer,
    Paragraph,
    TextRun,
    Table,
    TableRow,
    TableCell,
    WidthType,
    AlignmentType,
    HeadingLevel,
    Header,
    VerticalAlign,
    BorderStyle
} = require("docx");
const fs = require("fs");
const path = require("path");

function createTemplate(outputPath, isRekap = false) {
    const doc = new Document({
        sections: [{
            properties: {},
            children: [
                new Paragraph({
                    heading: HeadingLevel.HEADING_1,
                    alignment: AlignmentType.CENTER,
                    children: [
                        new TextRun({
                            text: isRekap ? "REKAPITULASI LAPORAN BIMBINGAN GURU ASUH" : "LAPORAN KEGIATAN GURU ASUH",
                            bold: true,
                            size: 28,
                        }),
                    ],
                }),
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                        new TextRun({
                            text: "MAN INSAN CENDEKIA GOWA",
                            bold: true,
                            size: 24,
                        }),
                    ],
                }),
                new Paragraph({ children: [] }), // Spacer

                // Header Info
                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    borders: {
                        top: { style: BorderStyle.NONE },
                        bottom: { style: BorderStyle.NONE },
                        left: { style: BorderStyle.NONE },
                        right: { style: BorderStyle.NONE },
                        insideHorizontal: { style: BorderStyle.NONE },
                        insideVertical: { style: BorderStyle.NONE },
                    },
                    rows: [
                        new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: isRekap ? "Bulan: {bulan}" : "Nama Siswa: {nama_siswa}", bold: true })] })] }),
                                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: isRekap ? "Tahun: {tahun}" : "Kelas: {kelas}", bold: true })] })] }),
                            ],
                        }),
                        new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Nama Guru: {nama_guru}", bold: true })] })] }),
                                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "NIP: {nip_guru}", bold: true })] })] }),
                            ],
                        }),
                    ],
                }),
                new Paragraph({ children: [] }),

                // Main Content Table
                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: [
                        new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "No", bold: true })], alignment: AlignmentType.CENTER })] }),
                                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Tanggal", bold: true })], alignment: AlignmentType.CENTER })] }),
                                isRekap ? new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Siswa", bold: true })], alignment: AlignmentType.CENTER })] }) : null,
                                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Kegiatan", bold: true })], alignment: AlignmentType.CENTER })] }),
                                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Hasil / Tindak Lanjut", bold: true })], alignment: AlignmentType.CENTER })] }),
                                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Bukti", bold: true })], alignment: AlignmentType.CENTER })] }),
                            ].filter(Boolean),
                        }),
                        new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: isRekap ? "{#reports}{no}" : "1" })] })] }),
                                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "{tanggal}" })] })] }),
                                isRekap ? new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "{siswa} ({kelas})" })] })] }) : null,
                                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "{kegiatan}" })] })] }),
                                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "{hasil}" })] })] }),
                                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: isRekap ? "{dokumen}{/reports}" : "{dokumen}" })] })] }),
                            ].filter(Boolean),
                        }),
                    ],
                }),

                new Paragraph({ children: [] }),
                new Paragraph({ children: [] }),

                // Footer
                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    borders: {
                        top: { style: BorderStyle.NONE },
                        bottom: { style: BorderStyle.NONE },
                        left: { style: BorderStyle.NONE },
                        right: { style: BorderStyle.NONE },
                        insideHorizontal: { style: BorderStyle.NONE },
                        insideVertical: { style: BorderStyle.NONE },
                    },
                    rows: [
                        new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph({ children: [] })], width: { size: 60, type: WidthType.PERCENTAGE } }),
                                new TableCell({
                                    children: [
                                        new Paragraph({ children: [new TextRun({ text: "Gowa, ......................... 2026" })], alignment: AlignmentType.CENTER }),
                                        new Paragraph({ children: [new TextRun({ text: "Guru Asuh," })], alignment: AlignmentType.CENTER }),
                                        new Paragraph({ children: [] }),
                                        new Paragraph({ children: [] }),
                                        new Paragraph({ children: [] }),
                                        new Paragraph({ children: [new TextRun({ text: "{nama_guru}", bold: true })], alignment: AlignmentType.CENTER }),
                                        new Paragraph({ children: [new TextRun({ text: "NIP. {nip_guru}" })], alignment: AlignmentType.CENTER }),
                                    ],
                                    width: { size: 40, type: WidthType.PERCENTAGE }
                                }),
                            ],
                        }),
                    ],
                }),

                // Attachment Page for Rekap
                ...(isRekap ? [
                    new Paragraph({ children: [], pageBreakBefore: true }),
                    new Paragraph({
                        heading: HeadingLevel.HEADING_2,
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: "LAMPIRAN DOKUMEN / FOTO KEGIATAN", bold: true, size: 24 })],
                    }),
                    new Paragraph({ children: [] }),
                    new Paragraph({ children: [new TextRun({ text: "{#images}" })] }),
                    new Paragraph({
                        children: [
                            new TextRun({ text: "Dokumen {idx}: {siswa} - {tanggal}", bold: true }),
                        ]
                    }),
                    new Paragraph({ children: [new TextRun({ text: "{%url}" })] }),
                    new Paragraph({ children: [] }),
                    new Paragraph({ children: [new TextRun({ text: "{/images}" })] }),
                ] : [])
            ],
        }],
    });

    Packer.toBuffer(doc).then((buffer) => {
        fs.writeFileSync(outputPath, buffer);
        console.log(`Successfully created: ${outputPath}`);
    });
}

const templatesDir = path.join(__dirname, "public", "templates");
if (!fs.existsSync(templatesDir)) {
    fs.mkdirSync(templatesDir, { recursive: true });
}

createTemplate(path.join(templatesDir, "template_laporan_guru_asuh.docx"), false);
createTemplate(path.join(templatesDir, "template_rekap_guru_asuh.docx"), true);
