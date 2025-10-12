/**
 * Calcul dynamique des jours fériés français
 * Compatible avec toutes les années (2024-2100)
 */

/**
 * Calcule la date de Pâques pour une année donnée (Algorithme de Meeus)
 * @param {number} year - Année
 * @returns {Date} - Date de Pâques
 */
const calculateEaster = (year) => {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  
  return new Date(year, month - 1, day);
};

/**
 * Génère tous les jours fériés français pour une année
 * @param {number} year - Année
 * @returns {Object} - { dates: Array<string>, names: Object }
 */
export const getHolidays = (year) => {
  const easter = calculateEaster(year);
  
  // Jours fériés fixes
  const fixedHolidays = [
    { date: `${year}-01-01`, name: 'Jour de l\'An' },
    { date: `${year}-05-01`, name: 'Fête du Travail' },
    { date: `${year}-05-08`, name: 'Victoire 1945' },
    { date: `${year}-07-14`, name: 'Fête Nationale' },
    { date: `${year}-08-15`, name: 'Assomption' },
    { date: `${year}-11-01`, name: 'Toussaint' },
    { date: `${year}-11-11`, name: 'Armistice' },
    { date: `${year}-12-25`, name: 'Noël' }
  ];
  
  // Jours fériés mobiles (basés sur Pâques)
  const easterDay = easter.getDate();
  const easterMonth = easter.getMonth();
  
  // Lundi de Pâques (+1 jour)
  const easterMonday = new Date(year, easterMonth, easterDay + 1);
  const easterMondayStr = `${year}-${String(easterMonday.getMonth() + 1).padStart(2, '0')}-${String(easterMonday.getDate()).padStart(2, '0')}`;
  
  // Ascension (+39 jours)
  const ascension = new Date(year, easterMonth, easterDay + 39);
  const ascensionStr = `${year}-${String(ascension.getMonth() + 1).padStart(2, '0')}-${String(ascension.getDate()).padStart(2, '0')}`;
  
  // Lundi de Pentecôte (+50 jours)
  const pentecostMonday = new Date(year, easterMonth, easterDay + 50);
  const pentecostMondayStr = `${year}-${String(pentecostMonday.getMonth() + 1).padStart(2, '0')}-${String(pentecostMonday.getDate()).padStart(2, '0')}`;
  
  const mobileHolidays = [
    { date: easterMondayStr, name: 'Lundi de Pâques' },
    { date: ascensionStr, name: 'Ascension' },
    { date: pentecostMondayStr, name: 'Lundi de Pentecôte' }
  ];
  
  // Combiner tous les jours fériés
  const allHolidays = [...fixedHolidays, ...mobileHolidays];
  
  // Trier par date
  allHolidays.sort((a, b) => new Date(a.date) - new Date(b.date));
  
  // Extraire les dates et les noms
  const dates = allHolidays.map(h => h.date);
  const names = {};
  allHolidays.forEach(h => {
    names[h.date] = h.name;
  });
  
  return { dates, names };
};

/**
 * Vérifie si une date est un jour férié
 * @param {string} dateStr - Date au format YYYY-MM-DD
 * @param {number} year - Année (optionnel, extrait de dateStr si non fourni)
 * @returns {boolean}
 */
export const isHoliday = (dateStr, year = null) => {
  if (!year) {
    year = parseInt(dateStr.split('-')[0]);
  }
  const { dates } = getHolidays(year);
  return dates.includes(dateStr);
};

/**
 * Récupère le nom d'un jour férié
 * @param {string} dateStr - Date au format YYYY-MM-DD
 * @param {number} year - Année (optionnel)
 * @returns {string|null} - Nom du jour férié ou null
 */
export const getHolidayName = (dateStr, year = null) => {
  if (!year) {
    year = parseInt(dateStr.split('-')[0]);
  }
  const { names } = getHolidays(year);
  return names[dateStr] || null;
};

/**
 * Génère les jours fériés pour plusieurs années
 * @param {number} startYear - Année de début
 * @param {number} endYear - Année de fin
 * @returns {Object} - { dates: Array<string>, names: Object }
 */
export const getHolidaysRange = (startYear, endYear) => {
  const allDates = [];
  const allNames = {};
  
  for (let year = startYear; year <= endYear; year++) {
    const { dates, names } = getHolidays(year);
    allDates.push(...dates);
    Object.assign(allNames, names);
  }
  
  return { dates: allDates, names: allNames };
};

/**
 * Cache pour les jours fériés (optimisation)
 */
const holidaysCache = {};

/**
 * Récupère les jours fériés avec cache
 * @param {number} year - Année
 * @returns {Object}
 */
export const getHolidaysCached = (year) => {
  if (!holidaysCache[year]) {
    holidaysCache[year] = getHolidays(year);
  }
  return holidaysCache[year];
};

/**
 * Compte le nombre de jours fériés dans une période
 * @param {string} startDate - Date de début (YYYY-MM-DD)
 * @param {string} endDate - Date de fin (YYYY-MM-DD)
 * @returns {number}
 */
export const countHolidaysInRange = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const startYear = start.getFullYear();
  const endYear = end.getFullYear();
  
  const { dates } = getHolidaysRange(startYear, endYear);
  
  return dates.filter(date => {
    const d = new Date(date);
    return d >= start && d <= end;
  }).length;
};

export default {
  getHolidays,
  isHoliday,
  getHolidayName,
  getHolidaysRange,
  getHolidaysCached,
  countHolidaysInRange
};
