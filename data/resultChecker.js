const { payloads } = require('./_crawl_payloads')
const Axios = require('axios')
const { sleep, getHostName } = require('../lib/sh')

// const api = 'http://localhost:5000'
const api = 'https://compass-sh.azurewebsites.net'

async function run () {
  for (let i = 0; i < payloads.length; i++) {
    const item = payloads[i]
    const domain = await getHostName(item.root)
    console.log(`@url:${domain}`)

    // await sleep(300)
    // const { data } = await Axios.get(`${api}/search?q=@url${domain}&offset=0&count=1`)

    // if (data.data.length) console.log(`✅ ${item.root} => ${data.data.length}`)
    // else console.log(`🔥 ${item.root} => ${data.data.length}`)
  }
}

run()
