const mongoose = require('mongoose')

const schema = new mongoose.Schema({
  queue: { type: mongoose.Schema.Types.ObjectId, ref: 'Queue', required: true },
  tokenNumber: { type: Number, required: true },
  personName: { type: String, required: true, trim: true },
  status: { type: String, enum: ['waiting', 'serving', 'served', 'cancelled'], default: 'waiting' },
  position: { type: Number, required: true }, // lower = closer to the front
  createdAt: { type: Date, default: Date.now },
  servedAt: Date,    // when assigned for service (wait time = servedAt - createdAt)
  completedAt: Date, // when service finished
  cancelledAt: Date,
})
schema.index({ queue: 1, status: 1, position: 1 })

module.exports = mongoose.model('Token', schema)