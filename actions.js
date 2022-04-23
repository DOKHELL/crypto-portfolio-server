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
                if (days === 1) {
                    if (next.timestamp - 300000 <= item[0]) {
                        return acc + item[1] * next.amount;
                    } else return 0;
                }
                if (days === 7) {
                    if (next.timestamp - 3000000 <= item[0]) {
                        return acc + item[1] * next.amount;
                    } else return 0;
                }
                if (days === 'max') {
                    if (next.timestamp - 3000000 <= item[0]) {
                        return acc + item[1] * next.amount;
                    } else return 0;
                } else if (next.timestamp - 3000000 <= item[0]) {
                    return acc + item[1] * next.amount;
                }
                return 0;
            }, 0)
            return [item[0], total]
        })
        if (days === 'max') {
            return calculatedData.filter((o) => o && !!o[1]);
        }
        return calculatedData.filter((o) => o);
    } catch (e) {
        console.log(e)
        return [];
    }
}


const getAllChartsValues = async (id, days = 1, interval) => {
    try {
        let res = fs.readFileSync('portfolios.json');
        let allData = JSON.parse(res);
        const currentPortfolio = allData.find((item) => +item.id === +id);
        let result = []
        for await (let currentToken of currentPortfolio?.tokenList) {
            let res = await getChartValue(currentToken, days, interval, currentToken.cryptocurrencyId)
            result.push(res)
        }
        const maxArr = result.sort((o, n) => n.length - o.length)[0];
        const maxLength = maxArr.length
        result = result.map((o) => {
            if (o.length < maxLength) {
                for (let i = 0; o.length < maxLength; i++) {
                  o.unshift([maxArr[i][0], o[0] ? o[0][1] : 0])
                }
                return o;
            }
            return o;
        })
        if (days === 'max') {
            console.log(maxLength)
        }
        const fullResult = result.reduce((acc, next, index) => {
            if (index === 0) {
                acc = next;
                return acc;
            }
            acc = acc.map((p, inx) => {
                if (p[1] && next[inx]) {
                    return [p[0], +p[1] + +next[inx][1]]
                }
                return p;
            })
            return acc;
        }, [])
        return fullResult;
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

const removeToken = async (id, tokenId) => {
    let res = fs.readFileSync('portfolios.json');
    let allData = JSON.parse(res);
    let currentPortfolio = allData.find((item) => +item.id === +id);
    currentPortfolio = currentPortfolio?.tokenList?.filter((item) => item.cryptocurrencyId !== tokenId)
    fs.writeFileSync('portfolios.json', JSON.stringify(allData));
    return true;
}

const getAllTimeShotCharts = async (id, period) => {
    const interval = period === 1 ? '1' : period === 7 ? 'hour' : 'daily';
    const data = await getAllChartsValues(id, period, interval);
    // const day = await getAllChartsValues(id, 1, '1');
    // const week = await getAllChartsValues(id, 7, 'hour');
    // const month = await getAllChartsValues(id, 30, 'daily');
    // const quarter = await getAllChartsValues(id, 90, 'daily');
    // const all = await getAllChartsValues(id, 'max', 'daily');
    const finalData = data?.filter(e => e && e[1]);
    // const dayData = day?.filter(e => e && e[1]);
    // const weekData = week?.filter(e => e && e[1]);
    // const monthData = month?.filter(e => e && e[1]);
    // const quarterData = quarter?.filter(e => e && e[1]);
    // const allData = all?.filter(e => e && e[1]);
    // weekData.push(dayData[dayData.length - 1])
    // weekData.push(dayData[dayData.length - 1])
    // monthData.push(dayData[dayData.length - 1])
    // quarterData.push(dayData[dayData.length - 1])
    // allData.push(dayData[dayData.length - 1])
    // return {
    //     historyChart24h: dayData,
    //     historyChart7d:  weekData,
    //     historyChart1m:  monthData,
    //     historyChart3m:  quarterData,
    //     historyChart1y:  allData,
    // }
    return {
        historyChart: finalData,
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
    removeToken,
}
