const mongoose = require('mongoose')

module.exports = mongoose.model('Queue', new mongoose.Schema({
  manager: { type: mongoose.Schema.Types.ObjectId, ref: 'Manager', required: true, index: true },
  name: { type: String, required: true, trim: true },
  counter: { type: Number, default: 0 }, // last token number issued
  createdAt: { type: Date, default: Date.now },
}))