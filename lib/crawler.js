const Axios = require('axios')
const { sleep, getHostName, onCurrentDomain } = require('./sh')
const rdb = require('./redisdb')

async function crawl(url, domain, rootUrl, counter) {
  const { data } = await Axios.get(`${process.env.linksGenAPI}/?url=${url}`)

  for (let [url] of Object.entries(data.Links)) {
    const l = url
    await sleep(1000)

    const domainToTest = await getHostName(l)
    const isOnCurrentDomain = await onCurrentDomain(domainToTest, domain)

    if (isOnCurrentDomain) {
      rdb.hget(`links:${domain}`, l)
        .then(async (visitCount) => {
          if (!visitCount || visitCount < counter) {
            rdb.hincrby(`links:${domain}`, l, 1)
            // Re crawl
            await sleep(30000)

            await Axios.post(`${process.env.host}/sh/crawlSite`, {
              url: l,
              rootUrl,
              type: 'recrawl',
              counter
            })
          }
        })
      .catch(err => console.log(err))
    }    
  }
}

module.exports = {
  async startCrawl(site, rootUrl, counter) {
    const links = await crawl(site, await getHostName(site), rootUrl, counter)
    return links
  }
}
