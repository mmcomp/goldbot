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
        let remainings = rawMessage.split(':')
        // console.log('remainingd', remainings)
        this.remaining = -1
        if(remainings.length==2){
            remainings = parseInt(remainings[1].replace(')', '').replace(/ /g, ''), 10)
            // console.log('remain', remainings)
            if(!isNaN(remainings)){
                this.remaining = remainings
            }
        }
        if(this.color && rawSplitMessage.length>=4){
            let tmpCount, tmpPrice, tmpName = ''
            for(let i = 1;i < rawSplitMessage.length-1;i++){
                tmpCount = rawSplitMessage[i-1]
                tmpPrice = rawSplitMessage[i+1]
                if(rawSplitMessage[i]=='ف' || rawSplitMessage[i]=='خ'){
                    this.count = parseInt(tmpCount, 10)
                    if(this.remaining<0){
                        this.remaining = this.count
                    }
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
            if(this.count && this.price && this.count>0 && this.remaining>0){
                this.status = true
                client.set('user_' + this.type + '_' + this.name, JSON.stringify(this))
                client.expire('user_' + this.type + '_' + this.name,  60)
            }
        }
    }
}

module.exports = ParseMessage