var express = require('express');
var router = express.Router();
const Axios = require('axios')

const rss = require('../lib/rss')
const rdb = require('../lib/redisdb');
const { getHostName } = require('../lib/sh');
const { scrape } = require('../lib/scraper')

router.get('/search', async (req, res, next) => {
  const count = req.query.count > 300 ? 300 : req.query.count
  const data = await rdb.send_command('FT.SEARCH', [
    'rIdx', req.query.q, 'SUMMARIZE', 'FIELDS', 1, 'content', 'FRAGS', 1, 'HIGHLIGHT', 'FIELDS', 1, 'content', 'LIMIT', `${req.query.offset}`, `${count}`
  ]).catch(err => err).catch(next)

  // %FIELDS%0%content%FRAGS%3LEN%9
  // 🔥 CHANGE 🔥
  // const { data } = await Axios.post('http://34.64.209.0:8080/sh/sendCMD', {
  //   cmd: 'FT.SEARCH',
  //   params: `rIdx%${req.query.q}%SUMMARIZE%FIELDS%1%content%FRAGS%1%HIGHLIGHT%FIELDS%1%content%LIMIT%${req.query.offset}%${count}`
  // })

  console.log(data)
  res.json({
    data: data
  })
})

router.post('/submit', async (req, res, next) => {
  console.log(req.body)
  
  res.json({
    status: 'ok'
  })

  rdb.zadd('submissions', req.body.ts, req.body.link)
})

router.get('/', function(req, res, next) {
  res.json({ title: 'Hi!' });
});
// ✅
// router.post('/commit', async (req, res, next) => {
//   // const timestamp = new Date().getTime()
//   const towns = req.body.towns.split(',')
//   const url = req.body.url
//   const domain = await getHostName(url)

//   const urlExists = await rdb.hget(url, 'url')

//   console.log(towns, req.body.towns)
//   console.log(url)
//   console.log(domain)

//   if (!urlExists) {
//     const data = await scrape(url).catch(next)

//     res.json({
//       status: 'ok'
//     })

//     towns.forEach(town => {
//       // index towns if nx
//       rdb.hget(`towns`, town)
//         .then(async (indexed) => {
//           if (!indexed) {
//             rdb.send_command('FT.ADD',
//               ['tIdx', town, '1.0', 'REPLACE', 'PARTIAL',
//                 'FIELDS', 'name', town, 'about', '', 'is', ''
//               ])
//               .catch(err => console.log('err ', err))
//             rdb.hset(`towns`, town, true)
//           }
//         })
//       // zadd site to towns if not nx
//       rdb.hget(`t:${town}:urls`, url)
//         .then(async (exists) => {
//           if (!exists) {
//             rdb.xadd(`t:${town}:str`, '*', 'post', url)
//               .then(result => console.log('✅ str ', `t:${town}:str`, result))
//             rdb.hincrby(`t:${town}:urls`, url, 1)
//           }
//         })
//     })
  
//     // index url if nx
//     rdb.hget(`links:${domain}`, url)
//       .then(async (exists) => {
//         if (!exists) {
//           rdb.send_command('FT.ADD', ['rIdx', url, '1.0', 'REPLACE', 'PARTIAL',
//             'FIELDS', 'url', url, 'title', data.title, 'content', data.content, 'towns', req.body.towns
//           ]).catch(err => console.log('err ', err))
//         }
//       })
  
//     // index domain if nx
//     rdb.hget('sites', domain)
//       .then(siteExists => {
//         if (!siteExists) {
//           rdb.hset('sites', domain, true)
//             .catch(err => console.log('hset err @ /commit ', err))
//           rdb.send_command('FT.ADD', ['doIdx', domain, '1.0', 'REPLACE', 'PARTIAL', 'FIELDS', 'url', domain, 'title', ''])
//             .catch(err => console.log('FT.ADD doIdx err @ /commit ', err))
//         }
//       })
//   } else {
//     res.json({
//       status: 'already exists!'
//     })
//   }
// })

// RSS
router.post('/submitRSS', async (req, res, next) => {
  let domain
  const data = await rss.parseRSS(req.body.url).catch(err => console.log('scraped data err : ', err)).catch(next)
  const domainToTest = await getHostName(req.body.url).catch(err => console.log('domain err : ', err)).catch(next)

  if (domainToTest.includes('feedburner')) domain = 'feedburner'
  else domain = domainToTest

  console.log('total ', data.items.length)

  res.json({
    status: 'ok'
  })

  // data.items.forEach(async (item) => {
  for (let i = 0; i < data.items.length; i++) {
    const original = data.items[i]

    let item = {
      title: original.title,
      pubDate: original.pubDate ? original.pubDate : original.updated,
      author: data.title,
      rss: req.body.url,
      link: original.link.startsWith('http') ? original.link : domain + original.link,
      content: original.contentSnippet ? original.contentSnippet.slice(0, 120) + ' ...' : original.description.slice(0, 120) + ' ...'
    }
    
    if (item.pubDate === null || undefined) item.pubDate = 1000000000000

    // console.log(item.title, '@ ' ,item.author)
    const linkExists = await rdb.hget(`postbox:links`, original.link).catch(err => console.log('hget rss:domain err : ', err))

    if (!linkExists) {
      const data = JSON.stringify(item)
      const ts = new Date(item.pubDate).getTime()

      // console.log(item)
      rdb.hincrby(`postbox:links`, item.link, 1)
      // for global
      if (i < 10) {
        rdb.sadd('postbox:rand', data)
      }
      rdb.zadd('postbox:chro', ts, data)
      // for domain
      rdb.zadd(`postbox:${domain}`, ts, data)
    }
  }
})
router.get('/postboxrand', async (req, res, next) => {
  const randomPages = await rdb.srandmember('postbox:rand', 10)
  res.json({
    rss: randomPages
  })
})

router.get('/getLinksCount', async (req, res, next) => {
  const links = await rdb.hget('links', 'count')
  res.json({
    links
  })
})

module.exports = router;
