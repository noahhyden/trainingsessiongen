import express from 'express'
import cors from 'cors'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = 3001

// Middleware
app.use(cors())
app.use(express.json())
app.use(express.static(path.join(__dirname, 'public')))

// Path to exercises.json
const exercisesPath = path.join(__dirname, 'public', 'data', 'exercises.json')

// GET endpoint to fetch exercises
app.get('/api/exercises', async (req, res) => {
  try {
    const data = await fs.readFile(exercisesPath, 'utf-8')
    const exercises = JSON.parse(data)
    res.json(exercises)
  } catch (error) {
    console.error('Error reading exercises:', error)
    res.status(500).json({ error: 'Failed to read exercises' })
  }
})

// POST endpoint to save exercises
app.post('/api/exercises', async (req, res) => {
  try {
    const exercises = req.body
    
    // Validate the structure
    if (!exercises || typeof exercises !== 'object') {
      return res.status(400).json({ error: 'Invalid exercises data' })
    }

    // Write to file
    await fs.writeFile(exercisesPath, JSON.stringify(exercises, null, 4), 'utf-8')
    
    res.json({ success: true, message: 'Exercises saved successfully' })
  } catch (error) {
    console.error('Error saving exercises:', error)
    res.status(500).json({ error: 'Failed to save exercises' })
  }
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})

