const { fork } = require('child_process')

const Axios = require('axios')
const express = require('express');
const router = express.Router();

const rdb = require('../lib/redisdb')
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
          rdb.send_command('FT.ADD', ['rIdx', link, '1.0', 'REPLACE', 'PARTIAL',
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

    res.json({
      status: 'ok'
    })
  } else {
    res.json({
      status: 'already registered'
    })
  }
})

module.exports = router;
