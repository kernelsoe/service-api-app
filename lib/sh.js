// const Axios = require('axios')
const rdb = require('../lib/redisdb')

module.exports = {
  sleep (milliseconds) {
    return new Promise(resolve => setTimeout(resolve, milliseconds))
  },
  async formatResults(data) {
    const results = []
    data.shift()

    if (data.length) {
      data.forEach((item, idx) => {
        if (idx % 2 === 0) {
          results.push(item)
        }
      })
    }

    return results
  },
  async getHostName (url) {
    let hostname;
    // find & remove protocol (http, ftp, etc.) and get hostname
    hostname = url.replace('www.','')
  
    if (url.indexOf("//") > -1) {
        hostname = hostname.split('/')[2];
    }
    else {
        hostname = hostname.split('/')[0];
    }
  
    // find & remove port number
    hostname = hostname.split(':')[0];
    // find & remove "?"
    hostname = hostname.split('?')[0];
  
    return hostname;
  },
  async sendcmd(cmd, payload) {
    const params = payload.split('%')
    
    return rdb.send_command(cmd, params)
  },
  async onCurrentDomain(domainToTest, currentDomain) {
    console.log(`${domainToTest} includes? ${currentDomain} => 🚀 ${domainToTest.includes(currentDomain)} `)
    return domainToTest.includes(currentDomain) ? true : false
  }
}
