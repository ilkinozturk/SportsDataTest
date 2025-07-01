/**
 * Sorting utilities for football matches and other data
 */

/**
 * Sort matches by time (earliest first)
 * @param {Array} matches - Array of match objects with date property
 * @returns {Array} Sorted matches array
 */
function sortMatchesByTime(matches) {
  return matches.sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    return dateA.getTime() - dateB.getTime();
  });
}

/**
 * Sort matches by time (latest first)
 * @param {Array} matches - Array of match objects with date property
 * @returns {Array} Sorted matches array
 */
function sortMatchesByTimeDesc(matches) {
  return matches.sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    return dateB.getTime() - dateA.getTime();
  });
}

/**
 * Group matches by date and sort each group by time
 * @param {Array} matches - Array of match objects
 * @returns {Object} Object with dates as keys and sorted matches as values
 */
function groupAndSortMatchesByDate(matches) {
  const grouped = {};

  matches.forEach(match => {
    const matchDate = new Date(match.date);
    const dateKey = matchDate.toISOString().split('T')[0]; // YYYY-MM-DD format

    if (!grouped[dateKey]) {
      grouped[dateKey] = [];
    }
    grouped[dateKey].push(match);
  });

  // Sort matches within each date group by time
  Object.keys(grouped).forEach(date => {
    grouped[date] = sortMatchesByTime(grouped[date]);
  });

  return grouped;
}

/**
 * Format time for display (HH:MM format)
 * @param {string|Date} dateInput - Date string or Date object
 * @returns {string} Time in HH:MM format
 */
function formatMatchTime(dateInput) {
  const date = new Date(dateInput);
  return date.toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * Format date for display (DD/MM/YYYY format)
 * @param {string|Date} dateInput - Date string or Date object
 * @returns {string} Date in DD/MM/YYYY format
 */
function formatMatchDate(dateInput) {
  const date = new Date(dateInput);
  return date.toLocaleDateString('tr-TR');
}

/**
 * Get matches for today sorted by time
 * @param {Array} matches - Array of all matches
 * @returns {Array} Today's matches sorted by time
 */
function getTodayMatchesSorted(matches) {
  const today = new Date().toISOString().split('T')[0];
  const todayMatches = matches.filter(match => {
    const matchDate = new Date(match.date).toISOString().split('T')[0];
    return matchDate === today;
  });

  return sortMatchesByTime(todayMatches);
}

// For Node.js environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    sortMatchesByTime,
    sortMatchesByTimeDesc,
    groupAndSortMatchesByDate,
    formatMatchTime,
    formatMatchDate,
    getTodayMatchesSorted,
  };
}

// For browser environments
if (typeof window !== 'undefined') {
  window.SortUtils = {
    sortMatchesByTime,
    sortMatchesByTimeDesc,
    groupAndSortMatchesByDate,
    formatMatchTime,
    formatMatchDate,
    getTodayMatchesSorted,
  };
}
