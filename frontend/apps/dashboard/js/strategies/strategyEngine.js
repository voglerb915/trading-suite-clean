// ======================================================
//  STRATEGY ENGINE (Frontend)
//  - zentrale Registrierung aller Frontend-Strategien
//  - Dashboard ruft nur noch strategyEngine[name](stocks) auf
// ======================================================

import { nearHigh52w } from "./nearHigh52w.js";
import { strategy52wHigh } from "./strategy52wHigh.js";


export const strategyEngine = {
    nearhigh52: nearHigh52w,
    high52w: strategy52wHigh,
 
};


