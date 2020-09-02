const { payloads } = require('./_crawl_payloads')
const Axios = require('axios')
const { sleep } = require('../lib/sh')

// const api = 'http://localhost:5000'
const api = 'https://compass-sh.azurewebsites.net'

async function run () {
  for (let i = 0; i < payloads.length; i++) {
    const item = payloads[i]

    await sleep(1000)

    const { data } = await Axios.post(`${api}/sh/register`, {
      root: item.root,
      payloads: item.payloads,
      rss: item.rss
    })

    console.log(data)
  }
}

run()
