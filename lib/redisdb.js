const Redis = require('ioredis')

// 🔥 $change 🔥
// const redis = new Redis({
//   host: '10.0.0.6',
//   port: 6379,
//   password: '0Y4eQBMCvOzh'
// })

const redis = new Redis({
  port: 6900
})

module.exports = redis
