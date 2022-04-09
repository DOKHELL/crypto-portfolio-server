const axios = require("axios");
const fs = require("fs");
const { handleJson } = require("./helpers");


const getAllTokens = async () => {
    try {
        const res = await axios.get('https://api.coingecko.com/api/v3/search')
        const data = res.data?.coins?.map((t) => ({ name: t.name, symbol: t.symbol, cryptocurrencyId: t.id, image: t.large || t.thumb }))
        fs.writeFileSync('allTokens.json', JSON.stringify(data));
    } catch (e) {
        console.log(e.message)
    }
}

const searchTokens = (v) => {
    try {
        const value = v.toLowerCase()
        let tokens = fs.readFileSync('allTokens.json');
        let allTokens = JSON.parse(tokens);
        const result = allTokens.filter((t) => t.name.toLowerCase().includes(value) || t.symbol.toLowerCase().includes(value))
        return result?.slice(0, 10);
    } catch (e) {
        console.log(e.message)
    }
}

const getChartValue = async (currentToken, days = 1, interval, name) => {
    try {
        const res = await axios.get(`https://api.coingecko.com/api/v3/coins/${name}/market_chart?vs_currency=USD&days=${days}&interval=${interval}`)
        const prices = res?.data?.prices;
        const calculatedData = prices.map(item => {
            const total = currentToken.historyList.reduce((acc, next) => {
                if (next.timestamp <= item[0]) {
                    return acc + item[1] * next.amount;
                }
                return acc;
            }, 0)
            return [item[0], total]
        })
        return calculatedData;
    } catch (e) {
        console.log(e)
        return [];
    }
}


const getAllChartsValues = async (id, days = 1, interval, len, size) => {
    try {
        let res = fs.readFileSync('portfolios.json');
        let allData = JSON.parse(res);
        const currentPortfolio = allData.find((item) => +item.id === +id);
        let result = []
        const now = Date.now();
        let date = now;
        for (let i = 0; i <= len; i++) {
            const g = date - size;
            result.unshift([g, 0])
            date = g
        }
        for await (let currentToken of currentPortfolio?.tokenList) {
            let res = await getChartValue(currentToken, days, interval, currentToken.cryptocurrencyId)
            if (res.length < result.length) {
                const r = result.length - res.length;
                for (let i = 0; i < r; i++) {
                    if (res[0]) {
                        res.unshift([result[i][0], res[0][1]])
                    }
                    if (res[1]) {
                        res.unshift([result[i][0], res[1][1]])
                    }
                }
            }
            result = result.map((item, index) => {
                if (res[index]) {
                    return [item[0], +item[1] + +res[index][1]]
                }
                return item;
            })
        }
        return result;
    } catch (e) {
        console.log(e)
    }
}

const getPortfolio = async (id) => {
    console.log('call')
    let res = fs.readFileSync('portfolios.json');
    let allData = JSON.parse(res);
    const currentPortfolio = allData.find((item) => +item.id === +id);
    if (currentPortfolio) {
        try {
            const allIds = currentPortfolio.tokenList.map(item => item.cryptocurrencyId);
            const resPrice = await axios.get(`https://api.coingecko.com/api/v3/simple/price?ids=${allIds.join(',')}&vs_currencies=usd`)
            const res = await axios.get(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${allIds.join(', ')}&order=market_cap_desc&per_page=100&page=1&sparkline=false`)
            const actualPrices = resPrice.data;
            const actualInfo = res.data;
            currentPortfolio.tokenList.forEach(item => {
                const currentToken = actualPrices[item.cryptocurrencyId];
                const currentTokenInfo = actualInfo.find((e) => e.id === item.cryptocurrencyId);
                const actualPrice = +currentToken?.usd;
                const actualImage = currentTokenInfo?.image || 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSEJuG8Txy1DAwR8IzvgWRumVWdVt9l-_VUQw&usqp=CAU';
                const price_change_percentage_24h = +currentTokenInfo?.price_change_percentage_24h;
                item.image = actualImage;
                item.currentPrice = actualPrice;
                item.priceChangePercentage24h = price_change_percentage_24h;
                const totalAmount = item.historyList.reduce((acc, next) => { return +acc + +next.amount }, 0)
                item.amount = totalAmount;
                const buyAvgPrice = item.historyList.reduce((acc, next) => {return +acc + +next.price}, 0) / item.historyList?.length;
                item.buyAvgPrice = buyAvgPrice;
                item.cryptoHoldings = item.amount * item.currentPrice;
            })
            fs.writeFileSync('portfolios.json', JSON.stringify(allData));
            return currentPortfolio
        } catch (e) {
            console.log(e.message)
            return currentPortfolio
        }
    } else {
        return null;
    }
}

const addToPortfolio = async (id, data) => {
    const nData = data;
    let res = fs.readFileSync('portfolios.json');
    let allData = JSON.parse(res);
    const currentPortfolio = allData.find((item) => +item.id === +id);
    const currentToken = currentPortfolio?.tokenList?.find((item) => item.cryptocurrencyId === nData.cryptocurrencyId)
    if (currentToken) {
        currentToken.historyList = [...currentToken.historyList, {...nData, timestamp:  nData.timestamp ? nData.timestamp : Date.now()}]
    } else {
        currentPortfolio?.tokenList.push(handleJson(nData))
    }
    fs.writeFileSync('portfolios.json', JSON.stringify(allData));
    return true;
}

const getAllTimeShotCharts = async (id) => {
    const day = await getAllChartsValues(id, 1, '1', 288, 300000);
    const week = await getAllChartsValues(id, 7, 'hour', 168, 3600000);
    const month = await getAllChartsValues(id, 30, 'daily', 30, 86400000);
    const quarter = await getAllChartsValues(id, 90, 'daily', 90, 86400000);
    const all = await getAllChartsValues(id, 'max', 'daily', 2437, 259200000);
    const dayData = day?.filter(e => e && e[1]);
    const weekData = week?.filter(e => e && e[1]);
    const monthData = month?.filter(e => e && e[1]);
    const quarterData = quarter?.filter(e => e && e[1]);
    const allData = all?.filter(e => e && e[1]);
    weekData.push(dayData[dayData.length - 1])
    monthData.push(dayData[dayData.length - 1])
    quarterData.push(dayData[dayData.length - 1])
    allData.push(dayData[dayData.length - 1])
    return {
        historyChart24h: dayData,
        historyChart7d:  weekData,
        historyChart1m:  monthData,
        historyChart3m:  quarterData,
        historyChart1y:  allData,
    }
}

module.exports = {
    getAllTokens,
    searchTokens,
    getChartValue,
    getAllChartsValues,
    getPortfolio,
    addToPortfolio,
    getAllTimeShotCharts,
}
