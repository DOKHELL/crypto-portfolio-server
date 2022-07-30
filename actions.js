const axios = require("axios");
const fs = require("fs");
const userSchema = require('./schemas/user-schema')
const { handleJson, findUser, recalculatePortfoliosPrise } = require("./helpers");


const getAllTokens = async () => {
    try {
        const res = await axios.get('https://api.coingecko.com/api/v3/search')
        const data = res.data?.coins?.map((t) => ({ name: t.name, symbol: t.symbol, cryptocurrencyId: t.id, image: t.large || t.thumb }))
        fs.writeFileSync('allTokens.json', JSON.stringify(data));
    } catch (e) {
        console.log('err')
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
        console.log('err')
    }
}
const changePortfolioName = async (obj, portfolioId, newName) => {
    const currentUser = await findUser(obj.email)
    const currentPortfolio = currentUser.portfolios.filter(item => +item.id === +portfolioId)[0]

    currentPortfolio.name = newName

    await userSchema.findOneAndUpdate({email: obj.email}, currentUser)

    return true
}

const createPortfolio = async (obj,data) => {
    try{
        const currentUser = await findUser(obj.email)
        const dataForCreating = { name: data.name,id:Math.floor(Math.random() * 10**6), cryptocurrencies: []}
        currentUser.portfolios.push(dataForCreating)
    
        const result = await userSchema.findOneAndUpdate({email: obj.email}, currentUser,{new: true})

        console.log(recalculatePortfoliosPrise(currentUser.portfolios));

        return result
    }catch(e) {
        return e
    }
}

const getChartValue = async (currentToken, days = 1, interval, name) => {
    try {
        const res = await axios.get(`https://api.coingecko.com/api/v3/coins/${name}/market_chart?vs_currency=USD&days=${days}&interval=${interval}`)
        const prices = res?.data?.prices;
        let differentTime = 350;
        if (days === 7) {
            differentTime = 4900
        }
        if (days === 30 || days === 90) {
            differentTime = 149000
        }
        if ( days === "max") {
            differentTime = 299000
        }
        const calculatedData = prices.map(item => {
            const total = currentToken.historyList.reduce((acc, next) => {
                if (next.timestamp - differentTime <= item[0]) {
                    return acc + (item[1] * next.amount);
                } else return acc;
            }, 0)
            return [item[0], total]
        })
        return calculatedData.filter((o) => o);
    } catch (e) {
        console.log('err')
        return [];
    }
}


const getAllChartsValues = async (obj, days = 1, interval,id) => {
    try {
        // let res = fs.readFileSync('portfolios.json');
        // let allData = JSON.parse(res);
        // const currentPortfolio = allData.find((item) => +item.id === +id);
        const currentUser = await findUser(obj.email)
        const currentPortfolio = currentUser.portfolios.filter(item => +item.id === +id)[0]
    
        let portfolio = currentPortfolio || currentUser.portfolios[0]

        let result = []
       
        for await (let currentToken of portfolio.cryptocurrencies) {
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
        console.log('err',e)
    }
}

const removeTransaction = async (obj, data,id) => {
    const nData = data;
    
    const currentUser = await findUser(obj.email)
    const currentPortfolio = currentUser.portfolios.filter(item => +item.id === +id)[0]
    
    let portfolio = currentPortfolio || currentUser.portfolios[0]
    const currentToken = portfolio.cryptocurrencies?.find((item) => item.cryptocurrencyId === nData.cryptocurrencyId)
    
    currentToken.historyList = currentToken.historyList.filter(item => item.id !== nData.id)
    
    await userSchema.findOneAndUpdate({email: obj.email}, currentUser)

    return true
}

const getPortfolio = async (obj,id) => {
    
    try{
        const currentUser = await findUser(obj.email)
        const currentPortfolio = currentUser.portfolios.filter(item => +item.id === +id)[0]
    
        let portfolio = currentPortfolio || currentUser.portfolios[0]

    if (currentUser) {
    
            const allIds = portfolio.cryptocurrencies.map(item => item.cryptocurrencyId);
            const resPrice = await axios.get(`https://api.coingecko.com/api/v3/simple/price?ids=${allIds.join(',')}&vs_currencies=usd`)
            const res = await axios.get(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${allIds.join(', ')}&order=market_cap_desc&per_page=100&page=1&sparkline=false`)
            const actualPrices = resPrice.data;
            const actualInfo = res.data;
            portfolio.cryptocurrencies.forEach(item => {
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
                const filterBuyAvgPriceByType = item.historyList.filter(item => item.type === 'Buy')
                const buyAvgPrice = item.historyList.reduce((acc, next) => {
                    if (next.type === 'Buy') {
                        return +acc + +next.price
                    }

                    return acc
                }, 0) / filterBuyAvgPriceByType?.length;
                item.buyAvgPrice = buyAvgPrice;
                item.cryptoHoldings = item.amount * item.currentPrice;
            })
    
            recalculatePortfoliosPrise(currentUser.portfolios);
            return currentUser.portfolios
    } else {
        return null;
    }
    }
    catch(err) {
        console.log(err);
    }
}

const changeTransaction = async (obj, data,idPortfolio) => {
    const nData = data;
    const currentUser = await findUser(obj.email)
    const currentPortfolio = currentUser.portfolios.filter(item => +item.id === +idPortfolio)[0]
    
    let portfolio = currentPortfolio || currentUser.portfolios[0]
    const currentToken = portfolio.cryptocurrencies?.find((item) => item.cryptocurrencyId === nData.cryptocurrencyId)
    let indexToken = null
     currentToken.historyList.find((item,index) => {

        if(item.id === nData.id) {
            indexToken = index
        }
     })
     
     currentToken.historyList[indexToken].timestamp = nData.timestamp
     currentToken.historyList[indexToken].price = nData.price
     currentToken.historyList[indexToken].amount = nData.amount
    
     await userSchema.findOneAndUpdate({email: obj.email}, currentUser,)
    
    return currentUser.portfolios
}
const removePortfolio = async (obj, id) => {
    const currentUser = await findUser(obj.email);
    const filterPortfolios = currentUser.portfolios.filter(item => +item.id !== +id)
    console.log(filterPortfolios);
    currentUser.portfolios = filterPortfolios

    await userSchema.findOneAndUpdate({email: obj.email}, currentUser)

    return true;

}

const removeToken = async (obj, tokenId,id) => {
    const currentUser = await findUser(obj.email);
    const currentPortfolio = currentUser.portfolios.filter(item => +item.id === +id)[0]
    
    let portfolio = currentPortfolio || currentUser.portfolios[0]
    const filterData = portfolio.cryptocurrencies.filter(item => {
        return item.cryptocurrencyId !== tokenId
    })
    console.log(filterData);
    portfolio.cryptocurrencies = filterData

    await userSchema.findOneAndUpdate({email: obj.email}, currentUser,)

    return true;
}


const addToPortfolio = async (obj, data, id) => {
    const nData = data;
    const currentUser = await findUser(obj.email)
    const currentPortfolio = currentUser.portfolios.filter(item => +item.id === +id)[0]
    
        let portfolio = currentPortfolio || currentUser.portfolios[0]
    const currentToken = portfolio.cryptocurrencies?.find((item) => item.cryptocurrencyId === nData.cryptocurrencyId)
    if (currentToken) {
        const data = {...currentToken}
    
         data.historyList = [...data.historyList, {...nData, id: Math.floor(Math.random() * 100000 * Date.now())}]
    
         portfolio.cryptocurrencies.forEach(item => {
            if(item.cryptocurrencyId === nData.cryptocurrencyId) {
                item.historyList = data.historyList
            
            }
         })

        await userSchema.findOneAndUpdate({email: obj.email}, currentUser)
    } else {
        const hr = handleJson(nData)
       portfolio.cryptocurrencies.push(hr) // add
       const newData = {
        ...currentUser,
       }
      await userSchema.findOneAndUpdate({email: obj.email}, newData,)
    }
    return true;
}

const getAllTimeShotCharts = async (obj, period,id) => {
    const interval = period === 1 ? '1' : period === 7 ? 'hour' : 'daily';
    const data = await getAllChartsValues(obj, period, interval,id);
    const finalData = data?.filter(e => e && e[1]);
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
    removeTransaction,
    removeToken,
    changeTransaction,
    createPortfolio,
    removePortfolio,
    changePortfolioName,
}
