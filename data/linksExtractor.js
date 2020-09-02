const { payloads } = require('./_crawl_payloads.js')

async function run () {
  for (let i = 0; i < payloads.length; i++) {
    const item = payloads[i]
    
    console.log(`'${item.root}',`)
  }
}

run()
