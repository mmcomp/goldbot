const { Extra } = require('telegraf')

class Logic{
    static async getValue(client, key){
        // console.log('getting value of ', key)
        return new Promise(function(resolve, reject){
            client.get(key, function(err, value){
                if(err){
                    console.log('get key error', err)
                    return reject(err)
                }
                // console.log('value', value)
                value = JSON.parse(value)
                return resolve(value)
            })
        })
    }

    static async findPrices(client, bot){
        let lowSalePrice, hightBuyPrice
        return new Promise(function(resolve, reject){
            client.keys(`user_*`, async function(err, keys){
                if(err){
                    return reject(err)
                }
                // console.log('start finding')
                for(let key of keys){
                    let value = await Logic.getValue(client, key)
                    if(value.type == 'sale'){
                        if(!lowSalePrice || lowSalePrice>value.price){
                            lowSalePrice = value.price
                            // console.log('set low', value)
                            client.set('low', JSON.stringify(value))
                            client.expire('low',  60)
                        }
                    }else if(value.type == 'buy') {
                        if(!hightBuyPrice || hightBuyPrice<value.price){
                            hightBuyPrice = value.price
                            // console.log('set high', value)
                            client.set('high', JSON.stringify(value))
                            client.expire('high',  60)
                        }
                    }
                }
                Logic.checkPrices(client, bot).then().catch()
                return resolve({
                    lowSalePrice,
                    hightBuyPrice
                })
            })
        })
    }

    static async checkPrices(client, bot){
        return new Promise(async function (resolve ,reject){
            try{
                var low = await Logic.getValue(client, 'low')
                var high = await Logic.getValue(client, 'high')
                // console.log('CHECK')
                // console.log('low', low)
                // console.log('high', high)
                if(low && high && low.price<high.price){
                    // console.log('action')
                    Logic.replyTo(bot, low.chatId, '1', low.messageId)
                    Logic.replyTo(bot, high.chatId, '1', high.messageId)
                    // console.log('deleting ...', 'user_sale_' + low.name, 'user_buy_' + high.name)
                    client.del('user_sale_' + low.name)
                    client.del('user_buy_' + high.name)
                    client.del('low')
                    client.del('high')
                }
            }catch(e){console.log(e)}
        })
    }

    static async replyTo(bot, chat_id, message, message_id){
        bot.telegram.sendMessage(chat_id, message, Extra.inReplyTo(message_id))
    }
}

module.exports = Logic