const {
    Extra
} = require('telegraf')

class Logic {
    static async getValue(client, key) {
        // console.log('getting value of ', key)
        return new Promise(function (resolve, reject) {
            client.get(key, function (err, value) {
                if (err) {
                    console.log('get key error', err)
                    return reject(err)
                }
                // console.log('value', value)
                try {
                    value = JSON.parse(value)
                } catch (e) {}
                return resolve(value)
            })
        })
    }

    static async findPrices(client, bot, configs) {
        // console.log('Find Prices')
        let lowSalePrice, hightBuyPrice
        return new Promise(function (resolve, reject) {
            client.keys(`user_*`, async function (err, keys) {
                if (err) {
                    return reject(err)
                }
                // console.log('start finding')
                for (let key of keys) {
                    let value = await Logic.getValue(client, key)
                    if (value.type == 'sale') {
                        if (!lowSalePrice || lowSalePrice > value.price) {
                            lowSalePrice = value.price
                            // console.log('set low', value)
                            client.set('low', JSON.stringify(value))
                            client.expire('low', 60)
                        }
                    } else if (value.type == 'buy') {
                        if (!hightBuyPrice || hightBuyPrice < value.price) {
                            hightBuyPrice = value.price
                            // console.log('set high', value)
                            client.set('high', JSON.stringify(value))
                            client.expire('high', 60)
                        }
                    }
                }

                Logic.hazards(client, bot, configs).then(()=>{
                    Logic.checkPrices(client, bot, configs).then().catch()
                }).catch()
                
                return resolve({
                    lowSalePrice,
                    hightBuyPrice
                })
            })
        })
    }

    static async checkPrices(client, bot, configs, force) {
        // console.log('check prices')
        try {
            var low = await Logic.getValue(client, 'low')
            var high = await Logic.getValue(client, 'high')
            console.log('low', low)
            console.log('high', high)
            var priceOk = (low && high && (high.price - low.price >= configs.min_price_diff) && (high.price - low.price <= configs.max_price_diff))
            if(low && high && (low.isSale || high.isSale)){
                priceOk = ((high.price - low.price >= configs.min_sale_price_diff) && (high.price - low.price <= configs.max_sale_price_diff))
            }
            if (low && high && (priceOk || force===true)) {
                console.log('ACTION')
                let requestGold = 1
                if(!low.isSale && !high.isSale){
                    requestGold = Math.min(low.remaining, high.remaining)
                    if (configs && configs.max_deal) {
                        requestGold = Math.min(requestGold, configs.max_deal)
                    }
                    if (configs.min_deal > requestGold) {
                        return false
                    }
                }
                console.log('Request', requestGold)

                if(await Logic.checkMessageId(bot, low.chatId, low.messageId)){
                    Logic.replyTo(bot, low.chatId, String(requestGold), low.messageId)
                }else{
                    console.log('Low reply Failed!')
                    return false
                }
                if(configs.is_test){
                    setTimeout(async function(){
                        if(await Logic.checkMessageId(bot, high.chatId, high.messageId)){
                            Logic.replyTo(bot, high.chatId, String(requestGold), high.messageId)
                        }else{
                            console.log('High reply Failed!', 'low_hazard-' + low.name, JSON.stringify(low))
                            client.set('low_hazard-' + low.name, JSON.stringify(low))
                        }
                        if(!low.isSale || !configs.enable_sale_bot_continue || low.remaining==0) {
                            client.del('user_sale_' + low.name)
                            client.del('low')
                        }
                        if(!high.isSale || !configs.enable_sale_bot_continue || high.remaining==0){
                            client.del('user_buy_' + high.name)
                            client.del('high')
                        }
                    }, 5000)
                }else{
                    if(await Logic.checkMessageId(bot, high.chatId, high.messageId)){
                        Logic.replyTo(bot, high.chatId, String(requestGold), high.messageId)
                    }else{
                        console.log('High reply Failed!', 'low_hazard-' + low.name, JSON.stringify(low))
                        client.set('low_hazard-' + low.name, JSON.stringify(low))
                    }
                    if(!low.isSale || !configs.enable_sale_bot_continue || low.remaining==0) {
                        client.del('user_sale_' + low.name)
                        client.del('low')
                    }
                    if(!high.isSale || !configs.enable_sale_bot_continue || high.remaining==0){
                        client.del('user_buy_' + high.name)
                        client.del('high')
                    }
                }



            }
        } catch (e) {
            console.log(e)
        }
    }

    static async hazards(client, bot, configs) {
        console.log('Hazards')
        return new Promise(async function (resolve, reject) {
            var high = await Logic.getValue(client, 'high')
            if(typeof high=='undefined'){
                return reject()
            }
            client.keys(`low_hazard-*`, async function (err, keys) {
                if (err) {
                    return reject(err)
                }
                let maxLoss = 100
                console.log('start finding hazard')
                for (let key of keys) {
                    let value = await Logic.getValue(client, key)
                    if(value.price - high.price <= maxLoss){
                        client.set('low', JSON.stringify(value))
                        Logic.checkPrices(client, bot, configs, true).then().catch()
                        client.del(key)
                        console.log('Hazard fixed', key)
                    }
                }
                return resolve()
            })
        })
    }

    static async replyTo(bot, chat_id, message, message_id) {
        console.log('Reply', chat_id, message_id)
        bot.telegram.sendMessage(chat_id, message, Extra.inReplyTo(message_id))
    }

    static async checkMessageId(bot, chatId, messageId) {
        console.log('Check Message', chatId, messageId)
        try {
            await bot.telegram.pinChatMessage(chatId, messageId)
            await bot.telegram.unpinChatMessage(chatId, messageId)
            return true
        } catch (e) {
            console.log(e)
            return false
        }
    }
}

module.exports = Logic