const { payloads } = require('./_crawl_payloads')
const Axios = require('axios')
const { sleep, getHostName } = require('../lib/sh')

// const api = 'http://localhost:5000'
const api = 'https://compass-sh.azurewebsites.net'

async function run () {
  for (let i = 0; i < payloads.length; i++) {
    const item = payloads[i]
    const domain = await getHostName(item.root)

    await sleep(300)
    const { data } = await Axios.post(`${api}/cmd/sendCMD`, {
      cmd: 'HGETALL',
      params: `links:${domain}`
    })

    if (data.data.length) console.log(`✅ ${item.root} => ${data.data.length}`)
    else console.log(`🔥 ${item.root} => ${data.data.length}`)
  }
}

run()
