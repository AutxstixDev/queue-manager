const mongoose = require('mongoose')

module.exports = mongoose.model('Event', new mongoose.Schema({
  queue: { type: mongoose.Schema.Types.ObjectId, ref: 'Queue', required: true, index: true },
  type: { type: String, enum: ['added', 'served', 'cancelled', 'snapshot'], required: true },
  length: { type: Number, required: true }, // waiting tokens after the action
  createdAt: { type: Date, default: Date.now },
}))