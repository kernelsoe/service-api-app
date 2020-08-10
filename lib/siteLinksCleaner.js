const { sleep, getHostName, onCurrentDomain } = require('./sh')
const rdb = require('./redisdb')

const linkBucket = []
const blacklistURLs = [
  'reversePaginate=true',
  '?replytocom=',
  '?author=',
  '&author=',
  '?share=',
  'wp-trackback.php?p=',
  '?utm_source=',
  '?skin=',
  '/tag/',
  '/tags/'
]
const fileEndings = ['.jpeg', '.jpg', '.png', '.gif', '.xml', '.zip', '.tar.gz', '.tar.xz']
const deleteBucket = []

async function cleanLinks(site, cleanRegex) {
  await sleep(1000)

  rdb.hgetall(`links:${site}`)
    .then(async (links) => {
      for (const [link, value] of Object.entries(links)) {
        linkBucket.push(link)
      }

      // remove www alias links
      linkBucket.forEach(l => {
        if (l.includes('//www.')) {
          const rootLink = l.replace('www.', '')
          if (linkBucket.includes(rootLink)) rdb.hdel(`links:${site}`, l)
        }
      })
      console.log('removing www finished')

      // remove slash '/' ending same links
      linkBucket.forEach(l => {
        if (!l.endsWith('/') && linkBucket.includes(l+('/'))) {
          console.log('REMOVE LINK! => ', l)

          // rdb.hdel(`links:${site}`, l)
          deleteBucket.push(l)
        }
        // removing admin requested links
        if (cleanRegex !== '' || null) {
          if (l.includes(cleanRegex)) {
            console.log('💣 LINK! => ', l)
            rdb.hdel(`links:${site}`, l)
          }
        }
      })
      console.log('removing slash ending finished')

      // removing black list links
      linkBucket.forEach(l => {
        blacklistURLs.forEach(blURL => {
          if (l.includes(blURL)) {
            console.log('💣 LINK! => ', l)
            rdb.hdel(`links:${site}`, l)
          }
        })
      })
      console.log('removing blacklist links finished')

      // remove file extensions
      linkBucket.forEach(l => {
        fileEndings.forEach(ext => {
          if (l.endsWith(ext)) {
            console.log('💣 LINK! => ', l)
            rdb.hdel(`links:${site}`, l)
          }
        })
      })
      console.log('removing file extensions finished')

      // remove other domains
      for (let i = 0; i < linkBucket.length; i++) {
        console.log('✅ ', linkBucket[i])
        const domainToTest = await getHostName(linkBucket[i])
        const isOnCurrentDomain = await onCurrentDomain(domainToTest, site)

        if (!isOnCurrentDomain) rdb.hdel(`links:${site}`, linkBucket[i])
      }

      console.log('removing domains finished', linkBucket.length)
    })
    .then(() => {
      console.log('😎😎😎 ', deleteBucket.length)
      rdb.hdel(`links:${site}`, deleteBucket)

      process.send('cleaningFinished!')
      process.exit(0)
    })
}

const args = process.argv.slice(2)
console.log('Running Links Cleaner with => ', args)

cleanLinks(args[0], args[1])
