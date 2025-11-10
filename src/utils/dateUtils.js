/**
 * Utility functions for date and week calculations
 */

/**
 * Get the ISO week number for a given date
 * @param {Date} date - The date to get the week number for
 * @returns {number} - ISO week number (1-53)
 */
export function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
}

/**
 * Get the current week number
 * @returns {number} - Current ISO week number
 */
export function getCurrentWeek() {
  return getWeekNumber(new Date())
}

/**
 * Get the start week for the season
 * Returns week 34 if current week is less than 34, otherwise returns current week
 * @param {number} year - The year to check (should be current year)
 * @returns {number} - Start week number
 */
export function getStartWeek(year) {
  const currentWeek = getCurrentWeek()
  const currentYear = new Date().getFullYear()
  
  // If we're in the current year, use max of current week and 34
  if (year === currentYear) {
    return Math.max(currentWeek, 34)
  }
  // If we're in a future year (shouldn't happen in normal flow), start from week 34
  return 34
}

/**
 * Get the date for a specific week and day of week
 * @param {number} year - The year
 * @param {number} week - ISO week number
 * @param {number} dayOfWeek - Day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
 * @returns {Date} - The date for that week and day
 */
export function getDateForWeekAndDay(year, week, dayOfWeek) {
  // Find the Monday of the ISO week
  // ISO week 1 is the week containing the first Thursday of the year
  // We'll use a simple approach: find a date in week 1, then find its Monday
  
  // Try January 4th - it's always in week 1 or the last week of previous year
  // If it's in week 1, use it. If not, use January 1st and find the Monday of that week
  let testDate = new Date(year, 0, 4)
  let testWeek = getWeekNumber(testDate)
  
  // If Jan 4 is not in week 1, it means week 1 hasn't started yet
  // In that case, week 1 starts on the Monday of the week containing Jan 4
  if (testWeek !== 1) {
    testDate = new Date(year, 0, 1)
  }
  
  // Find the Monday of the week containing testDate
  const testDay = testDate.getDay() // 0=Sunday, 1=Monday, ..., 6=Saturday
  let daysBackToMonday
  if (testDay === 0) {
    daysBackToMonday = 6 // Sunday -> go back 6 days to Monday
  } else {
    daysBackToMonday = testDay - 1 // Monday=1 -> 0, Tuesday=2 -> 1, etc.
  }
  
  const week1Monday = new Date(testDate)
  week1Monday.setDate(testDate.getDate() - daysBackToMonday)
  
  // Verify this is actually week 1
  const week1MondayWeek = getWeekNumber(week1Monday)
  if (week1MondayWeek !== 1) {
    // If not, adjust forward by 7 days
    week1Monday.setDate(week1Monday.getDate() + 7)
  }
  
  // Calculate the Monday of the target week
  const targetMonday = new Date(week1Monday)
  targetMonday.setDate(week1Monday.getDate() + (week - 1) * 7)
  
  // Adjust for the target day of week
  // dayOfWeek: 0=Sunday, 1=Monday, ..., 6=Saturday
  // JavaScript getDay(): 0=Sunday, 1=Monday, ..., 6=Saturday
  let daysFromMonday
  if (dayOfWeek === 0) {
    // Sunday: 6 days after Monday
    daysFromMonday = 6
  } else {
    // Monday=1 -> 0 days, Tuesday=2 -> 1 day, etc.
    daysFromMonday = dayOfWeek - 1
  }
  
  const targetDate = new Date(targetMonday)
  targetDate.setDate(targetMonday.getDate() + daysFromMonday)
  
  return targetDate
}

/**
 * Get all weeks from start week to end week
 * @param {number} startWeek - Starting week number
 * @param {number} endWeek - Ending week number
 * @param {number} year - The year
 * @returns {Array<{week: number, year: number}>} - Array of week objects
 */
export function getWeeksInRange(startWeek, endWeek, startYear) {
  const weeks = []
  let currentWeek = startWeek
  let currentYear = startYear
  
  while (true) {
    // Stop if we've passed week 24 of 2026
    if (currentYear > 2026) {
      break
    }
    
    // Stop if we're in 2026 and past week 24
    if (currentYear === 2026 && currentWeek > 24) {
      break
    }
    
    // Add the current week
    weeks.push({ week: currentWeek, year: currentYear })
    
    // If we just added week 24 of 2026, we're done
    if (currentYear === 2026 && currentWeek === 24) {
      break
    }
    
    // Increment week
    currentWeek++
    
    // Check if we need to move to next year
    // Get max week for current year BEFORE incrementing
    const maxWeek = getMaxWeekInYear(currentYear)
    if (currentWeek > maxWeek) {
      // Move to first week of next year
      currentWeek = 1
      currentYear++
      // Continue loop to add week 1 of next year
      continue
    }
  }
  
  return weeks
}

/**
 * Get the maximum week number in a year (usually 52 or 53)
 * @param {number} year - The year
 * @returns {number} - Maximum week number
 */
export function getMaxWeekInYear(year) {
  // Check dates from December 28 to December 31
  // The last week of the year is the week that contains December 28
  // (December 28 is always a Thursday, so it's always in the last ISO week of the year)
  
  let maxWeek = 0
  for (let day = 28; day <= 31; day++) {
    const date = new Date(year, 11, day)
    const week = getWeekNumber(date)
    
    // If we get week 1, it means this date is in the next year's week 1
    // So the current year's last week is the previous week number we found
    if (week === 1) {
      break
    }
    
    // Track the highest week number we've seen that's not week 1
    if (week > maxWeek) {
      maxWeek = week
    }
  }
  
  // If we didn't find any valid weeks (shouldn't happen), default to 52
  return maxWeek || 52
}

/**
 * Get dates for training days in a specific week
 * @param {number} year - The year
 * @param {number} week - ISO week number
 * @param {Array<number>} trainingDays - Array of day numbers (0=Sunday, 1=Monday, ..., 6=Saturday)
 * @returns {Array<Date>} - Array of dates for training days
 */
export function getTrainingDatesForWeek(year, week, trainingDays) {
  return trainingDays.map(day => getDateForWeekAndDay(year, week, day))
    .sort((a, b) => a - b) // Sort dates chronologically
}

/**
 * Format date to Swedish format (YYYY-MM-DD or DD/MM/YYYY)
 * @param {Date} date - The date to format
 * @param {string} format - Format string ('iso' or 'swedish')
 * @returns {string} - Formatted date string
 */
export function formatDate(date, format = 'iso') {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  
  if (format === 'swedish') {
    return `${day}/${month}`
  }
  return `${year}-${month}-${day}`
}

/**
 * Get day name in Swedish
 * @param {number} dayOfWeek - Day of week (0=Sunday, 1=Monday, ..., 6=Saturday)
 * @returns {string} - Day name in Swedish
 */
export function getDayName(dayOfWeek) {
  const days = ['Söndag', 'Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag']
  return days[dayOfWeek]
}

