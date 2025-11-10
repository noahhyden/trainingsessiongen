import { useEffect, useState } from 'react'
import TrainingExporter from './components/TrainingExporter'
import ExerciseEditor from './components/ExerciseEditor'
import VideoModal from './components/VideoModal'
import { shuffleArray } from './utils/shuffle'
import { EXERCISES_PER_BLOCK, NUM_BLOCKS, DISCIPLINES, AGE_GROUPS } from './utils/constants'
import { getVideoId, hasVideo } from './utils/videoMapping'
import { 
  getStartWeek, 
  getWeeksInRange, 
  getTrainingDatesForWeek, 
  formatDate, 
  getDayName 
} from './utils/dateUtils'

export default function App() {
  const [exerciseData, setExerciseData] = useState(null)
  const [form, setForm] = useState({ 
    ageGroup: '7-9',
    trainingDays: [] // Array of day numbers: 0=Sunday, 1=Monday, etc.
  })
  const [plan, setPlan] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [videoModal, setVideoModal] = useState({ isOpen: false, videoId: null, exerciseName: null })
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [activeView, setActiveView] = useState('generator')

  const videoMap = exerciseData?.videos || {}

  useEffect(() => {
    fetch('/api/exercises')
      .then(response => {
        if (!response.ok) {
          throw new Error('Kunde inte ladda övningar')
        }
        return response.json()
      })
      .then(data => {
        setExerciseData(data)
        setError(null)
      })
      .catch(err => {
        console.error('Fel vid laddning av övningar:', err)
        setError('Kunde inte ladda övningar. Vänligen ladda om sidan.')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  function handleChange(e) {
    const { name, value, type, checked } = e.target
    setForm(prev => {
      if (type === 'checkbox') {
        const currentArray = prev[name] || []
        const numValue = parseInt(value, 10)
        return {
          ...prev,
          [name]: checked
            ? [...currentArray, numValue]
            : currentArray.filter(g => g !== numValue)
        }
      }
      return {
        ...prev,
        [name]: value
      }
    })
  }

  /**
   * Check if a week is a holiday week
   * @param {number} week - Week number
   * @param {number} year - Year
   * @returns {boolean} - True if it's a holiday week
   */
  function isHolidayWeek(week, year) {
    // Week 44: Autumn break (Höstlov)
    // Week 52: Christmas holidays
    // Week 1: Christmas holidays (continues from previous year)
    // Week 15: Easter break (Påsklov) - 2026
    const holidayWeeks = [44, 52, 1, 15]
    return holidayWeeks.includes(week)
  }

  /**
   * Select disciplines for each week ensuring spacing of at least 3-4 sessions
   * @param {number} numWeeks - Number of weeks to generate
   * @returns {Array<string>} - Array of discipline names, one per week
   */
  function selectDisciplinesWithSpacing(numWeeks) {
    const disciplines = [...DISCIPLINES]
    const selectedDisciplines = []
    const minSpacing = 4 // Minimum sessions between same discipline (using 4 to ensure good spacing)
    
    // Track last occurrence of each discipline
    const lastOccurrence = {}
    
    for (let i = 0; i < numWeeks; i++) {
      // Get available disciplines (those that haven't been used in the last minSpacing sessions)
      const availableDisciplines = disciplines.filter(discipline => {
        const lastUsed = lastOccurrence[discipline]
        return lastUsed === undefined || (i - lastUsed) >= minSpacing
      })
      
      // If no disciplines are available (shouldn't happen with 7 disciplines and spacing of 4), use all
      const candidates = availableDisciplines.length > 0 ? availableDisciplines : disciplines
      
      // Randomly select from available disciplines
      const shuffled = shuffleArray([...candidates])
      const selected = shuffled[0]
      
      selectedDisciplines.push(selected)
      lastOccurrence[selected] = i
    }
    
    return selectedDisciplines
  }

  function generatePlan() {
    // Reset error state
    setError(null)

    // Validate data is loaded
    if (!exerciseData) {
      setError('Övningar är ännu inte laddade. Vänligen vänta...')
      return
    }

    // Validate training days are selected
    const { ageGroup, trainingDays } = form
    if (!trainingDays || trainingDays.length === 0) {
      setError('Vänligen välj minst en träningsdag.')
      return
    }

    // Validate that at least one discipline has data for the age group
    const hasData = DISCIPLINES.some(discipline => {
      return exerciseData?.[discipline]?.[ageGroup] !== undefined
    })
    
    if (!hasData) {
      setError('Inga övningar hittade för den valda åldersgruppen.')
      return
    }

    // Calculate season weeks
    const currentYear = new Date().getFullYear()
    const startWeek = getStartWeek(currentYear)
    const allWeeks = getWeeksInRange(startWeek, 24, currentYear)

    // Filter out holiday weeks
    const weeks = allWeeks.filter(({ week, year }) => !isHolidayWeek(week, year))

    // Calculate total number of sessions (non-holiday weeks * training days per week)
    const totalSessions = weeks.length * trainingDays.length

    // Select disciplines for each session with proper spacing
    const selectedDisciplines = selectDisciplinesWithSpacing(totalSessions)

    // Generate season plan - one session per training day per week
    const seasonPlan = []
    let sessionIndex = 0

    weeks.forEach(({ week, year }) => {
      // Get training dates for this week (all selected days)
      const trainingDates = getTrainingDatesForWeek(year, week, trainingDays)

      // Generate one session for each training day in this week
      trainingDates.forEach((trainingDate) => {
        // Get discipline for this session
        const discipline = selectedDisciplines[sessionIndex]
        const blocks = exerciseData?.[discipline]?.[ageGroup]

        // Generate one session
        const session = Array.from({ length: NUM_BLOCKS }, (_, idx) => {
          const blockNum = (idx + 1).toString()
          const candidates = blocks?.[blockNum] || []
          const shuffled = shuffleArray(candidates)
          return {
            block: blockNum,
            activities: shuffled.slice(0, EXERCISES_PER_BLOCK)
          }
        })

        seasonPlan.push({
          week,
          year,
          date: trainingDate,
          discipline,
          session
        })

        sessionIndex++
      })
    })

    setPlan(seasonPlan)
  }

  function handleExerciseClick(exerciseName) {
    const videoId = getVideoId(videoMap, exerciseName)
    setVideoModal({
      isOpen: true,
      videoId: videoId,
      exerciseName: exerciseName
    })
  }

  function closeVideoModal() {
    setVideoModal({ isOpen: false, videoId: null, exerciseName: null })
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            {/* Logo */}
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-linnea-500">IF Linnéa</h1>
              <span className="ml-2 text-lg text-gray-600">Friidrott</span>
            </div>
            
            {/* Desktop Navigation */}
            <nav className="hidden md:flex space-x-6">
              <a href="#" className="text-gray-700 hover:text-linnea-500 font-medium transition-colors">Hem</a>
              <a href="#" className="text-gray-700 hover:text-linnea-500 font-medium transition-colors">Träna</a>
              <a href="#" className="text-gray-700 hover:text-linnea-500 font-medium transition-colors">Tävla</a>
              <a href="#" className="text-gray-700 hover:text-linnea-500 font-medium transition-colors">Information</a>
            </nav>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden text-gray-700 hover:text-linnea-500"
              aria-label="Meny"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <nav className="md:hidden pb-4 space-y-2">
              <a href="#" className="block py-2 text-gray-700 hover:text-linnea-500 font-medium">Hem</a>
              <a href="#" className="block py-2 text-gray-700 hover:text-linnea-500 font-medium">Träna</a>
              <a href="#" className="block py-2 text-gray-700 hover:text-linnea-500 font-medium">Tävla</a>
              <a href="#" className="block py-2 text-gray-700 hover:text-linnea-500 font-medium">Information</a>
            </nav>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div className="space-y-8">
          {/* Page Title */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Träningspassgenerator</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Välj åldersgrupp och träningsdagar för att generera en säsongsplan. Grenen randomiseras automatiskt för varje vecka.
            </p>
          </div>

          {/* View Switcher */}
          <div className="flex justify-center">
            <div className="inline-flex rounded-full bg-gray-100 p-1 shadow-inner">
              <button
                type="button"
                onClick={() => setActiveView('generator')}
                className={`px-6 py-2 text-sm font-semibold rounded-full transition-all ${
                  activeView === 'generator'
                    ? 'bg-white text-linnea-600 shadow'
                    : 'text-gray-600 hover:text-linnea-500'
                }`}
              >
                Generera pass
              </button>
              <button
                type="button"
                onClick={() => setActiveView('editor')}
                className={`px-6 py-2 text-sm font-semibold rounded-full transition-all ${
                  activeView === 'editor'
                    ? 'bg-white text-linnea-600 shadow'
                    : 'text-gray-600 hover:text-linnea-500'
                }`}
              >
                Redigera övningar
              </button>
            </div>
          </div>

          {activeView === 'generator' && (
            <>
              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border-l-4 border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                  <span className="block sm:inline">{error}</span>
                </div>
              )}

              {/* Form Section */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="space-y-6">
                  {/* Age Group Selection */}
                  <div className="flex flex-col space-y-2">
                    <label className="font-semibold text-gray-800 text-lg">Åldersgrupp</label>
                    <select
                      className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-linnea-500 focus:border-linnea-500 transition-colors"
                      value={form.ageGroup}
                      onChange={handleChange}
                      name="ageGroup"
                    >
                      {AGE_GROUPS.map(ageGroup => (
                        <option key={ageGroup} value={ageGroup}>
                          {ageGroup}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Training Days Selection */}
                  <div className="flex flex-col space-y-3">
                    <label className="font-semibold text-gray-800 text-lg">Träningsdagar</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { value: 1, label: 'Måndag' },
                        { value: 2, label: 'Tisdag' },
                        { value: 3, label: 'Onsdag' },
                        { value: 4, label: 'Torsdag' },
                        { value: 5, label: 'Fredag' },
                        { value: 6, label: 'Lördag' },
                        { value: 0, label: 'Söndag' }
                      ].map(day => (
                        <label key={day.value} className="flex items-center space-x-2 cursor-pointer p-2 rounded hover:bg-gray-50 transition-colors">
                          <input
                            type="checkbox"
                            name="trainingDays"
                            value={day.value}
                            checked={form.trainingDays?.includes(day.value) || false}
                            onChange={handleChange}
                            className="w-4 h-4 text-linnea-500 border-gray-300 rounded focus:ring-linnea-500"
                          />
                          <span className="text-gray-700">{day.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Generate Plan Button */}
                  <div className="pt-4">
                    <button
                      onClick={generatePlan}
                      disabled={!exerciseData || loading}
                      className="w-full sm:w-auto bg-linnea-500 text-white px-8 py-3 rounded-lg hover:bg-linnea-600 focus:outline-none focus:ring-2 focus:ring-linnea-300 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-300 ease-in-out font-medium text-lg shadow-sm"
                    >
                      Generera Säsongsplan
                    </button>
                  </div>
                </div>
              </div>

              {/* Export Button */}
              {plan && (
                <div className="flex justify-center">
                  <TrainingExporter plan={plan} />
                </div>
              )}

              {/* Training Plan Display */}
              {plan && (
                <div className="space-y-6">
                  <div className="bg-linnea-50 border-l-4 border-linnea-500 rounded-lg p-5 shadow-sm">
                    <p className="text-base text-linnea-900">
                      <strong className="font-semibold">Säsongsplan:</strong> Vecka {plan[0]?.week} {plan[0]?.year} - Vecka {plan[plan.length - 1]?.week} {plan[plan.length - 1]?.year} 
                      <span className="ml-2">({plan.length} träningspass)</span>
                    </p>
                  </div>
                  {plan.map((weekPlan, planIndex) => (
                    <div
                      key={`week-${weekPlan.week}-${weekPlan.year}-${planIndex}-${formatDate(weekPlan.date, 'iso')}`}
                      className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="mb-4 pb-3 border-b border-gray-200">
                        <h3 className="text-xl font-bold text-gray-900 mb-1">
                          Vecka {weekPlan.week}, {weekPlan.year} - {formatDate(weekPlan.date, 'swedish')}
                        </h3>
                        <p className="text-gray-600">
                          {getDayName(weekPlan.date.getDay())} • <span className="text-linnea-500 font-semibold">{weekPlan.discipline}</span>
                        </p>
                      </div>
                      <div className="space-y-4 mt-4">
                        {weekPlan.session.map(block => (
                          <div key={block.block} className="border-l-4 border-linnea-500 pl-4 py-2">
                            <h4 className="text-lg font-semibold text-gray-800 mb-3">
                              Block {block.block} <span className="text-sm font-normal text-gray-500">(10-20min)</span>
                            </h4>
                            <ul className="list-disc list-inside space-y-2 ml-2">
                              {block.activities.map((activity, index) => {
                                const hasVideoForExercise = hasVideo(videoMap, activity)
                                return (
                                  <li 
                                    key={`${weekPlan.week}-${planIndex}-${block.block}-${index}`} 
                                    className={`text-gray-700 ${
                                      hasVideoForExercise 
                                        ? 'cursor-pointer hover:text-linnea-500 hover:underline transition-colors' 
                                        : ''
                                    }`}
                                    onClick={() => hasVideoForExercise && handleExerciseClick(activity)}
                                    title={hasVideoForExercise ? 'Klicka för att se video' : ''}
                                  >
                                    {activity}
                                    {hasVideoForExercise && (
                                      <span className="ml-2 text-linnea-500 text-sm">▶</span>
                                    )}
                                  </li>
                                )
                              })}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {activeView === 'editor' && (
            <ExerciseEditor
              data={exerciseData}
              loading={loading}
              onSave={(updatedData) => {
                setExerciseData(updatedData)
                setError(null)
              }}
            />
          )}

          {/* Loading Spinner */}
          {loading && (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin text-linnea-500 w-8 h-8 border-4 border-solid rounded-full border-t-transparent"></div>
              <p className="ml-4 text-gray-600 text-lg">Laddar övningar...</p>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-linnea-800 text-white mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* About Section */}
            <div>
              <h3 className="text-lg font-bold mb-4">IF Linnéa Friidrott</h3>
              <p className="text-gray-300 text-sm">
                En ideell friidrottsklubb för barn och ungdomar samt seniorer. 
                Mer än 100 år av friidrottstradition.
              </p>
            </div>

            {/* Contact Section */}
            <div>
              <h3 className="text-lg font-bold mb-4">Kontakt</h3>
              <ul className="space-y-2 text-sm text-gray-300">
                <li>info@iflinnea.se</li>
                <li>106 31 Stockholm</li>
                <li>Plusgiro: 364769-0</li>
                <li>Swish: 123-347 63 89</li>
              </ul>
            </div>

            {/* Social Media Section */}
            <div>
              <h3 className="text-lg font-bold mb-4">Följ oss</h3>
              <div className="flex space-x-4">
                <a href="https://www.facebook.com/IF-Linn%C3%A9a-Friidrott-120371154718619" 
                   target="_blank" 
                   rel="noopener noreferrer"
                   className="text-gray-300 hover:text-white transition-colors">
                  <span className="sr-only">Facebook</span>
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </a>
                <a href="#" 
                   className="text-gray-300 hover:text-white transition-colors">
                  <span className="sr-only">Instagram</span>
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </a>
              </div>
            </div>
          </div>

          {/* Copyright */}
          <div className="mt-8 pt-6 border-t border-gray-700 text-center text-sm text-gray-400">
            <p>&copy; {new Date().getFullYear()} IF Linnéa Friidrott. Alla rättigheter förbehållna.</p>
          </div>
        </div>
      </footer>

      {/* Video Modal */}
      <VideoModal
        isOpen={videoModal.isOpen}
        onClose={closeVideoModal}
        videoId={videoModal.videoId}
        exerciseName={videoModal.exerciseName}
      />
    </div>
  )
}

