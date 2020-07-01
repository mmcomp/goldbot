require('dotenv').config()
const fs = require('fs')
const { Telegraf, Extra } = require('telegraf')
const ParseMessage = require('./classes/parse_message')
const Logic = require('./classes/logic')
const redis = require("redis");
const client = redis.createClient();
client.on('error', function (error) {
    console.log('redis error : ', error)
})
let configs = {}
if(fs.existsSync('./config.json')){
    let tmp = fs.readFileSync('./config.json')
    try{
        configs = JSON.parse(tmp)
    }catch(e){}
}

const bot = new Telegraf(process.env.BOT_TOKEN)

bot.on('message', (ctx) => {
    // console.log(ctx)
    if(ctx.update.message.text)
    {
        console.log(ctx.update.message.text)
        let parseMessage = new ParseMessage(client, ctx.update.message.text, ctx.update.message.from.id, ctx.update.message.message_id, ctx.chat.id)
        if(parseMessage.status)
            Logic.findPrices(client, bot, configs).then().catch(err => console.log('PRICES Error:', err))  
    }
})
bot.launch()