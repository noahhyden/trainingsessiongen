import { formatDate, getDayName } from '../utils/dateUtils'

/**
 * Escape CSV field value (handle commas, quotes, newlines)
 */
function escapeCsvField(field) {
  if (field === null || field === undefined) {
    return ''
  }
  const stringField = String(field)
  // If field contains comma, quote, or newline, wrap in quotes and escape quotes
  if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
    return `"${stringField.replace(/"/g, '""')}"`
  }
  return stringField
}

/**
 * Convert array of objects to CSV string
 */
function arrayToCSV(data) {
  if (data.length === 0) return ''
  
  // Get headers from first object
  const headers = Object.keys(data[0])
  
  // Create CSV header row
  const headerRow = headers.map(escapeCsvField).join(',')
  
  // Create CSV data rows
  const dataRows = data.map(row => {
    return headers.map(header => escapeCsvField(row[header])).join(',')
  })
  
  // Combine header and data rows
  return [headerRow, ...dataRows].join('\n')
}

/**
 * Component for exporting season training plans to CSV
 */
export default function TrainingExporter({ plan }) {
  const exportSeasonPlan = () => {
    if (!plan || plan.length === 0) {
      alert('Ingen säsongsplan att exportera. Generera en plan först.')
      return
    }

    const allTrainings = []

    plan.forEach((weekPlan, weekIndex) => {
      const weekLabel = `Vecka ${weekPlan.week}, ${weekPlan.year}`
      const dateLabel = `${formatDate(weekPlan.date, 'swedish')} (${getDayName(weekPlan.date.getDay())})`

      weekPlan.session.forEach(({ block, activities }) => {
        activities.forEach((activity) => {
          const activityName = typeof activity === 'string' ? activity : activity || 'Övning'
          allTrainings.push({
            Vecka: weekLabel,
            Datum: dateLabel,
            Gren: weekPlan.discipline || '',
            Block: `Block ${block}`,
            Övning: activityName,
            Beskrivning: '' // No description in current data structure
          })
        })
      })
    })

    // Convert to CSV
    const csvContent = arrayToCSV(allTrainings)
    
    // Create blob and download
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' }) // BOM for Excel compatibility
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    
    // Generate filename with date range
    const startWeek = plan[0]
    const endWeek = plan[plan.length - 1]
    const filename = `säsongsplan_v${startWeek.week}_${startWeek.year}-v${endWeek.week}_${endWeek.year}.csv`
    
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <button
      onClick={exportSeasonPlan}
      className="bg-linnea-red-500 text-white px-6 py-3 rounded-lg hover:bg-linnea-red-600 focus:outline-none focus:ring-2 focus:ring-linnea-red-300 transition-all duration-300 ease-in-out font-medium shadow-sm"
    >
      Ladda ner säsongsplan (CSV)
    </button>
  )
}

