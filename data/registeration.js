const { payloads } = require('./payloads')
const Axios = require('axios')

const api = 'http://localhost:5000'

async function run () {
  for (let i = 0; i < payloads.length; i++) {
    const item = payloads[i]

    const { data } = await Axios.post(`${api}/sh/register`, {
      root: item.root,
      payloads: item.payloads
    })

    console.log(data)
  }
}

run()
