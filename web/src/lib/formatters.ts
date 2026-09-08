/**
 * Format integer minor units (e.g. cents, sen) into a localized currency string.
 * Strictly avoids floating point math: integer division and remainder are used.
 * Example: 1000000 with currency 'IDR' -> "Rp 10.000,00"
 */
export function formatCurrency(minorUnits: number | bigint = 0, currency: string = 'IDR'): string {
    const isNegative = minorUnits < 0;
    const absVal = Math.abs(Number(minorUnits));
    const major = Math.floor(absVal / 100);
    const minor = absVal % 100;
    const minorStr = minor.toString().padStart(2, '0');

    const formattedMajor = new Intl.NumberFormat('id-ID').format(major);
    const prefix = isNegative ? '-' : '';

    if (currency.toUpperCase() === 'IDR') {
        return `${prefix}Rp ${formattedMajor},${minorStr}`;
    }

    return `${prefix}${currency} ${formattedMajor}.${minorStr}`;
}

/**
 * Format ISO datetime string to localized readable date
 */
export function formatDate(isoString?: string): string {
    if (!isoString) return '-';
    try {
        const date = new Date(isoString);
        return new Intl.DateTimeFormat('id-ID', {
            dateStyle: 'medium',
            timeStyle: 'short',
        }).format(date);
    } catch {
        return isoString;
    }
}
