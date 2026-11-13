const dns = require('dns')
const mongoose = require('mongoose')

// some networks block SRV lookups; use public DNS for Node's resolver
dns.setServers(['8.8.8.8', '1.1.1.1'])

module.exports = async function connectDB() {
  await mongoose.connect(process.env.MONGO_URI)
  console.log('MongoDB connected')
}