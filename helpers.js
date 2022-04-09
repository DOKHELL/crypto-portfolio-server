const handleJson = (item) => {
    return {
        amount: item.amount,
        buyAvgPrice: 0,
        cryptoHoldings: 0,
        cryptocurrencyId: item.cryptocurrencyId,
        priceChangePercentage24h: 0,
        name: item.name,
        symbol: item.symbol,
        historyList: [{...item, timestamp: item.timestamp ? item.timestamp : Date.now()}]
    }
}



module.exports = {
    handleJson,
}
