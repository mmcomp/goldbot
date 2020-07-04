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
            if (low && high && (low.price < high.price || force===true)) {
                console.log('ACTION')
                let requestGold = Math.min(low.remaining, high.remaining)
                if (configs && configs.max) {
                    requestGold = Math.min(requestGold, configs.max)
                }
                if (typeof configs.min != 'undefined' && configs.min > requestGold) {
                    return false
                }
                if (typeof configs.min == 'undefined' && typeof configs.max == 'undefined') {
                    requestGold = 1
                }
                console.log('Request', requestGold)
                if(await Logic.checkMessageId(bot, low.chatId, low.messageId)){
                    Logic.replyTo(bot, low.chatId, String(requestGold), low.messageId)
                }else{
                    console.log('Low reply Failed!')
                    return false
                }
                setTimeout(async function(){

                    if(await Logic.checkMessageId(bot, high.chatId, high.messageId)){
                        Logic.replyTo(bot, high.chatId, String(requestGold), high.messageId)
                    }else{
                        console.log('High reply Failed!', 'low_hazard-' + low.name, JSON.stringify(low))
                        client.set('low_hazard-' + low.name, JSON.stringify(low))
                    }
                    client.del('user_sale_' + low.name)
                    client.del('user_buy_' + high.name)
                    client.del('low')
                    client.del('high')


                }, 5000)


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