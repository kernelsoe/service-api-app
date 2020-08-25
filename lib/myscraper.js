const axios = require('axios')
// const got = require('got')
const { parse } = require('node-html-parser')
const minifier = require('string-minify')

module.exports = {
  async scrape (url) {
    const response = await axios.get(url).catch(err => {
      console.log('AXIOS response error 🤷‍♂️ ', err)
    })

    try {
      const root = parse(response.data, {
        script: false,            // retrieve content in <script> (hurt performance slightly)
        style: false,             // retrieve content in <style> (hurt performance slightly)
        comment: false            // retrieve comments (hurt performance slightly)
      })
  
      const title = root.querySelector('title') ? minifier(root.querySelector('title').text) : minifier(root.querySelector('head').text)
      // const pubDate = root.querySelector(pubDateTag) ? minifier(root.querySelector(pubDateTag).text) : null
      const content = root.querySelector('body') ? root.querySelector('body').text : root.text
  
      // console.log('🔥', title, pubDate, body)
      return {
        title,
        // pubDate,
        content
      }
      
    } catch (err) {
      console.log('Scrape ERR: 🤷‍♂️🤷‍♂️🤷‍♂️ ', err)
      return {
        title: null,
        content: null
      }
    }
  }
}
