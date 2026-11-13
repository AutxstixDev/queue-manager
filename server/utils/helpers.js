const Queue = require('../models/Queue')
const Token = require('../models/Token')
const Event = require('../models/Event')

// forwards async errors to the central error handler
exports.wrap = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next)

// only returns the queue if it belongs to this manager
exports.getOwnedQueue = (queueId, managerId) =>
  Queue.findOne({ _id: queueId, manager: managerId })

// record the queue length after an action (feeds the trend chart)
exports.logEvent = async (queueId, type) => {
  const length = await Token.countDocuments({ queue: queueId, status: 'waiting' })
  await Event.create({ queue: queueId, type, length })
}