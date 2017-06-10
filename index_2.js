'use strict';

let Bot       = require('./Bot');
const redis   = require('redis');
const request = require('superagent');
const wikiAPI = "https://en.wikipedia.org/w/api.php?format=json&action=query&prop=extracts&exintro=&explaintext=&titles=";
const wikiURL = 'https://en.wikipedia.org/wiki/';

let redisClient = redis.createClient(6379, 'localhost');


const bot = new Bot({
    token: 'xoxb-196368483319-Fzd1ZjcVRNGMyb44uiGcpJlW',
    autoReconnect: true,
    autoMark: true
});

redisClient.on('error', (err) => {
    console.log('Error ' + err);
});

redisClient.on('connect', () =>{
    console.log('Connected to redis');
});

function getArgs(msg) {
    return msg.split(' ').slice(1);
};

bot.respondTo('save', (message, channel, user) =>{
    debugger
    let args = getArgs(message.text);

    let key = args.shift();
    let value = args.join(' ');

    redisClient.set(key, value, (err) => {
        console.log("after saving....");
        if (err){
           console.log('error saving ' + err);
           bot.send('Oops!, something went wrong ' + err, channel)
        } else {
           bot.send(`OK! ${user.name}, I will remember this for you`, channel);
        }
    });
}, true);


bot.respondTo('fetch', (message, channel, user) =>{
   bot.setTypingIndicator(channel);

   let key = getArgs(message.text).shift();

   redisClient.get(key, (err, result) => {
      if (err){
          console.log(err);
          bot.send('Oops! sXXX happens !', channel)
      }

      bot.send('Here is what\'s in store ' + result, channel);

   });
});

bot.respondTo('hello', (message, channel, user) => {

    bot.send(`Hello to you too, ${user.name}! `, channel)
    //
    // let str = user.name + ' Hello from `redis`';
    // console.log(str)
    // redisClient.set('hello', str);
    // redisClient.get('hello', (err, reply) => {
    //     if (err){
    //         console.log(err);
    //         return;
    //     }
    //
    //     console.log(reply);
    //
    // });

}, true);

function getWikiSummary(term, cb) {
    debugger
    // replace spaces with unicode
    let parameters = term.replace(/ /g, '%20');
    request
        .get(wikiAPI + parameters)
        .end((err, res) => {
            if (err) {
                cb(err);
                return;
            }

            let url = wikiURL + parameters;
            console.log(url);
            cb(null, JSON.parse(res.text), url);
        });
}

bot.respondTo('help', (message, channel) => {
    bot.send(`To use my Wikipedia functionality, type \`wiki\` followed by your search query`, channel);
}, true);


bot.respondTo('wiki', (message, channel, user) => {
    if (user && user.is_bot) {
        return;
    }

    bot.setTypingIndicator(message.channel);


    // grab the search parameters, but remove the command 'wiki' // from
    // the beginning of the message first
    let args = message.text.split(' ').slice(1).join(' ');

    getWikiSummary(args, (err, result, url) => {
        debugger

        if (err) {
            bot.send(`I\'m sorry, but something went wrong with your query`, channel);
            console.error(err);
            return;
        }

        let pageID = Object.keys(result.query.pages)[0];

        // -1 indicates that the article doesn't exist
        if (parseInt(pageID, 10) === -1) {
            bot.send('That page does not exist yet, perhaps you\'d like to create it:', channel);
            bot.send(url, channel);
            return;
        }

        let page = result.query.pages[pageID];
        let summary = page.extract;

        if (/may refer to/i.test(summary)) {
            bot.send('Your search query may refer to multiple things, please be more specific or visit:', channel);
            bot.send(url, channel);
            return;
        }

        if (summary !== '') {
            bot.send(url, channel);
            let paragraphs = summary.split('\n');

            paragraphs.forEach((paragraph) => {
                if (paragraph !== '') {
                    bot.send(`> ${paragraph}`, channel);
                }
            });
        } else {
            bot.send('I\'m sorry, I couldn\'t find anything on that subject. Try another one!', channel);
        }
    });
}, true);