// Debug script to test page parsing
import { parsePages } from './lib/auth'

// Test cases based on user screenshots
const testCases = [
    {
        name: "With Unicode (Wrong)",
        input: "☑Nilai☐LCKHApproval☐LCKH📊Status User☐JadwalGuru",
    },
    {
        name: "Correct Format",
        input: "Nilai,LCKHApproval,LCKH,Status User,JadwalGuru",
    },
    {
        name: "With Submenu",
        input: "Nilai,LCKH,Rekap Data>Summary|Detail,Master Data>Siswa|Guru",
    }
]

console.log("=== PAGE PARSING TEST ===\n")

testCases.forEach(test => {
    console.log(`\nTest: ${test.name}`)
    console.log(`Input: "${test.input}"`)
    const result = parsePages(test.input)
    console.log(`Output:`)
    console.log(`  Pages Array:`, result.pagesArray)
    console.log(`  Pages Tree:`)
    result.pagesTree.forEach((node, i) => {
        console.log(`    ${i}. ${node.title}`, node.children.length > 0 ? `(${node.children.length} children)` : '')
    })
})
