const Redis = require('ioredis')

// 🔥 $change 🔥
// const redis = new Redis({
//   host: '10.128.0.4',
//   port: 6379
// })

const redis = new Redis()

module.exports = redis