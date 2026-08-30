export function sortBy(list, key, direction = "asc") {
    return [...list].sort((a, b) => {
        const A = a[key];
        const B = b[key];

        // Null / undefined zuerst behandeln
        if (A == null && B != null) return direction === "asc" ? -1 : 1;
        if (A != null && B == null) return direction === "asc" ? 1 : -1;
        if (A == null && B == null) return 0;

        // Zahlen
        if (typeof A === "number" && typeof B === "number") {
            return direction === "asc" ? A - B : B - A;
        }

        // Strings
        return direction === "asc"
            ? String(A).toLowerCase().localeCompare(String(B).toLowerCase())
            : String(B).toLowerCase().localeCompare(String(A).toLowerCase());
    });
}
