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
      // const head = root.querySelector('head') ? minifier(root.querySelector('head').text) : null
      const article = root.querySelector('article') ? minifier(root.querySelector('article').text) : null
      const body = root.querySelector('body') ? minifier(root.querySelector('body').text) : null
      const rootHTML = root.text ? minifier(root.text) : null
  
      console.log('🔥', title)
      if (article) {
        return {
          title,
          content: article
        }
      } else if (body) {
        return {
          title,
          content: body
        }
      } else {
        return {
          title,
          content: rootHTML
        }
      }
    } catch (err) {
      console.log('Scrape ERR: 🤷‍♂️🤷‍♂️🤷‍♂️ ', err)
      return {
        title: null,
        content: null
      }
    }
    // console.log('🔥 article </>', article)
    // console.log('🔥 test tag </>', root.text)
  }
}
