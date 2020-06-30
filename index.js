require('dotenv').config()
const { Telegraf, Extra } = require('telegraf')
const ParseMessage = require('./classes/parse_message')
const Logic = require('./classes/logic')
const redis = require("redis");
const client = redis.createClient();
client.on('error', function (error) {
    console.log('redis error : ', error)
})

const bot = new Telegraf(process.env.BOT_TOKEN)
// bot.start((ctx) => ctx.reply('Welcome'))
// bot.help((ctx) => ctx.reply('Send me a sticker'))
// bot.on('sticker', (ctx) => ctx.reply('👍'))
// bot.hears('hi', (ctx) => ctx.reply('Hey there'))
bot.on('message', (ctx , extra) => {
    if(ctx.update.message.text)
    {
        let parseMessage = new ParseMessage(client, ctx.update.message.text, ctx.update.message.from.id, ctx.update.message.message_id, ctx.chat.id)
        if(parseMessage.status)
            Logic.findPrices(client, bot).then().catch(err => console.log('PRICES Error:', err))  
    }
})
bot.launch()