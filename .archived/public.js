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

router.get('/', function(req, res, next) {
  res.json({ title: 'Hi!' });
});
// ✅
router.post('/commit', async (req, res, next) => {
  // const timestamp = new Date().getTime()
  const towns = req.body.towns.split(',')
  const url = req.body.url
  const domain = await getHostName(url)

  const urlExists = await rdb.hget(url, 'url')

  console.log(towns, req.body.towns)
  console.log(url)
  console.log(domain)

  if (!urlExists) {
    const data = await scrape(url).catch(next)

    res.json({
      status: 'ok'
    })

    towns.forEach(town => {
      // index towns if nx
      rdb.hget(`towns`, town)
        .then(async (indexed) => {
          if (!indexed) {
            rdb.send_command('FT.ADD',
              ['tIdx', town, '1.0', 'REPLACE', 'PARTIAL',
                'FIELDS', 'name', town, 'about', '', 'is', ''
              ])
              .catch(err => console.log('err ', err))
            rdb.hset(`towns`, town, true)
          }
        })
      // zadd site to towns if not nx
      rdb.hget(`t:${town}:urls`, url)
        .then(async (exists) => {
          if (!exists) {
            rdb.xadd(`t:${town}:str`, '*', 'post', url)
              .then(result => console.log('✅ str ', `t:${town}:str`, result))
            rdb.hincrby(`t:${town}:urls`, url, 1)
          }
        })
    })
  
    // index url if nx
    rdb.hget(`links:${domain}`, url)
      .then(async (exists) => {
        if (!exists) {
          rdb.send_command('FT.ADD', ['rIdx', url, '1.0', 'REPLACE', 'PARTIAL',
            'FIELDS', 'url', url, 'title', data.title, 'content', data.content, 'towns', req.body.towns
          ]).catch(err => console.log('err ', err))
        }
      })
  
    // index domain if nx
    rdb.hget('sites', domain)
      .then(siteExists => {
        if (!siteExists) {
          rdb.hset('sites', domain, true)
            .catch(err => console.log('hset err @ /commit ', err))
          rdb.send_command('FT.ADD', ['doIdx', domain, '1.0', 'REPLACE', 'PARTIAL', 'FIELDS', 'url', domain, 'title', ''])
            .catch(err => console.log('FT.ADD doIdx err @ /commit ', err))
        }
      })
  } else {
    res.json({
      status: 'already exists!'
    })
  }
})

// RSS
router.get('/getRSS', async (req, res, next) => {
  const pages = []
  const items = await rdb.srandmember('postbox:rand', 10)
  if (items && items.length) {
    for (let i = 0; i < items.length; i++) {
      const page = JSON.parse(items[i])
      // console.log(page)
      pages.push(page)
    }
  
    res.json({
      pages
    })
  } else {
    res.json({
      pages: []
    })
  }
})
router.get('/getRssByChrono', async (req, res, next) => {
  const pages = []
  const items = await rdb.zrevrangebyscore('postbox:chro', '+inf', '-inf', 'LIMIT', req.query.offset, 10)
    .catch(err => {
      console.log(err)
      res.json({
        status: 'error'
      })
    })
    .catch(next)

  if (items && items.length) {
    for (let i = 0; i < items.length; i++) {
      const page = JSON.parse(items[i])
      // console.log(page)
      pages.push(page)
    }
  
    res.json({
      pages
    })
  } else {
    res.json({
      pages: []
    })
  }
})
router.get('/getRssByDomain', async (req, res, next) => {
  const domain = req.query.domain.includes('feedburner.com') ? 'feedburner' : req.query.domain
  const pages = []
  const items = await rdb.zrevrangebyscore(`readrss:${domain}`, '+inf', '-inf')
    .catch(err => {
      console.log(err)
      res.json({
        status: 'error'
      })
    })
    .catch(next)

  if (items && items.length) {
    for (let i = 0; i < items.length; i++) {
      const page = JSON.parse(items[i])
      // console.log(page)
      pages.push(page)
    }
  
    res.json({
      pages
    })
  } else {
    res.json({
      pages: []
    })
  }
})
router.post('/submitRSS', async (req, res, next) => {
  const url = req.body.url

  rdb.hget('rssurls', url)
    .then(exists => {
      if (!exists) {
        rdb.hset('rssurls', url, 1)
        rdb.hincrby('totalrssurls', 'count', 1)
      }
    })

  const data = await rss.parseRSS(url).catch(err => console.log('scraped data err : ', err)).catch(next)
  
  let domain
  const domainToTest = await getHostName(req.body.url).catch(err => console.log('domain err : ', err)).catch(next)
  if (domainToTest.includes('feedburner')) domain = 'feedburner'
  else domain = domainToTest

  for (let i = 0; i < data.items.length; i++) {
    let content
    let pubDate 

    const item = data.items[i]

    const link = item.link.startsWith('http') ? item.link : domain + item.link
    
    if (item.contentSnippet) content = item.contentSnippet.slice(0, 180)
    else if (item.description) content = item.description.slice(0, 180)

    if (item.pubDate) pubDate = item.pubDate
    else pubDate = 1000000000000

    const payload = {
      link,
      title: item.title,
      content,
      pubDate,
      rssurl: url,
      author: data.title
    }

    rdb.zadd('postbox:chro', new Date(pubDate).getTime(), JSON.stringify(payload))
    rdb.sadd('postbox:rand', JSON.stringify(payload))
    rdb.zadd(`readrss:${domain}`, new Date(pubDate).getTime(), JSON.stringify(payload))
    // rdb.hset(url, link, JSON.stringify(payload))
  }
  console.log(data.title, ' ✅ ', data.items.length)

  res.json({
    status: 'ok bro'
  })
})

module.exports = router;
