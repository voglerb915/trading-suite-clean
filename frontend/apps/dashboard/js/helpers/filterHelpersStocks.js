// Zentraler Signal-Filter für Sectors, Industries, Stocks
export function passesSignalFilter(signalObj, entryFlag, exitFlag) {
   
    
    const sig = signalObj?.signal;

    if (!sig) return (!entryFlag && !exitFlag);
    if (!entryFlag && !exitFlag) return true;
    if (sig === "entry" && entryFlag) return true;
    if (sig === "exit" && exitFlag) return true;

    return false;
}