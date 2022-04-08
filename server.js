const axios = require('axios');

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
                const totalAmount = item.historyList.reduce((acc, next) => {return +acc + +next.amount}, 0)
                item.amount = totalAmount;
                const buyAvgPrice = item.historyList.reduce((acc, next) => {return +acc + +next.price}, 0) / item.historyList?.length;
                item.buyAvgPrice = buyAvgPrice;
                item.cryptoHoldings = item.amount * item.currentPrice;
            })
            fs.writeFileSync('portfolios.json', JSON.stringify(allData));
            return allData
        } catch (e) {
            console.log(e.message)
            return allData
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
const fs = require('fs');
const bodyParser = require('body-parser');

app.use(bodyParser.json({ extended: true }));

app.get('/get-portfolio', async (req, res) => {
    try {
        if (req.query?.id) {
            const p = await getPortfolio(req.query?.id)
            if (p) res.send(JSON.stringify(p))
            else throw Error('Портфолио не найдено')
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

function originIsAllowed(origin) {
    // put logic here to detect whether the specified origin is allowed.
    return true;
}

wsServer.on('request', function(request) {
    const connection = request.accept(null, request.origin);

    connection.on('message', async function(message) {
        const response = JSON.parse(message.utf8Data)
        if (response.method === 'getPortfolio' && response.id) {
            setInterval(async () => {
                const p = await getPortfolio(1);
                connection.sendUTF(JSON.stringify(p));
            }, 30000)
        }
    });
    connection.on('close', function(reasonCode, description) {
        console.log('Client has disconnected.');
    });
});


server.listen(5000, () => {
    console.log('We are live on ' + 5000);
});

