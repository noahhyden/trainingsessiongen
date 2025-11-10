import { useEffect, useMemo, useState } from 'react'
import { DISCIPLINES, AGE_GROUPS } from '../utils/constants'
import { extractYouTubeId } from '../utils/videoMapping'

const DEFAULT_STATUS = { type: null, message: null }
const DEFAULT_DIALOG = { isOpen: false, blockNumber: null, exerciseIndex: null, exerciseName: null }

function cloneData(data) {
  if (!data) return data
  return JSON.parse(JSON.stringify(data))
}

function formatVideoInput(videoId) {
  if (!videoId) return ''
  return `https://youtu.be/${videoId}`
}

function createUniqueExerciseName(existingNames, baseName = 'Ny övning') {
  const existingSet = new Set(existingNames)
  if (!existingSet.has(baseName)) {
    return baseName
  }

  let counter = 2
  while (existingSet.has(`${baseName} ${counter}`)) {
    counter += 1
  }
  return `${baseName} ${counter}`
}

export default function ExerciseEditor({ data, loading, onSave }) {
  const [selectedDiscipline, setSelectedDiscipline] = useState(DISCIPLINES[0])
  const [selectedAgeGroup, setSelectedAgeGroup] = useState(AGE_GROUPS[0])
  const [draftData, setDraftData] = useState(null)
  const [videoInputs, setVideoInputs] = useState({})
  const [status, setStatus] = useState(DEFAULT_STATUS)
  const [saving, setSaving] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState(DEFAULT_DIALOG)

  useEffect(() => {
    if (data) {
      setDraftData(cloneData(data))
      const inputs = Object.entries(data.videos || {}).reduce((acc, [name, id]) => {
        acc[name] = formatVideoInput(id)
        return acc
      }, {})
      setVideoInputs(inputs)
    }
  }, [data])

  useEffect(() => {
    if (!DISCIPLINES.includes(selectedDiscipline)) {
      setSelectedDiscipline(DISCIPLINES[0])
    }
  }, [selectedDiscipline])

  useEffect(() => {
    if (!AGE_GROUPS.includes(selectedAgeGroup)) {
      setSelectedAgeGroup(AGE_GROUPS[0])
    }
  }, [selectedAgeGroup])

  const blocks = draftData?.[selectedDiscipline]?.[selectedAgeGroup] || {}
  const blockNumbers = useMemo(
    () => Object.keys(blocks).sort((a, b) => Number(a) - Number(b)),
    [blocks]
  )

  const hasChanges = useMemo(() => {
    if (!data || !draftData) return false
    return JSON.stringify(draftData) !== JSON.stringify(data)
  }, [data, draftData])

  function handleExerciseNameChange(blockNumber, exerciseIndex, newName) {
    let previousName = null
    setDraftData(prev => {
      if (!prev) return prev
      const updated = cloneData(prev)
      const session = updated?.[selectedDiscipline]?.[selectedAgeGroup]?.[blockNumber]
      if (!session) return prev

      if (!updated.videos) {
        updated.videos = {}
      }

      previousName = session[exerciseIndex]
      session[exerciseIndex] = newName

      if (previousName && previousName !== newName) {
        const existingVideoId = updated.videos[previousName]
        if (existingVideoId !== undefined) {
          delete updated.videos[previousName]
          if (newName) {
            updated.videos[newName] = existingVideoId
          }
        }
      }

      return updated
    })

    if (previousName && previousName !== newName) {
      setVideoInputs(prevInputs => {
        const updatedInputs = { ...prevInputs }
        const existing = updatedInputs[previousName]
        delete updatedInputs[previousName]
        if (newName) {
          updatedInputs[newName] = existing ?? ''
        }
        return updatedInputs
      })
    }
  }

  function handleVideoInputChange(exerciseName, value) {
    setVideoInputs(prevInputs => ({
      ...prevInputs,
      [exerciseName]: value
    }))

    setDraftData(prev => {
      if (!prev) return prev
      const updated = cloneData(prev)
      if (!updated.videos) {
        updated.videos = {}
      }

      const extractedId = extractYouTubeId(value)

      if (!exerciseName) {
        return updated
      }

      if (extractedId) {
        updated.videos[exerciseName] = extractedId
      } else {
        delete updated.videos[exerciseName]
      }

      return updated
    })
  }

  function handleAddExercise(blockNumber) {
    if (!draftData) return

    let newExerciseName = null

    setDraftData(prev => {
      if (!prev) return prev
      const updated = cloneData(prev)

      if (!updated[selectedDiscipline]) {
        updated[selectedDiscipline] = {}
      }
      if (!updated[selectedDiscipline][selectedAgeGroup]) {
        updated[selectedDiscipline][selectedAgeGroup] = {}
      }
      if (!updated[selectedDiscipline][selectedAgeGroup][blockNumber]) {
        updated[selectedDiscipline][selectedAgeGroup][blockNumber] = []
      }
      if (!updated.videos) {
        updated.videos = {}
      }

      const blockExercises = updated[selectedDiscipline][selectedAgeGroup][blockNumber]
      newExerciseName = createUniqueExerciseName(blockExercises)
      blockExercises.push(newExerciseName)

      return updated
    })

    if (newExerciseName) {
      setVideoInputs(prevInputs => ({
        ...prevInputs,
        [newExerciseName]: ''
      }))
    }
  }

  function handlePromptDelete(blockNumber, exerciseIndex, exerciseName) {
    setDeleteDialog({
      isOpen: true,
      blockNumber,
      exerciseIndex,
      exerciseName
    })
  }

  function closeDeleteDialog() {
    setDeleteDialog(DEFAULT_DIALOG)
  }

  function confirmDelete() {
    if (!deleteDialog.isOpen || deleteDialog.blockNumber === null || deleteDialog.exerciseIndex === null) {
      return
    }

    const { blockNumber, exerciseIndex, exerciseName } = deleteDialog

    setDraftData(prev => {
      if (!prev) return prev
      const updated = cloneData(prev)
      const blockExercises = updated?.[selectedDiscipline]?.[selectedAgeGroup]?.[blockNumber]
      if (!blockExercises) return prev

      blockExercises.splice(exerciseIndex, 1)

      if (updated.videos) {
        delete updated.videos[exerciseName]
      }

      return updated
    })

    setVideoInputs(prevInputs => {
      const updatedInputs = { ...prevInputs }
      delete updatedInputs[exerciseName]
      return updatedInputs
    })

    closeDeleteDialog()
  }

  async function handleSave() {
    if (!draftData || saving) return

    setSaving(true)
    setStatus(DEFAULT_STATUS)

    try {
      const response = await fetch('/api/exercises', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(draftData, null, 2)
      })

      if (!response.ok) {
        throw new Error('Misslyckades med att spara övningar')
      }

      setStatus({ type: 'success', message: 'Övningarna sparades!' })
      onSave?.(cloneData(draftData))
    } catch (err) {
      console.error('Error saving exercises:', err)
      setStatus({ type: 'error', message: 'Kunde inte spara övningar. Försök igen.' })
    } finally {
      setSaving(false)
    }
  }

  function renderVideoStatus(exerciseName) {
    const rawValue = videoInputs[exerciseName] ?? ''
    if (!rawValue) {
      return <span className="text-sm text-gray-400">Ingen video länkad</span>
    }

    const extractedId = extractYouTubeId(rawValue)
    if (!extractedId) {
      return <span className="text-sm text-red-500">Ogiltig YouTube-länk eller ID</span>
    }

    return (
      <a
        href={`https://youtu.be/${extractedId}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-linnea-500 hover:underline"
      >
        Förhandsgranska video
      </a>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div className="space-y-4">
            <div className="flex flex-col space-y-2">
              <label className="font-semibold text-gray-800 text-lg">Gren</label>
              <select
                value={selectedDiscipline}
                onChange={(event) => {
                  setSelectedDiscipline(event.target.value)
                }}
                className="w-full lg:w-64 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-linnea-500 focus:border-linnea-500 transition-colors"
              >
                {DISCIPLINES.map(discipline => (
                  <option key={discipline} value={discipline}>
                    {discipline}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col space-y-2">
              <label className="font-semibold text-gray-800 text-lg">Åldersgrupp</label>
              <select
                value={selectedAgeGroup}
                onChange={(event) => {
                  setSelectedAgeGroup(event.target.value)
                }}
                className="w-full lg:w-64 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-linnea-500 focus:border-linnea-500 transition-colors"
              >
                {AGE_GROUPS.map(group => (
                  <option key={group} value={group}>
                    {group}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col items-start lg:items-end space-y-3">
            {status.type && (
              <div
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  status.type === 'success'
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}
              >
                {status.message}
              </div>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={!hasChanges || saving || !draftData}
              className="inline-flex items-center justify-center px-6 py-3 bg-linnea-500 text-white rounded-lg font-semibold shadow-sm hover:bg-linnea-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-linnea-400 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all"
            >
              {saving ? 'Sparar...' : 'Spara ändringar'}
            </button>
            <span className="text-xs text-gray-400">
              Ändringar sparas till `public/data/exercises.json`
            </span>
          </div>
        </div>
      </div>

      {loading && !draftData ? (
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center text-gray-500">
          Laddar övningar för redigering...
        </div>
      ) : (
        <div className="space-y-5">
          {blockNumbers.length === 0 ? (
            <div className="bg-white border border-dashed border-gray-300 rounded-lg p-8 text-center text-gray-500">
              Inga övningar hittades för vald gren och åldersgrupp.
            </div>
          ) : (
            blockNumbers.map(blockNumber => {
              const exercises = blocks[blockNumber] || []
              return (
                <div key={blockNumber} className="bg-white border border-gray-200 rounded-lg shadow-sm">
                  <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Block {blockNumber}</h3>
                      <p className="text-sm text-gray-500">Uppdatera övningsnamn och länka YouTube-videor</p>
                    </div>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {exercises.map((exerciseName, index) => {
                      const videoValue =
                        videoInputs[exerciseName] ??
                        formatVideoInput(draftData?.videos?.[exerciseName])
                      return (
                        <div key={`${blockNumber}-${index}`} className="px-6 py-4">
                          <div className="flex flex-col lg:flex-row lg:items-start lg:space-x-6 space-y-4 lg:space-y-0">
                            <div className="flex-1">
                              <label className="block text-sm font-semibold text-gray-700 mb-1">
                                Övning {index + 1}
                              </label>
                              <input
                                type="text"
                                value={exerciseName}
                                onChange={(event) => handleExerciseNameChange(blockNumber, index, event.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-linnea-500 focus:border-linnea-500 transition-colors"
                              />
                            </div>
                            <div className="flex-1">
                              <label className="block text-sm font-semibold text-gray-700 mb-1">
                                YouTube video
                              </label>
                              <div className="flex items-center space-x-3">
                                <input
                                  type="text"
                                  value={videoValue}
                                  placeholder="Klistra in YouTube-länk eller ID"
                                  onChange={(event) => handleVideoInputChange(exerciseName, event.target.value)}
                                  className="flex-1 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-linnea-500 focus:border-linnea-500 transition-colors"
                                />
                                <button
                                  type="button"
                                  onClick={() => handlePromptDelete(blockNumber, index, exerciseName)}
                                  className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-red-100 text-red-600 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-300 transition-all"
                                  aria-label={`Ta bort ${exerciseName}`}
                                >
                                  <span className="text-xl font-bold leading-none">–</span>
                                </button>
                              </div>
                              <div className="mt-2">
                                {renderVideoStatus(exerciseName)}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <div className="px-6 py-4 bg-gray-50 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleAddExercise(blockNumber)}
                      className="inline-flex items-center px-4 py-2 text-sm font-semibold text-white bg-linnea-500 rounded-md shadow-sm hover:bg-linnea-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-linnea-400 transition-all"
                    >
                      Lägg till övning
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {deleteDialog.isOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black bg-opacity-40 px-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Ta bort övning</h3>
            <p className="text-sm text-gray-600">
              Är du säker på att du vill ta bort{' '}
              <span className="font-semibold text-gray-800">{deleteDialog.exerciseName}</span>? Åtgärden går inte att ångra.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={closeDeleteDialog}
                className="px-4 py-2 rounded-md text-sm font-semibold border border-gray-300 text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300 transition-all"
              >
                Avbryt
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-4 py-2 rounded-md text-sm font-semibold text-white bg-red-500 hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-400 transition-all"
              >
                Ta bort
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

