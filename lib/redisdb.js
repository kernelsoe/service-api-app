const Redis = require('ioredis')

// 🔥 $change 🔥
const redis = new Redis({
  host: '104.42.197.61',
  port: 6379,
  password: '0Y4eQBMCvOzh'
})

// const redis = new Redis()

module.exports = redis
