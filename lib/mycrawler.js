const got = require('got');
const { parse } = require('node-html-parser');
const { getHostName, sleep } = require('./sh')
const rdb = require('./redisdb')
 
module.exports = {
  async crawl(url, q, rooturl) {
    await sleep(600)
    const host = await getHostName(rooturl)
    // const linksBucket = []
    let found = 0
  
    try {
      const response = await got(url);
  
      const root = parse(response.body)
      const linksEl = root.querySelectorAll(q)
  
      console.log(`✅ total found => ${url} => ${linksEl.length}`)
  
      for (let i = 0; i < linksEl.length; i++) {
        const l = linksEl[i].getAttribute('href')
        console.log(l)
        if (l.startsWith('/')) {
          rdb.hincrby(`links:${host}`, rooturl + l, 1)
          found = found + 1
          // linksBucket.push(rooturl + l)
        } else {
          rdb.hincrby(`links:${host}`, l, 1)
          found = found + 1
          // linksBucket.push(l)
        }
      }


      return found
  
      // console.log('✅ ', linksBucket.length)
    } catch (error) {
        console.log(error.response.body);
    }
  }
}
