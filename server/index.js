require('dotenv').config()
const express = require('express')
const cors = require('cors')
const path = require('path')
const connectDB = require('./config/db')

const app = express()
app.use(cors())
app.use(express.json())

app.use('/api/auth', require('./routes/auth'))
app.use('/api/queues', require('./routes/queues'))
app.use('/api/tokens', require('./routes/tokens'))

// production: serve the built React app
const dist = path.join(__dirname, '../client/dist')
app.use(express.static(dist))
app.use((req, res) => {
  if (req.path.startsWith('/api')) return res.status(404).json({ message: 'Not found' })
  res.sendFile(path.join(dist, 'index.html'))
})

// central error handler
app.use((err, req, res, next) => {
  if (err.name === 'CastError') return res.status(400).json({ message: 'Invalid id' })
  console.error(err)
  res.status(500).json({ message: 'Something went wrong' })
})

connectDB()
  .then(() => app.listen(process.env.PORT || 5000, () => console.log('Server running')))
  .catch((err) => { console.error(err); process.exit(1) })