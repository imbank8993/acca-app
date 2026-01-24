import * as XLSX from 'xlsx-js-style'

const HEADER_STYLE = {
    fill: { fgColor: { rgb: "4F81BD" } }, // Blueish
    font: { sz: 12, bold: true, color: { rgb: "FFFFFF" } },
    alignment: { horizontal: "center", vertical: "center" },
    border: {
        top: { style: "thin", color: { rgb: "000000" } },
        bottom: { style: "thin", color: { rgb: "000000" } },
        left: { style: "thin", color: { rgb: "000000" } },
        right: { style: "thin", color: { rgb: "000000" } }
    }
}

const DATA_STYLE = {
    border: {
        top: { style: "thin", color: { rgb: "CCCCCC" } },
        bottom: { style: "thin", color: { rgb: "CCCCCC" } },
        left: { style: "thin", color: { rgb: "CCCCCC" } },
        right: { style: "thin", color: { rgb: "CCCCCC" } }
    },
    alignment: { vertical: "center", wrapText: false }
}

export const exportToExcel = (data: any[], fileName: string, sheetName: string = 'Data') => {
    // 1. Create Worksheet
    const worksheet = XLSX.utils.json_to_sheet(data)

    // 2. Apply Header Styles
    const range = XLSX.utils.decode_range(worksheet['!ref'] || "A1:A1")

    // Auto-width calculation
    const colWidths: any[] = []

    for (let C = range.s.c; C <= range.e.c; ++C) {
        const address = XLSX.utils.encode_col(C) + "1" // Header row is 1
        if (!worksheet[address]) continue;

        // Apply Header Style
        worksheet[address].s = HEADER_STYLE

        // Calc width based on header text
        const headerText = String(worksheet[address].v)
        colWidths[C] = { wch: Math.max(headerText.length + 5, 15) } // Min width 15
    }

    // Apply Data Styles
    for (let R = range.s.r + 1; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
            const address = XLSX.utils.encode_cell({ r: R, c: C })
            if (!worksheet[address]) continue;

            const headerAddress = XLSX.utils.encode_col(C) + "1";
            const header = worksheet[headerAddress] ? String(worksheet[headerAddress].v) : '';
            const lower = header.toLowerCase();

            if (lower.includes('nisn') || lower.includes('nip') || lower.includes('kode') || lower.includes('nik') || lower.includes('hp')) {
                worksheet[address].t = 's';
                worksheet[address].z = '@';
                worksheet[address].s = { ...DATA_STYLE, numFmt: '@' };
            } else {
                worksheet[address].s = DATA_STYLE
            }
        }
    }

    worksheet['!cols'] = colWidths

    // 3. Create Workbook and Download
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
    XLSX.writeFile(workbook, `${fileName}.xlsx`)
}

export const downloadTemplate = (columns: string[], fileName: string) => {
    // Create an empty row with just headers
    const data = [
        columns.reduce((acc, col) => ({ ...acc, [col]: '' }), {}) // Empty row to ensure headers are generated? 
        // Actually json_to_sheet uses keys as headers if data exists.
        // If we want just headers and maybe 1 example row?
        // Let's providing an empty object with keys might Result in just headers?
        // No, json_to_sheet with empty values works.
    ]
    // Or better: Use array of arrays (AOA) for explicit control.
    // But keeping it consistent with exportToExcel logic is easier for styling.

    // Let's create dummy data for the user to understand? Or just empty.
    // User asked "bisa download template" implies empty structure.

    // Using json_to_sheet with one empty row object might result in a row of empty strings. 
    // Let's stick to AOA for template to be safe and clean.

    const worksheet = XLSX.utils.aoa_to_sheet([columns])

    // Apply styles to the single header row
    const range = XLSX.utils.decode_range(worksheet['!ref'] || "A1:A1")
    const colWidths: any[] = []

    // Identify text columns
    const textColIndices: number[] = [];
    columns.forEach((col, idx) => {
        const lower = col.toLowerCase();
        if (lower.includes('nisn') || lower.includes('nip') || lower.includes('kode') || lower.includes('nik') || lower.includes('hp')) {
            textColIndices.push(idx);
        }
    });

    for (let C = range.s.c; C <= range.e.c; ++C) {
        const address = XLSX.utils.encode_col(C) + "1"
        if (worksheet[address]) {
            worksheet[address].s = HEADER_STYLE
            colWidths[C] = { wch: Math.max(String(worksheet[address].v).length + 5, 15) }
        }
    }
    worksheet['!cols'] = colWidths

    // Pre-format 50 rows
    for (let R = 1; R <= 50; ++R) {
        for (let C of textColIndices) {
            const cellAddress = XLSX.utils.encode_cell({ c: C, r: R });
            worksheet[cellAddress] = {
                v: '',
                t: 's',
                z: '@',
                s: {
                    alignment: { wrapText: true },
                    numFmt: '@'
                }
            };
        }
    }
    // Update Range
    if (textColIndices.length > 0) {
        worksheet['!ref'] = XLSX.utils.encode_range({ s: { c: 0, r: 0 }, e: { c: columns.length - 1, r: 50 } });
    }

    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template')
    XLSX.writeFile(workbook, `${fileName}.xlsx`)
}

export const importFromExcel = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => {
            try {
                const data = e.target?.result
                const workbook = XLSX.read(data, { type: 'array' })
                const sheetName = workbook.SheetNames[0]
                const worksheet = workbook.Sheets[sheetName]
                const json = XLSX.utils.sheet_to_json(worksheet)
                resolve(json)
            } catch (error) {
                reject(error)
            }
        }
        reader.onerror = (error) => reject(error)
        reader.readAsArrayBuffer(file)
    })
}
