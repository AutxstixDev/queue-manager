    const router = require('express').Router()
const auth = require('../middleware/auth')
const Queue = require('../models/Queue')
const Token = require('../models/Token')
const Event = require('../models/Event')
const { wrap, getOwnedQueue, logEvent } = require('../utils/helpers')

router.use(auth)

// list my queues with how many are waiting
router.get('/', wrap(async (req, res) => {
  const queues = await Queue.find({ manager: req.managerId }).sort({ createdAt: -1 }).lean()
  const withCounts = await Promise.all(queues.map(async (q) => ({
    ...q,
    waiting: await Token.countDocuments({ queue: q._id, status: 'waiting' }),
  })))
  res.json(withCounts)
}))

// create a queue
router.post('/', wrap(async (req, res) => {
  const name = (req.body.name || '').trim()
  if (!name) return res.status(400).json({ message: 'Queue name is required' })
  const queue = await Queue.create({ manager: req.managerId, name })
  res.status(201).json(queue)
}))

// queue details: waiting list (in order) + who is being served now
router.get('/:id/tokens', wrap(async (req, res) => {
  const queue = await getOwnedQueue(req.params.id, req.managerId)
  if (!queue) return res.status(404).json({ message: 'Queue not found' })
  const [waiting, serving] = await Promise.all([
    Token.find({ queue: queue._id, status: 'waiting' }).sort({ position: 1 }),
    Token.findOne({ queue: queue._id, status: 'serving' }),
  ])
  res.json({ queue, waiting, serving })
}))

// add a person -> creates a token
router.post('/:id/tokens', wrap(async (req, res) => {
  const personName = (req.body.personName || '').trim()
  if (!personName) return res.status(400).json({ message: 'Name is required' })
  // atomic increment so two requests never get the same number
  const queue = await Queue.findOneAndUpdate(
    { _id: req.params.id, manager: req.managerId },
    { $inc: { counter: 1 } },
    { new: true }
  )
  if (!queue) return res.status(404).json({ message: 'Queue not found' })
  const token = await Token.create({
    queue: queue._id,
    tokenNumber: queue.counter,
    position: queue.counter, // new tokens go to the back
    personName,
  })
  await logEvent(queue._id, 'added')
  res.status(201).json(token)
}))

// assign the top token for service
router.post('/:id/serve-next', wrap(async (req, res) => {
  const queue = await getOwnedQueue(req.params.id, req.managerId)
  if (!queue) return res.status(404).json({ message: 'Queue not found' })
  const now = new Date()
  // atomic: grabs the front waiting token and marks it serving in one step
  const token = await Token.findOneAndUpdate(
    { queue: queue._id, status: 'waiting' },
    { status: 'serving', servedAt: now },
    { sort: { position: 1 }, new: true }
  )
  if (!token) return res.status(400).json({ message: 'No one is waiting in this queue' })
  // whoever was being served before is now finished
  await Token.updateMany(
    { queue: queue._id, status: 'serving', _id: { $ne: token._id } },
    { status: 'served', completedAt: now }
  )
  await logEvent(queue._id, 'served')
  res.json(token)
}))

// analytics for the dashboard
router.get('/:id/analytics', wrap(async (req, res) => {
  const queue = await getOwnedQueue(req.params.id, req.managerId)
  if (!queue) return res.status(404).json({ message: 'Queue not found' })
  const qid = queue._id
  const tz = req.query.tz || 'UTC'
  const waitMs = { $subtract: ['$servedAt', '$createdAt'] }
  const toMin = (ms) => Math.round(((ms || 0) / 60000) * 10) / 10

  const [overall, statusCounts, daily, hourly, events] = await Promise.all([
    Token.aggregate([
      { $match: { queue: qid, servedAt: { $ne: null } } },
      { $group: { _id: null, avg: { $avg: waitMs }, max: { $max: waitMs } } },
    ]),
    Token.aggregate([{ $match: { queue: qid } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    Token.aggregate([
      { $match: { queue: qid, servedAt: { $ne: null } } },
      { $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: tz } },
          avg: { $avg: waitMs }, tokens: { $sum: 1 },
      } },
      { $sort: { _id: 1 } },
    ]),
    Token.aggregate([
      { $match: { queue: qid } },
      { $group: { _id: { $hour: { date: '$createdAt', timezone: tz } }, tokens: { $sum: 1 } } },
    ]),
    Event.find({ queue: qid }).sort({ createdAt: -1 }).limit(200).lean(),
  ])

  const counts = Object.fromEntries(statusCounts.map((s) => [s._id, s.count]))
  const hourMap = Object.fromEntries(hourly.map((h) => [h._id, h.tokens]))

  res.json({
    summary: {
      avgWaitMin: toMin(overall[0]?.avg),
      maxWaitMin: toMin(overall[0]?.max),
      waiting: counts.waiting || 0,
      serving: counts.serving || 0,
      served: (counts.served || 0) + (counts.serving || 0),
      cancelled: counts.cancelled || 0,
      total: statusCounts.reduce((sum, s) => sum + s.count, 0),
    },
    dailyWait: daily.map((d) => ({ date: d._id, avgWaitMin: toMin(d.avg), tokens: d.tokens })),
    peakHours: Array.from({ length: 24 }, (_, h) => ({ hour: h, tokens: hourMap[h] || 0 })),
    lengthTrend: events.reverse().map((e) => ({ time: e.createdAt, length: e.length })),
  })
}))

module.exports = router