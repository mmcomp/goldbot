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
let configs = {
    min_deal: 1,
    max_deal: 3,
    min_price_diff: 1,
    max_price_diff: 3,
    min_sale_price_diff: 1,
    max_sale_price_diff: 10,
    enable_main_bot: true,
    enable_sale_bot: true,
    enable_sale_bot_continue: true,
    is_test: false,
    password: "123456"
}
if(fs.existsSync('./config.json')){
    let tmp = fs.readFileSync('./config.json')
    try{
        configs = JSON.parse(tmp)
    }catch(e){}
}

const bot = new Telegraf(process.env.BOT_TOKEN)

bot.use(async (ctx, next) => {
    if(ctx && ctx.message && ctx.message.from){
        let loginState = await Logic.getValue(client, 'login_' + ctx.message.from.id)
        if(loginState)
            client.expire('login_' + ctx.message.from.id, 15*60)
        ctx.login = (loginState)?true:false
    }else{
        ctx.login = false
    }

    next()
})

async function sendMenu(ctx, configs){
    const adminMenus = Telegraf.Extra
        .markdown()
        .markup((m) => m.inlineKeyboard([
            m.callbackButton((configs.enable_main_bot)?'غیرفعال کردن ربات':'فعال کردن ربات', 'disable_bot'),
            m.callbackButton((configs.enable_sale_bot)?'غیرفعال کردن حراج':'فعال کردن حراج', 'disable_sale'),
            m.callbackButton((configs.enable_sale_bot_continue)?'غیرفعال کردن ح پیوسته':'فعال کردن ح پیوسته', 'disable_sale_continue')
        ]))
    
    await ctx.reply(`
    راهنمای ربات
- جهت مشاهده مقدار هر یک از پارامترهای ذیل دستور مقابل آن را ارسال کنید
- جهت بروز کردن پارامترهای ذیل دستور مقابل آن را به همراه مقدار که با یک فاصله از آن تایپ شده ارسال کنید
    \`
    /min_deal                حداقل برکت
    /max_deal                حداکثر برکت
    /min_price_diff          حداقل تفاوت خط
    /max_price_diff          حداکثر تفاوت خط
    /min_sale_price_diff     حداقل تفاوت خط حراج
    /max_sale_price_diff     حداکثر تفاوت خط حراج
    \`
    \`\`جهت مشاهده مجدد این منو می توانید فرمان /help  را ارسال  کنید\`\`
    `, adminMenus)
    fs.writeFile('./config.json', JSON.stringify(configs), () =>{})
}

bot.action('disable_bot', (ctx) => {
    if(configs.enable_main_bot){
        configs.enable_main_bot = false
        ctx.answerCbQuery('ربات غیرفعال شد')
    }else{
        configs.enable_main_bot = true
        ctx.answerCbQuery('ربات فعال شد')
    }
    sendMenu(ctx, configs)
})

bot.action('disable_sale', (ctx) => {
    if(configs.enable_sale_bot){
        configs.enable_sale_bot = false
        ctx.answerCbQuery('حراج غیرفعال شد')
    }else{
        configs.enable_sale_bot = true
        ctx.answerCbQuery('حراج فعال شد')
    }
    sendMenu(ctx, configs)
})

bot.action('disable_sale_continue', (ctx) => {
    if(configs.enable_sale_bot_continue){
        configs.enable_sale_bot_continue = false
        ctx.answerCbQuery('حراج پیوسته غیرفعال شد')
    }else{
        configs.enable_sale_bot_continue = true
        ctx.answerCbQuery('حراج  پیوسته فعال شد')
    }
    sendMenu(ctx, configs)
})

bot.on('message',async (ctx) => {
    // console.log(ctx)
    let chat = await ctx.getChat()
    if(chat.type=='private')
    {
        // console.log('login', ctx.login)
        // console.log('message', ctx.message)
        if(ctx.message.text=='/start'){
            ctx.reply('Welcome to MMGold Bot' + "\n" + 'Enter you command with / before it!')
            // const testMenu = Telegraf.Extra
            // .markdown()
            // .markup((m) => m.inlineKeyboard([
            //     m.callbackButton('Test button', 'test')
            // ]))

            // const aboutMenu = Telegraf.Extra
            // .markdown()
            // .markup((m) => m.keyboard([
            //     m.callbackButton('⬅️ Back')
            // ]).resize())
            // ctx.reply('test message', testMenu)
            // ctx.reply('about', aboutMenu)
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

                ctx.reply('Loggedin successfully').then(()=>{
                    sendMenu(ctx, configs)
                })

                return true
            }else{
                ctx.reply('Wrong password')
                return false
            }
        }else{
            if(ctx.login){
                if(ctx.message.text.indexOf('/min_deal')==0){
                    if(ctx.message.text.split(' ').length==2){
                        let min = parseInt(ctx.message.text.split(' ')[1], 10)
                        if(isNaN(min)){
                            ctx.reply('Wrong number')
                            return false
                        }
                        configs.min_deal = min
                        fs.writeFile('./config.json', JSON.stringify(configs), () =>{})

                        ctx.reply('Min Deal updated successfully')
                        return true
                    }
                    if(configs && configs.min_deal){
                        ctx.reply('Min Deal is ' + configs.min_deal)
                        return true
                    }else{
                        ctx.reply('Min Deal is not set yet')
                        return true
                    }
                }else if(ctx.message.text.indexOf('/min_price_diff')==0){
                    if(ctx.message.text.split(' ').length==2){
                        let min = parseInt(ctx.message.text.split(' ')[1], 10)
                        if(isNaN(min)){
                            ctx.reply('Wrong number')
                            return false
                        }
                        configs.min_price_diff = min
                        fs.writeFile('./config.json', JSON.stringify(configs), () =>{})

                        ctx.reply('Min Price updated successfully')
                        return true
                    }
                    if(configs && configs.min_price_diff){
                        ctx.reply('Min Price is ' + configs.min_price_diff)
                        return true
                    }else{
                        ctx.reply('Min Price is not set yet')
                        return true
                    }
                }else if(ctx.message.text.indexOf('/help')==0){
                    sendMenu(ctx, configs)
                }else if(ctx.message.text.indexOf('/min_sale_price_diff')==0){
                    if(ctx.message.text.split(' ').length==2){
                        let min = parseInt(ctx.message.text.split(' ')[1], 10)
                        if(isNaN(min)){
                            ctx.reply('Wrong number')
                            return false
                        }
                        configs.min_sale_price_diff = min
                        fs.writeFile('./config.json', JSON.stringify(configs), () =>{})

                        ctx.reply('Min Sale Price updated successfully')
                        return true
                    }
                    if(configs && configs.min_sale_price_diff){
                        ctx.reply('Min Sale Price is ' + configs.min_sale_price_diff)
                        return true
                    }else{
                        ctx.reply('Min Sale Price is not set yet')
                        return true
                    }
                }else if(ctx.message.text.indexOf('/max_deal')==0){
                    if(ctx.message.text.split(' ').length==2){
                        let max = parseInt(ctx.message.text.split(' ')[1], 10)
                        if(isNaN(max)){
                            ctx.reply('Wrong number')
                            return false
                        }
                        configs.max_deal = max
                        fs.writeFile('./config.json', JSON.stringify(configs), () =>{})
    
                        ctx.reply('Max Deal updated successfully')
                        return true
                    }
                    if(configs && configs.max_deal){
                        ctx.reply('Max Deal is ' + configs.max_deal)
                        return true
                    }else{
                        ctx.reply('Max Deal is not set yet')
                        return true
                    }
                }else if(ctx.message.text.indexOf('/max_price_diff')==0){
                    if(ctx.message.text.split(' ').length==2){
                        let max = parseInt(ctx.message.text.split(' ')[1], 10)
                        if(isNaN(max)){
                            ctx.reply('Wrong number')
                            return false
                        }
                        configs.max_price_diff = max
                        fs.writeFile('./config.json', JSON.stringify(configs), () =>{})
    
                        ctx.reply('Max Price updated successfully')
                        return true
                    }
                    if(configs && configs.max_price_diff){
                        ctx.reply('Max Price is ' + configs.max_price_diff)
                        return true
                    }else{
                        ctx.reply('Max Price is not set yet')
                        return true
                    }
                }else if(ctx.message.text.indexOf('/max_sale_price_diff')==0){
                    if(ctx.message.text.split(' ').length==2){
                        let max = parseInt(ctx.message.text.split(' ')[1], 10)
                        if(isNaN(max)){
                            ctx.reply('Wrong number')
                            return false
                        }
                        configs.max_sale_price_diff = max
                        fs.writeFile('./config.json', JSON.stringify(configs), () =>{})
    
                        ctx.reply('Max Sale Price updated successfully')
                        return true
                    }
                    if(configs && configs.max_sale_price_diff){
                        ctx.reply('Max Sale Price is ' + configs.max_sale_price_diff)
                        return true
                    }else{
                        ctx.reply('Max Sale Price is not set yet')
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
    }else if(ctx.update.message.text && configs.enable_main_bot){
        // console.log(ctx.update.message.text)
        let parseMessage = new ParseMessage(client, ctx.update.message.text, ctx.update.message.from.id, ctx.update.message.message_id, ctx.chat.id, configs)
        if(parseMessage.status)
            Logic.findPrices(client, bot, configs).then().catch(err => console.log('PRICES Error:', err))  
    }
})

// bot.on('message',async (ctx) => { 
//     console.log('message', ctx.message) 
//     setTimeout(async function (){
//         console.log(await checkMessageId(bot, ctx.chat.id, ctx.message))
//     }, 4000) 
// })
bot.on('edited_message', (ctx) => { console.log('edited_message') })
bot.on('inline_query', (ctx) => { console.log('inline_query') })
bot.on('text', (ctx) => { console.log('text') })
bot.on('venue', (ctx) => { console.log('venue') })

bot.launch()