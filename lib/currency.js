const FALLBACK_CURRENCY = 'egp';

function normalizeCurrency(value) {
    return typeof value === 'string' && value.trim()
        ? value.trim().toLowerCase()
        : FALLBACK_CURRENCY;
}

export function getStripeCurrency() {
    return normalizeCurrency(
        process.env.STRIPE_CURRENCY || process.env.NEXT_PUBLIC_STRIPE_CURRENCY || FALLBACK_CURRENCY
    );
}

export function getCurrencySymbol(currencyCode = getStripeCurrency()) {
    const normalized = normalizeCurrency(currencyCode);
    const fromEnv = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL;
    if (typeof fromEnv === 'string' && fromEnv.trim()) {
        return fromEnv.trim();
    }

    const symbols = {
        egp: 'E£',
        usd: '$',
        eur: '€',
        gbp: '£',
        sar: 'SAR ',
        aed: 'AED ',
    };

    return symbols[normalized] || normalized.toUpperCase() + ' ';
}
