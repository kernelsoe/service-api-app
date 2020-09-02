const { payloads } = require('./_crawl_payloads')
const Axios = require('axios')
const { sleep } = require('../lib/sh')

const api = 'http://localhost:5000'
// const api = 'https://compass-sh.azurewebsites.net'

async function run () {
  for (let i = 0; i < payloads.length; i++) {
    const url = payloads[i].rss

    await sleep(1000)

    if (url) {
      const { data } = await Axios.post(`${api}/cmd/submitRSS`, {
        url
      })
  
      console.log(url, '🎉', data)
    }
  }
}

run()
