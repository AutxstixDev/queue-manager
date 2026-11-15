require('dotenv').config()
const dns = require('dns')
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const Manager = require('./models/Manager')
const Queue = require('./models/Queue')
const Token = require('./models/Token')
const Event = require('./models/Event')

// some networks block SRV lookups; use public DNS for Node's resolver
dns.setServers(['8.8.8.8', '1.1.1.1'])

const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a
const MIN = 60000
const NAMES = ['Aarav', 'Diya', 'Rohan', 'Meera', 'Kabir', 'Ananya', 'Vivaan', 'Isha', 'Arjun', 'Sara', 'Neha', 'Dev']

async function run() {
  await mongoose.connect(process.env.MONGO_URI)
  await Promise.all([Manager.deleteMany(), Queue.deleteMany(), Token.deleteMany(), Event.deleteMany()])

  const manager = await Manager.create({
    email: 'demo@example.com',
    password: await bcrypt.hash('demo1234', 10),
  })

  for (const name of ['Front Desk', 'Billing Counter']) {
    const queue = await Queue.create({ manager: manager._id, name })
    const tokens = []
    let n = 0

    // 7 days of history, 9am-5pm arrivals
    for (let d = 7; d >= 1; d--) {
      for (let h = 9; h <= 17; h++) {
        const busy = h >= 11 && h <= 13 ? 3 : 0 // lunch rush
        for (let i = 0, arrivals = rand(2, 5) + busy; i < arrivals; i++) {
          const created = new Date()
          created.setDate(created.getDate() - d)
          created.setHours(h, rand(0, 59), rand(0, 59), 0)
          n++
          const t = { queue: queue._id, tokenNumber: n, position: n,
            personName: NAMES[rand(0, NAMES.length - 1)], createdAt: created }
          if (Math.random() < 0.1) {
            t.status = 'cancelled'
            t.cancelledAt = new Date(created.getTime() + rand(1, 12) * MIN)
          } else {
            const wait = (busy ? rand(10, 35) : rand(2, 15)) * MIN
            t.status = 'served'
            t.servedAt = new Date(created.getTime() + wait)
            t.completedAt = new Date(t.servedAt.getTime() + rand(3, 10) * MIN)
          }
          tokens.push(t)
        }
      }
    }

    // a few people waiting right now so the queue page isn't empty
    for (let i = 0; i < 4; i++) {
      n++
      tokens.push({ queue: queue._id, tokenNumber: n, position: n,
        personName: NAMES[rand(0, NAMES.length - 1)], status: 'waiting',
        createdAt: new Date(Date.now() - (4 - i) * 3 * MIN) })
    }
    await Token.insertMany(tokens)
    queue.counter = n
    await queue.save()

    // hourly snapshots of queue length for the trend chart
    const events = []
    for (let d = 7; d >= 1; d--) {
      for (let h = 9; h <= 18; h++) {
        const at = new Date()
        at.setDate(at.getDate() - d)
        at.setHours(h, 0, 0, 0)
        const length = tokens.filter((t) =>
          t.createdAt <= at &&
          (t.servedAt ? t.servedAt > at : true) &&
          (t.cancelledAt ? t.cancelledAt > at : true) &&
          t.status !== 'waiting'
        ).length
        events.push({ queue: queue._id, type: 'snapshot', length, createdAt: at })
      }
    }
    events.push({ queue: queue._id, type: 'snapshot', length: 4, createdAt: new Date() })
    await Event.insertMany(events)
  }

  console.log('Seeded. Login: demo@example.com / demo1234')
  await mongoose.disconnect()
}

run().catch((err) => { console.error(err); process.exit(1) })