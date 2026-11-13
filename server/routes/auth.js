const router = require('express').Router()
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const Manager = require('../models/Manager')
const { wrap } = require('../utils/helpers')

const sign = (m) => jwt.sign({ id: m._id }, process.env.JWT_SECRET, { expiresIn: '7d' })

router.post('/register', wrap(async (req, res) => {
  const { email, password } = req.body
  if (!email || !password || password.length < 6)
    return res.status(400).json({ message: 'Email and a password of 6+ characters are required' })
  if (await Manager.findOne({ email: email.toLowerCase() }))
    return res.status(409).json({ message: 'Email already registered' })
  const manager = await Manager.create({ email, password: await bcrypt.hash(password, 10) })
  res.status(201).json({ token: sign(manager), email: manager.email })
}))

router.post('/login', wrap(async (req, res) => {
  const { email, password } = req.body
  const manager = email && (await Manager.findOne({ email: email.toLowerCase() }))
  if (!manager || !(await bcrypt.compare(password || '', manager.password)))
    return res.status(401).json({ message: 'Invalid email or password' })
  res.json({ token: sign(manager), email: manager.email })
}))

module.exports = router