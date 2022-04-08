const axios = require('axios');
const fs = require('fs');

const handleJson = (item) => {
    return {
        amount: item.amount,
        buyAvgPrice: 0,
        cryptoHoldings: 0,
        cryptocurrencyId: item.cryptocurrencyId,
        priceChangePercentage24h: 0,
        name: item.name,
        symbol: item.symbol,
        historyList: [item]
    }
}

const getAllTokens = async () => {
    try {
        const res = await axios.get('https://s3.coinmarketcap.com/generated/core/crypto/cryptos.json')
        const data = res.data?.values.map((t) => ({ name: t[1], cryptocurrencyId: t[2], image: `https://s2.coinmarketcap.com/static/img/coins/64x64/${t[0]}.png` }))
        fs.writeFileSync('allTokens.json', JSON.stringify(data));
    } catch (e) {
        console.log(e)
    }
}


const searchTokens = (v) => {
    try {
        const value = v.toLowerCase()
        let tokens = fs.readFileSync('allTokens.json');
        let allTokens = JSON.parse(tokens);
        const result = allTokens.filter((t) => t.name.toLowerCase().includes(value) || t.cryptocurrencyId.toLowerCase().includes(value))
        return result?.slice(0, 10);
    } catch (e) {
        console.log(e)
    }
}

// let res1 = fs.readFileSync('sdfsdf.json');
// let allData1 = JSON.parse(res1);
// allData1 = allData1.map((o) => {
//     o.timestamp = new Date(o.timestamp).getTime();
//     return [o.timestamp, o.value];
// })
// console.log(allData1)
// fs.writeFileSync('sdfsdf123.json', JSON.stringify(allData1));

const updatePortfolioHistory = (frame, count) => {
    let res = fs.readFileSync('portfolios.json');
    let resCharts = fs.readFileSync('historyChart.json');
    let allData = JSON.parse(res);
    let chartData = JSON.parse(resCharts);
    const now = Date.now();
    allData.forEach((item) => {
        const totalPriceAllTokens = item.tokenList.reduce((acc, next) => { return +acc + next.cryptoHoldings }, 0)
        const chart = chartData.find(el => +el.id === +item.id);
        chart[`historyChart${frame}`] = chart[`historyChart${frame}`]?.slice(1, count)
        chart[`historyChart${frame}`].push([now, totalPriceAllTokens])
        })
    fs.writeFileSync('historyChart.json', JSON.stringify(chartData));
}

const updateCurrentPortfolioHistory = (frame, count, id) => {
    let res = fs.readFileSync('portfolios.json');
    let resCharts = fs.readFileSync('historyChart.json');
    let allData = JSON.parse(res);
    let chartData = JSON.parse(resCharts);
    const currentPortfolio = allData.find((item) => +item.id === +id);
    const currentChart = chartData.find((item) => +item.id === +id);
    const now = Date.now();
    const totalPriceAllTokens = currentPortfolio.tokenList.reduce((acc, next) => { return +acc + next.cryptoHoldings }, 0)
    currentChart[`historyChart${frame}`].push([now, totalPriceAllTokens])
    fs.writeFileSync('historyChart.json', JSON.stringify(chartData));
}

setInterval(() => {
    updatePortfolioHistory('24h', 288)
}, 300000)

setInterval(() => {
    updatePortfolioHistory('7d', 168)
}, 3600000)

setInterval(() => {
    updatePortfolioHistory('1m', 30)
    updatePortfolioHistory('3m', 90)
    getAllTokens()
}, 86400000)

setInterval(() => {
    updatePortfolioHistory('1y', 122)
}, 259200000)

const getChartValues = (id) => {
    let res = fs.readFileSync('historyChart.json');
    let allData = JSON.parse(res);
    const currentChart = allData.find((item) => +item.id === +id);
    if (currentChart) {
        return currentChart;
    } else {
        return null;
    }
}

const getPortfolio = async (id) => {
    let res = fs.readFileSync('portfolios.json');
    let allData = JSON.parse(res);
    const currentPortfolio = allData.find((item) => +item.id === +id);
    if (currentPortfolio) {
        try {
            const allIds = currentPortfolio.tokenList.map(item => item.cryptocurrencyId);
            const res = await axios.get(`https://api.nomics.com/v1/currencies/ticker?key=59406c366f371b65af67203e2783a902a74201e3&ids=${allIds.join(',')}&interval=1d,30d&convert=USD&per-page=1000&page=1`)
            // const res = await axios.get(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${allIds.join(', ')}&order=market_cap_desc&per_page=100&page=1&sparkline=false`)
            const actualPrices = res.data;
            // const images = imagesRes.data;
            currentPortfolio.tokenList.forEach(item => {
                const currentToken = actualPrices.find((e) => e.id === item.cryptocurrencyId);
                const actualPrice = +currentToken?.price;
                const actualImage = currentToken?.logo_url;
                const price_change_percentage_24h = +currentToken['1d']?.price_change_pct;
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
            console.log('Too many request')
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
        currentToken.historyList = [...currentToken.historyList, nData]
        // updateCurrentPortfolioHistory('24h', 288, id)
        // updateCurrentPortfolioHistory('7d', 168, id)
        // updateCurrentPortfolioHistory('1m', 30, id)
        // updateCurrentPortfolioHistory('3m', 90, id)
        // updateCurrentPortfolioHistory('1y', 122, id)
    } else {
        currentPortfolio?.tokenList.push(handleJson(nData))
    }
    fs.writeFileSync('portfolios.json', JSON.stringify(allData));
    return true;
}


const express = require('express');

const app = express()
const server = require('http').createServer(app);
const WebSocketServer = require('websocket').server;
const wsServer = new WebSocketServer({
    httpServer: server,
});
const bodyParser = require('body-parser');

app.use(function (req, res, next) {

    // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', '*');

    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    // res.setHeader('Access-Control-Allow-Credentials', true);

    // Pass to next layer of middleware
    next();
});

app.use(bodyParser.json({ extended: true }));

app.get('/get-portfolio', async (req, res) => {
    try {
        if (req.query?.id) {
            const p = await getPortfolio(req.query?.id)
            if (p) {
                res.send(JSON.stringify(p))
            }
            else throw Error('Портфолио не найдено')
        } else {
            throw Error('Не передано ID')
        }
    } catch (e) {
        res.send({ error: e.message })
    }
});

app.get('/chart-values', async (req, res) => {
    try {
        if (req.query?.id) {
            updateCurrentPortfolioHistory('24h', 288, req.query?.id)
            updateCurrentPortfolioHistory('7d', 168, req.query?.id)
            updateCurrentPortfolioHistory('1m', 30, req.query?.id)
            updateCurrentPortfolioHistory('3m', 90, req.query?.id)
            updateCurrentPortfolioHistory('1y', 122, req.query?.id)
            const p = await getChartValues(req.query?.id);
            if (p) {
                res.send(JSON.stringify(p))
            }
            else throw Error('Chart не найдено')
        } else {
            throw Error('Не передано ID')
        }
    } catch (e) {
        res.send({ error: e.message })
    }
});

app.post('/add-to-portfolio', async (req, res) => {
    try {
        if (!req.body.amount) throw Error('Не передано amount')
        if (!req.body.cryptocurrencyId) throw Error('Не передано cryptocurrencyId')
        if (!req.body.price) throw Error('Не передано price')
        if (!req.body.name) throw Error('Не передано name')
        if (!req.body.symbol) throw Error('Не передано symbol')
        if (req.query?.id) {
            const p = await addToPortfolio(req.query?.id, req.body)
            if (p) {
                res.send({ success: true })
            }
        } else {
            throw Error('Не передано ID')
        }
    } catch (e) {
        res.send({ error: e.message })
    }
});

wsServer.on('request', function(request) {
    const connection = request.accept(null, request.origin);

    connection.on('message', async function(message) {
        const response = JSON.parse(message.utf8Data)
        if (response.method === 'getPortfolio' && response.id) {
            setInterval(async () => {
                const p = await getPortfolio(1);
                connection.sendUTF(JSON.stringify({action: 'portfolio', data: p}));
            }, 30000)
        }
        if (response.method === 'getChartValues' && response.id) {
            setInterval(async () => {
                const p = await getChartValues(response.id);
                connection.sendUTF(JSON.stringify({action: 'chart', data: p}));
            }, 300000)
        }
        if (response.method === 'SearchToken' && response.value) {
            const p = searchTokens(response.value);
            connection.sendUTF(JSON.stringify({action: 'search', data: p}));
        }
    });
    connection.on('close', function(reasonCode, description) {
        console.log('Client has disconnected.');
    });
});


server.listen(5000, () => {
    console.log('We are live on ' + 5000);
});

