const { payloads } = require('./payloads')
const Axios = require('axios')
const { sleep } = require('../lib/sh')

// const api = 'http://localhost:5000'
const api = 'https://compass-sh.azurewebsites.net'

async function run () {
  for (let i = 0; i < payloads.length; i++) {
    await sleep(300)
    const item = payloads[i]

    const { data } = await Axios.post(`${api}/sh/index`, {
      site: item.root
    })

    console.log(`🚀 ${item.root} `, data)
  }
}

run()
