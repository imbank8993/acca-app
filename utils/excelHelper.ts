

import * as XLSX_BASE from 'xlsx'
// We need to keep these styles here or move them? They are simple objects.

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

export const exportToExcel = async (data: any[], fileName: string, sheetName: string = 'Data') => {
    const XLSX = XLSX_BASE;

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

export const downloadTemplate = async (columns: string[], fileName: string) => {
    const XLSX = XLSX_BASE;
    const worksheet = XLSX.utils.aoa_to_sheet([columns])
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
                const workbook = XLSX_BASE.read(data, { type: 'array' })
                const sheetName = workbook.SheetNames[0]
                const worksheet = workbook.Sheets[sheetName]
                const json = XLSX_BASE.utils.sheet_to_json(worksheet)
                resolve(json)
            } catch (error) {
                reject(error)
            }
        }
        reader.onerror = (error) => reject(error)
        reader.readAsArrayBuffer(file)
    })
}
