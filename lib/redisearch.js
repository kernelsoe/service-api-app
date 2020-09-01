const Redis = require('ioredis')

// 🔥 $change 🔥
const redis = new Redis({
  host: '10.0.0.8',
  port: 6379,
  password: 'N1LBxK208xyp'
})

// const redis = new Redis()

module.exports = redis
