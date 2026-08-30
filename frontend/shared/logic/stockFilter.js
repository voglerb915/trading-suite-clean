function isEtfOrFund(s) {
    const industry = (s.industry || "").toLowerCase();

    return (
        industry === "exchange traded fund" ||
        industry.includes("etf") ||
        industry.includes("fund")
    );
}

// KEIN Warrant/Preferred/Unit-Filter mehr!

function isRealStock(s) {
    if (!s) return false;

    // ETFs raus
    if (isEtfOrFund(s)) return false;

    // Shell Companies bleiben drin
    // SPAC Units bleiben drin
    // Warrants bleiben drin
    // Preferred Shares bleiben drin

    return true;
}

module.exports = {
    isRealStock
};
