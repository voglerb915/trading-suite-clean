/**
 * ====================================================================
 * ARCHITECTURE & MODULE MAPPING (Dashboard Refactoring Plan)
 * ====================================================================
 * 
 * core/state.js (Beinhaltet Punkt 3)
 * - Zentraler Ort für den globalen dashboardState und Initialisierungsstrukturen.
 *
 * core/api.js (Beinhaltet Punkt 4, 5 & 6)
 * - Handhabt die Kommunikation mit dem Backend. Enthält den Init-Request,
 *   den Request-Sender für Datenabfragen und den zentralen Response-Handler.
 *
 * core/filterLogic.js (Beinhaltet Punkt 8 & 9)
 * - Beinhaltet die lokale Filterung (Suchbegriffe, Indizes, Buy/Sell/Long/Exit-Pillen,
 *   Trend-Filter) sowie das Zusammenführen (Merge) von Strategiedaten.
 *
 * core/eventHandlers.js (Beinhaltet Punkt 2, 10, 11 & 12)
 * - Die gesamte Event-Steuerung. Bündelt den globalen Event-Listener für Klicks 
 *   (Pillen, Dropdowns, Sektoren, Branchen, Aktien) sowie spezifische Handler 
 *   wie StrategyChange, Index, Search, Reset und den globalen Stock-Click-Handler.
 *
 * core/renderer.js (Beinhaltet Punkt 7)
 * - Steuert das übergeordnete renderAll(), das die einzelnen Komponenten 
 *   (Header, Sektoren, Signallisten) auf Basis des aktuellen States aktualisiert.
 *
 * main.js / dashboard.js (Beinhaltet Punkt 1 & 13)
 * - Der neue Einstiegspunkt (Entry Point). Importiert die Module, führt die 
 *   initialen Bindings aus (inklusive READY-Console-Log) und startet die Anwendung.
 * ====================================================================
 */
// ======================================================
//  DASHBOARD — FINAL VERSION (Dashboard filtert, Cockpit liefert Daten)
// ======================================================
/*
1. IMPORTS
2. GLOBALER STOCK-CLICK-HANDLER
3. GLOBAL STATE
4. INIT REQUEST
5. REQUEST SENDER
6. RESPONSE HANDLER
7. RENDER ALL
8. Strategy-Merge (lokal im Dashboard)
9. Lokale Filterlogik
10. StrategyChange Handler
11. Index, Search, Reset
12. CLICK HANDLER
13. READY
*/

// ======================================================
// DASHBOARD MAIN - Entry Point (im Hauptverzeichnis)
// ======================================================

import { dashboardState } from "./core/state.js";
import { requestInit, initResponseListener } from "./core/api.js";

// Event-Handler & Filter aus dem core-Ordner einbinden
import "./core/eventHandlers.js";
import "./core/filterLogic.js";

console.log("Dashboard NewStructure loaded");

// 1. Response-Listener für postMessage vom Backend starten
initResponseListener();

// 2. INIT-Request ans Backend senden, um die Daten zu laden
requestInit();

console.log("Dashboard NewStructure initialization completed.");