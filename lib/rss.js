let Parser = require('rss-parser');
let parser = new Parser();
 
async function parseRSS (url) {
 
  let feed = await parser.parseURL(url);
  console.log(feed.title);
 
  // feed.items.forEach(item => {
  //   console.log(item.title + ':' + item.link)
  // });
 
  return feed
}

module.exports = {
  parseRSS
}
