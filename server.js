const express = require('express');
const {
    getAllTokens,
    searchTokens,
    getPortfolio,
    addToPortfolio,
    getAllTimeShotCharts,
} = require('./actions')

setInterval(() => {
    getAllTokens()
}, 86400000)

const app = express()
const server = require('http').createServer(app);
const WebSocketServer = require('websocket').server;
const wsServer = new WebSocketServer({
    httpServer: server,
});
const bodyParser = require('body-parser');

app.use(function (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', '*');
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
            const p = await getAllTimeShotCharts(req.query?.id)
            res.send(JSON.stringify(p));
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
    console.log('Client has connected.');
    connection.on('message', async function(message) {
        const response = JSON.parse(message.utf8Data)
        if (response.method === 'getPortfolio' && response.id) {
            setInterval(async () => {
                const p = await getPortfolio(1);
                connection.sendUTF(JSON.stringify({action: 'portfolio', data: p}));
            }, 300000)
        }
        if (response.method === 'getChartValues' && response.id) {
            setInterval(async () => {
                const p = await getAllTimeShotCharts(response.id)
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

