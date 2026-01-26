export function getCurrentAcademicYear(): string {
    const now = new Date();
    const month = now.getMonth(); // 0-11
    const year = now.getFullYear();

    // July is index 6.
    // If month >= 6 (July or later): current year / next year
    // If month < 6 (Jan - June): previous year / current year
    if (month >= 6) {
        return `${year}/${year + 1}`;
    } else {
        return `${year - 1}/${year}`;
    }
}
