const router = require('express').Router()
const auth = require('../middleware/auth')
const Queue = require('../models/Queue')
const Token = require('../models/Token')
const { wrap, logEvent } = require('../utils/helpers')

router.use(auth)

// returns the token only if it belongs to one of my queues
async function getOwnedToken(id, managerId) {
  const token = await Token.findById(id)
  if (!token) return null
  const queue = await Queue.findOne({ _id: token.queue, manager: managerId })
  return queue ? token : null
}

// move up or down by swapping with the neighbouring waiting token
router.patch('/:id/move', wrap(async (req, res) => {
  const { direction } = req.body
  if (!['up', 'down'].includes(direction))
    return res.status(400).json({ message: 'direction must be "up" or "down"' })
  const token = await getOwnedToken(req.params.id, req.managerId)
  if (!token) return res.status(404).json({ message: 'Token not found' })
  if (token.status !== 'waiting')
    return res.status(400).json({ message: 'Only waiting tokens can be moved' })

  const up = direction === 'up'
  const neighbour = await Token.findOne({
    queue: token.queue,
    status: 'waiting',
    position: up ? { $lt: token.position } : { $gt: token.position },
  }).sort({ position: up ? -1 : 1 })
  if (!neighbour)
    return res.status(400).json({ message: up ? 'Already at the front' : 'Already at the back' })

  await Token.bulkWrite([
    { updateOne: { filter: { _id: token._id }, update: { position: neighbour.position } } },
    { updateOne: { filter: { _id: neighbour._id }, update: { position: token.position } } },
  ])
  res.json({ message: 'Moved' })
}))

// cancel a waiting token
router.patch('/:id/cancel', wrap(async (req, res) => {
  const token = await getOwnedToken(req.params.id, req.managerId)
  if (!token) return res.status(404).json({ message: 'Token not found' })
  // only succeeds if it is still waiting, so it can't be cancelled twice
  const cancelled = await Token.findOneAndUpdate(
    { _id: token._id, status: 'waiting' },
    { status: 'cancelled', cancelledAt: new Date() },
    { new: true }
  )
  if (!cancelled) return res.status(400).json({ message: 'Only waiting tokens can be cancelled' })
  await logEvent(token.queue, 'cancelled')
  res.json(cancelled)
}))

module.exports = router