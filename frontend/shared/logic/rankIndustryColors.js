// shared/logic/rankIndustryColors.js

export const rankIndustryColors = {
    1: "#006400",
    2: "#3EC000",
    3: "#78E000",
    4: "#A8F000",
    5: "#D0F200",
    6: "#F0E000",
    7: "#EBCC00",
    8: "#D39C00",
    9: "#BB6800",
    10: "#A33400",
    11: "#8B0000",
    12: "#7A0000",
    13: "#690000",
    14: "#580000",
    15: "#470000",
    16: "#360000"
};

// Mapping: Rang → Farbklasse
export function getIndustryColor(rank) {
    const abs = Math.abs(rank);
    let cls = Math.ceil(abs / 9);

    if (cls < 1) cls = 1;
    if (cls > 16) cls = 16;

    return rankIndustryColors[cls];
}

// Textfarbe abhängig von Hintergrund
export function getIndustryTextColor(bgColor) {
    const r = parseInt(bgColor.substr(1, 2), 16);
    const g = parseInt(bgColor.substr(3, 2), 16);
    const b = parseInt(bgColor.substr(5, 2), 16);

    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return luminance < 140 ? "#fff" : "#000";
}
