/**
 * Extract a YouTube video ID from a user provided value (ID or URL)
 * @param {string} value
 * @returns {string|null}
 */
export function extractYouTubeId(value) {
  if (!value) return null

  const trimmed = value.trim()

  // If the value already looks like a video ID (11 chars, alphanumeric with - or _), return it
  const idPattern = /^[a-zA-Z0-9_-]{11}$/
  if (idPattern.test(trimmed)) {
    return trimmed
  }

  try {
    const url = new URL(trimmed)
    if (url.hostname.includes('youtube.com')) {
      return url.searchParams.get('v') || null
    }
    if (url.hostname.includes('youtu.be')) {
      return url.pathname.replace('/', '') || null
    }
  } catch (error) {
    // Not a valid URL, fallthrough
  }

  return null
}

/**
 * Get video ID for an exercise using the provided video map
 * @param {Record<string, string>} videoMap
 * @param {string} exerciseName
 * @returns {string|null}
 */
export function getVideoId(videoMap, exerciseName) {
  if (!videoMap || typeof videoMap !== 'object') {
    return null
  }
  return videoMap[exerciseName] || null
}

/**
 * Check if an exercise has a video
 * @param {Record<string, string>} videoMap
 * @param {string} exerciseName
 * @returns {boolean}
 */
export function hasVideo(videoMap, exerciseName) {
  const videoId = getVideoId(videoMap, exerciseName)
  return Boolean(videoId)
}

