class ParseMessage {
    constructor(client, rawMessage, userId, messageId, chatId){
        this.userId = userId
        this.status = false
        this.messageId = messageId
        this.chatId = chatId
        if(rawMessage.charCodeAt(0)==55357 && rawMessage.charCodeAt(1)==56628){
            this.color = 'red'
        }else if(rawMessage.charCodeAt(0)==55357 && rawMessage.charCodeAt(1)==56629){
            this.color = 'blue'
        }
        let rawSplitMessage = rawMessage.split(' ')
        if(this.color && rawSplitMessage.length>=4){
            let tmpCount, tmpPrice, tmpName = ''
            for(let i = 1;i < rawSplitMessage.length-1;i++){
                tmpCount = rawSplitMessage[i-1]
                tmpPrice = rawSplitMessage[i+1]
                if(rawSplitMessage[i]=='ف' || rawSplitMessage[i]=='خ'){
                    this.count = parseInt(tmpCount, 10)
                    this.price = parseInt(tmpPrice, 10)
                    this.name = tmpName
                    if(rawSplitMessage[i]=='ف'){
                        this.type = 'sale'
                    }else {
                        this.type = 'buy'
                    }
                }else {
                    tmpName += rawSplitMessage[i-1]
                }
            }
            if(this.count && this.price){
                this.status = true
                client.set('user_' + this.type + '_' + this.userId, JSON.stringify(this))
                client.expire(this.userId,  60)
            }
        }
    }
}

module.exports = ParseMessage