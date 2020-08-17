var express = require('express');
var router = express.Router();

const { getHostName, sleep } = require('../lib/sh');
// const { scrape } = require('../lib/scraper')
const { scrape } = require('../lib/myscraper')
const { crawl } = require('../lib/mycrawler')
const rdb = require('../lib/redisdb')
const redisearch = require('../lib/redisearch')
const Axios = require('axios')

router.get('/', function(req, res, next) {
  res.json({ title: 'Hi! from server' });
});
router.post('/register', async (req, res, next) => {
  res.json({
    status: 'ok'
  })
  // console.log(req.body.payloads)
  const host = await getHostName(req.body.root)

  rdb.hset(`site:${host}`, req.body.root, req.body.payloads)
  rdb.hset(`site:${host}`, 'pubDateTag', req.body.pubDateTag)
  
  rdb.sadd('allsites', req.body.root)
})
router.post('/crawl', async (req, res, next) => {
  res.json({
    status: 'ok'
  })
  const host = await getHostName(req.body.site)
  const payloads = await JSON.parse(await rdb.hget(`site:${host}`, req.body.site))
  
  for (let i = 0; i < payloads.length; i++) {
    const item = payloads[i]
    const found = await crawl(item.url, item.q, req.body.site)

    console.log('found ✅ ', found)

    if (item.pg_url && item.pg_count) {
      for (let j = 1; j < item.pg_count; j++) {
        const nextpage = item.pg_url.replace('$replace', (j + 1))
        console.log('need to crawl next page!!!', nextpage)
        await crawl(nextpage, item.q, req.body.site)
      }
    }
  }
})
router.post('/index', async (req, res, next) => {
  res.json({
    status: 'ok'
  })
  const host = await getHostName(req.body.site)
  const links = await rdb.hgetall(`links:${host}`)
  const tag = await rdb.hget(`site:${host}`, 'pubDateTag')// await JSON.parse()

  for (let [url] of Object.entries(links)) {
    console.log('✅ ', url)
    await sleep(900)
    const data = await scrape(url, tag)

    redisearch.send_command('FT.ADD', ['rIdx', url, '1.0', 'REPLACE', 'PARTIAL',
      'FIELDS', 'url', url, 'title', data.title, 'content', data.content, 'pubDate', data.pubDate
    ]).catch(err => console.log('err ', err))
  }
})

module.exports = router;
