const userSchema = require('./schemas/user-schema')


const handleJson = (item) => {
    return {
        amount: item.amount,
        buyAvgPrice: 0,
        cryptoHoldings: 0,
        cryptocurrencyId: item.cryptocurrencyId,
        priceChangePercentage24h: 0,
        name: item.name,
        symbol: item.symbol,
        historyList: [{...item, timestamp: item.timestamp ? item.timestamp : Date.now(),id: Math.floor(Math.random() * 100000 * Date.now())}]
    }
}

const findUser = async (email) => {
   return await userSchema.findOne({email})
}

const recalculatePortfoliosPrise = (portfolios) => {
       return portfolios.reduce((initValue,portfolio) => {
          const totalPrice = portfolio.cryptocurrencies.reduce((total,item) => {
                return total += item.historyList.reduce((init,item) => init += (+item.amount * +item.price) ,0)
            },0)
            portfolio.totalPrice = totalPrice
            initValue.push(portfolio)
            return initValue
        },[])
}



module.exports = {
    handleJson,
    findUser,
    recalculatePortfoliosPrise
}
