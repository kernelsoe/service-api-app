const { fork } = require('child_process')

const Axios = require('axios')
const express = require('express');
const router = express.Router();

const rss = require('../lib/rss')
const rdb = require('../lib/redisdb')
const redisearch = require('../lib/redisearch')
const { getHostName, sleep } = require('../lib/sh')

const { startCrawl } = require('../lib/crawler')
const { scrape } = require('../lib/scraper');
const pageScraper = require('../lib/pageScraper')

router.get('/ping', async (req, res) => {
  const reply = await rdb.send_command('PING')
  res.json({
    reply
  })
})

router.post('/crawlSite', async (req, res, next) => {
  // const domain = await getHostName(req.body.url)
  // const siteDirTags = req.body.siteDirTags

  res.json({
    status: 'Crawl Engine Started.'
  });

  await startCrawl(req.body.url, req.body.rootUrl, req.body.counter)
    .catch(err => {
      console.log('🤷‍♂️ ERR: startCrawl ', err)
    })
    .catch(next)
});

router.post('/sendCMD', async (req, res, next) => {
  const params = req.body.params.split('%')

  console.log(params)

  const data = await rdb.send_command(req.body.cmd, params)
    .catch(err => console.log('🔥 ', err))
    .catch(next)
  res.json({
    data
  })
});

router.post('/cleanSiteLinks', async (req, res, next) => {
  const domain = req.body.site.startsWith('http') ? await getHostName(req.body.site) : req.body.site
  res.json({
    status: 'cleaning ...'
  })

  const cleanProcess = fork('./lib/siteLinksCleaner.js', [domain, null])

  cleanProcess.on('message', function () {
    // 2. Index new site Links
    Axios.post(`${process.env.host}/sh/indexSite`, {
      site: domain
    })
    // if (req.body.towns) {
    // }
  })
})

router.post('/indexSite', async (req, res, next) => {
  const domain = await getHostName(req.body.site)
  try {
    // call indexDir if not exists
    // req.body.siteTags
    console.log('✅ /indexSite ', req.body.site)

    rdb.hgetall(`links:${domain}`)
      .then(async (links) => {
        console.log('✅ links ', links)
        res.json({
          status: 'indexing site has started!'
        });

        for (const [link, value] of Object.entries(links)) {
          // index each doc
          await sleep(1000)

          // scrape data on each link
          const data = await pageScraper.scrape(link).catch(next)

          // data.url = link
          // data.tags = req.body.siteTags

          console.log(data.title)
          redisearch.send_command('FT.ADD', ['rIdx', link, '1.0', 'REPLACE', 'PARTIAL',
            'FIELDS', 'url', link, 'title', data.title, 'content', data.content, 'towns', ''
          ]).catch(err => console.log('err ', err))
          .catch(next)

          // sh.ftAddIdx(req.body.site, data)
        }
        // incr scraped count

        rdb.hincrby(`site:${req.body.site}`, 'scrapedCount', 1)

        // rdb.hincrby(`/${dirName}`, 'indexed', 1).catch(next)
      }).catch(next)
  } catch(err) {
    console.log('indexURLdoc Err: ', err)
  }
})

router.post('/registerSite', async (req, res, next) => {
  const domain = await getHostName(req.body.url)

  const exists = await rdb.hget('allSites', req.body.url)

  if (!exists) {
    rdb.hset(`site:${domain}`, 'url', req.body.url)
    rdb.hset(`site:${domain}`, 'towns', req.body.towns)

    rdb.hset('allSites', req.body.url, 1)

    // for random access
    const data = await pageScraper.scrape(link).catch(next)
    const payload = {
      url: req.body.url,
      title: data.title
    }
    rdb.sadd('sites', JSON.stringify(payload))

    res.json({
      status: 'ok'
    })
  } else {
    res.json({
      status: 'already registered'
    })
  }
})

// RSS
router.post('/submitRSS', async (req, res, next) => {
  let domain
  const data = await rss.parseRSS(req.body.url).catch(err => console.log('scraped data err : ', err)).catch(next)
  const domainToTest = await getHostName(req.body.url).catch(err => console.log('domain err : ', err)).catch(next)

  if (domainToTest.includes('feedburner')) domain = 'feedburner'
  else domain = domainToTest

  rdb.hget('rss', req.body.url)
    .then(exists => {
      if (!exists) {
        console.log('NOT exists 🔥 ', req.body.url, data.description ? data.description : data.title)
        // title for later retriveal
        rdb.hset(`site:${domain}`, 'title', data.title)
        rdb.hset(`site:${domain}`, 'description', data.description)

        rdb.hincrby('totalrss', 'count', 1)
        // res.json({ data })
        rdb.hset('rss', req.body.url, data.description ? data.description : data.title)
        // for building rss
        rdb.sadd('rsslist', `${req.body.url}`)
        res.json({
          status: 'ok'
        })
      }
      else {
        console.log('✅ exists ', req.body.url)
        res.json({ msg: 'Thank you!' })
      }
    })
    .catch(err => console.log('hget rss err : ', err))
    .catch(next)

  console.log(data.items.length)

  // data.items.forEach(async (item) => {
  for (let i = 0; i < data.items.length; i++) {
    const item = data.items[i]
    
    let pubDate
    if (item.pubDate) pubDate = item.pubDate
    else if (item.updated) pubDate = item.updated
    else pubDate = 1000000000000

    const link = item.link.startsWith('http') ? item.link : domain + item.link

    item.author = await data.title
    item.rssurl = req.body.url

    console.log(item.title, '@ ' ,item.author)
    const linkExists = await rdb.hget(`rss:${domain}`, link).catch(err => console.log('hget rss:domain err : ', err))

    if (!linkExists) {
      rdb.hincrby(`rss:${domain}`, link, 1)

      rdb.hset(`rss:${domain}`, link, JSON.stringify(item))

      // for global
      rdb.zadd('allrss:links', new Date(pubDate).getTime(), link)
      // for domain
      rdb.zadd(`readrss:${domain}`, new Date(pubDate).getTime(), JSON.stringify(item))
      // for building rss
      rdb.sadd(`rssbuild:${domain}`, link)
      // for building random rss
      rdb.sadd(`allrss:rand`, link)
      // for (let [key, value] of Object.entries(item)) {
      // }
    }
  }
})

router.post('/buildRSS', async (req, res, next) => {
  // const totalRSS = await rdb.hget('totalrss', 'count').catch(next)
  // const randSite = Math.floor((Math.random() * totalRSS) + 1)
  // console.log('total RSS ', totalRSS)

  for (let counter = 1; counter < 11; counter++) {
    const page = []

    const randomPages = await rdb.srandmember('postbox:rand', 10)

    // for (let i = 0; i < randomSites.length; i++) {
    //   let domain = await getHostName(randomSites[i])
    //   if (domain.includes('feedburner')) domain = 'feedburner'

    //   const url = await rdb.srandmember(`rssbuild:${domain}`, 1)
    //   const data = await rdb.hget(`rss:${domain}`, url)
    //   // console.log('😄', data)

    //   // data.author = await rdb.hget(`site:${url}`, 'title')
    //   // console.log('🗂 ', url)

    //   page.push(data)
    // }

    console.log('😄 ', randomPages.length)

    rdb.hset('postbox', counter, JSON.stringify(randomPages))
  }

  // console.log('Random RSS urls ', randomSites)

  res.json({
    status: 'Finished!'
  })
})

module.exports = router;
