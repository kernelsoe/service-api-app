var express = require('express');
var router = express.Router();
const Axios = require('axios')

const rss = require('../lib/rss')
const rdb = require('../lib/redisdb');
const { getHostName } = require('../lib/sh');
const { scrape } = require('../lib/scraper')

router.get('/search', async (req, res) => {
  const data = await rdb.send_command('FT.SEARCH', [
    'rIdx', req.query.q
  ]).catch(err => err).catch(next)

  // const { data } = await Axios.post('http://34.64.239.251:8080/sh/sendCMD', {
  //   cmd: 'FT.SEARCH',
  //   params: `rIdx%${req.query.q}`
  // })
  res.json({
    data
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

module.exports = router;
