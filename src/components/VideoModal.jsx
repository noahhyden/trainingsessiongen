import { useEffect } from 'react'

/**
 * VideoModal component for displaying YouTube videos in a popup
 */
export default function VideoModal({ isOpen, onClose, videoId, exerciseName }) {
  useEffect(() => {
    // Prevent body scroll when modal is open
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const youtubeEmbedUrl = videoId 
    ? `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`
    : null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h3 className="text-xl font-semibold text-gray-800">
            {exerciseName || 'Övning'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold transition-colors"
            aria-label="Stäng"
          >
            ×
          </button>
        </div>

        {/* Video Content */}
        <div className="p-4">
          {youtubeEmbedUrl ? (
            <div 
              className="w-full bg-gray-900 rounded-lg overflow-hidden" 
              style={{ 
                position: 'relative', 
                paddingBottom: '56.25%', 
                height: 0,
                minHeight: '315px'
              }}
            >
              <iframe
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  border: 'none'
                }}
                src={youtubeEmbedUrl}
                title={exerciseName || 'Övningsvideo'}
                allow="autoplay; encrypted-media; picture-in-picture; web-share"
                allowFullScreen
                frameBorder="0"
              />
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-600 text-lg mb-4">
                Ingen video tillgänglig för denna övning
              </p>
              <p className="text-gray-500 text-sm">
                {exerciseName}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

