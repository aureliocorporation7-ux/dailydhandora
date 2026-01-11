/**
 * 📅 CENTRALIZED DATE UTILITIES
 * Standardizes timechecking and formatting across all bots.
 */

// Options for Indian Standard Time (IST)
const IST_OPTIONS = { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'numeric', year: 'numeric' };

/**
 * Checks if a date string refers to Today or Yesterday.
 * We allow "Yesterday" to handle late-night news fetched the next morning.
 * @param {string} dateStr - Date string from meta tag or JSON-LD
 * @returns {boolean} - True if acceptable, False if old
 */
function isFresh(dateStr) {
    if (!dateStr) return false;
    try {
        const articleDate = new Date(dateStr);

        // Convert article date to IST string format (D/M/YYYY)
        const artDateStr = articleDate.toLocaleDateString('en-IN', IST_OPTIONS);

        const now = new Date();
        const todayStr = now.toLocaleDateString('en-IN', IST_OPTIONS);

        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toLocaleDateString('en-IN', IST_OPTIONS);

        return artDateStr === todayStr || artDateStr === yesterdayStr;
    } catch (e) {
        console.error(`[DateUtils] Error parsing date: ${dateStr}`, e);
        return false;
    }
}

/**
 * Returns current date in IST as string (e.g., "11/01/2026")
 */
function getISTDate() {
    return new Date().toLocaleDateString('en-IN', IST_OPTIONS);
}

/**
 * Returns current full date string for display (e.g. "11 January 2026")
 */
function getReadableDate() {
    return new Date().toLocaleDateString('en-IN', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

/**
 * Gets hours difference between now and a date
 * @param {string} dateStr 
 * @returns {number} Hours difference
 */
function getHoursDiff(dateStr) {
    if (!dateStr) return 999;
    try {
        const d = new Date(dateStr);
        const now = new Date();
        const diffMs = now - d;
        return diffMs / (1000 * 60 * 60);
    } catch (e) {
        return 999;
    }
}

module.exports = {
    isFresh,
    getISTDate,
    getReadableDate,
    getHoursDiff
};
