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

bot.use(async (ctx, next) => {
    let loginState = await Logic.getValue(client, 'login_' + ctx.message.from.id)
    if(loginState)
        client.expire('login_' + ctx.message.from.id, 15*60)
    ctx.login = (loginState)?true:false
    next()
})

bot.on('message',async (ctx) => {
    // console.log(ctx)
    let chat = await ctx.getChat()
    if(chat.type=='private')
    {
        console.log('login', ctx.login)
        console.log('message', ctx.message)
        if(ctx.message.text=='/start'){
            ctx.reply('Welcome to MMGold Bot' + "\n" + 'Enter you command with / before it!')
        }else if(ctx.message.text.indexOf('/login')==0 && ctx.message.text.split(' ').length==2){
            if(ctx.login){
                ctx.reply('You are logged in!')
                return true
            }
            let password = ctx.message.text.split(' ')[1]
            let mainPassword = '123456'
            if(configs && configs.password){
                mainPassword = configs.password
            }

            if(password == mainPassword){
                client.set('login_' + ctx.message.from.id, 'loggedin')
                client.expire('login_' + ctx.message.from.id, 15*60)
                ctx.reply('Loggedin successfully')
                return true
            }else{
                ctx.reply('Wrong password')
                return false
            }
        }else{
            if(ctx.login){
                if(ctx.message.text.indexOf('/min')==0){
                    if(ctx.message.text.split(' ').length==2){
                        let min = parseInt(ctx.message.text.split(' ')[1], 10)
                        if(isNaN(min)){
                            ctx.reply('Wrong number')
                            return false
                        }
                        configs.min = min
                        fs.writeFile('./config.json', JSON.stringify(configs), () =>{})

                        ctx.reply('Min updated successfully')
                        return true
                    }
                    if(configs && configs.min){
                        ctx.reply('Min is ' + configs.min)
                        return true
                    }else{
                        ctx.reply('Min is not set yet')
                        return true
                    }
                }else if(ctx.message.text.indexOf('/max')==0){
                    if(ctx.message.text.split(' ').length==2){
                        let max = parseInt(ctx.message.text.split(' ')[1], 10)
                        if(isNaN(max)){
                            ctx.reply('Wrong number')
                            return false
                        }
                        configs.max = max
                        fs.writeFile('./config.json', JSON.stringify(configs), () =>{})
    
                        ctx.reply('Max updated successfully')
                        return true
                    }
                    if(configs && configs.max){
                        ctx.reply('Max is ' + configs.max)
                        return true
                    }else{
                        ctx.reply('Max is not set yet')
                        return true
                    }
                }else if(ctx.message.text.indexOf('/password')==0 && ctx.message.text.split(' ').length==2){
                    let password = ctx.message.text.split(' ')[1]
                    if(password!='' && password.length<6){
                        ctx.reply('Wrong password')
                        return false
                    }
                    configs.password = password
                    fs.writeFile('./config.json', JSON.stringify(configs), () =>{})
                    
                    ctx.reply('Password updated successfully')
                    return true
                }else if(ctx.message.text == '/logout'){
                    client.del('login_' + ctx.message.from.id)

                    ctx.reply('Logged out successfully')
                    return true
                }
            }
        }
    }else if(ctx.update.message.text){
        console.log(ctx.update.message.text)
        let parseMessage = new ParseMessage(client, ctx.update.message.text, ctx.update.message.from.id, ctx.update.message.message_id, ctx.chat.id)
        if(parseMessage.status)
            Logic.findPrices(client, bot, configs).then().catch(err => console.log('PRICES Error:', err))  
    }
})


bot.launch()