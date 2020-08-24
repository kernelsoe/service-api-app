const Redis = require('ioredis')

// 🔥 $change 🔥
const redis = new Redis({
  host: '10.0.0.7',
  port: 6379,
  password: 'BUiIOCTTfaL6'
})

// const redis = new Redis()

module.exports = redis
