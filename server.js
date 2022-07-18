const express = require('express');
const jwtDecode = require('jwt-decode')
// const mongoose = require('mongoose')
const userSchema = require('./schemas/user-schema')
const {
    getAllTokens,
    searchTokens,
    getPortfolio,
    removeToken,
    addToPortfolio,
    getAllTimeShotCharts,
    removeTransaction,
    changeTransaction,
} = require('./actions')

const connectDB = require('./db')

connectDB()

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

app.post('/auth', async (req, res) => {
    try{
        const result = await userSchema.findOne({email: req.body.email})
        

        const sendData = {
            email: result?.email,
            name: result?.name,
            picture: result?.picture,
            portfolios: result?.portfolios
        }
         
        
        if(!result) {
            const dataForCreating = {...req.body, portfolios: [{name: 'Main Portfolio',id:Math.floor(Math.random() * 10**6), cryptocurrencies: []}]}
            console.log('user was created');
            await new userSchema(dataForCreating).save()
            
            res.send(dataForCreating)
    
        }else{
            console.log(sendData);
            res.send(sendData)
        }
    }catch(e) {
        res.send(e)
    }
})

app.get('/get-portfolio', async (req, res) => {
    try {
        const decode = jwtDecode(req.query.token)
        if (decode) {
            const response = await getPortfolio(decode)
            if (response) {
                res.send(JSON.stringify(response))
            }
            else throw Error('Портфолио не найдено')
        } else {
            throw Error('Не передано token')
        }
    } catch (e) {
        res.send({ error: e.message })
    }
});

app.get('/chart-values', async (req, res) => {
    try {
        if (req.query?.token && req.query?.period) {
            const decode = jwtDecode(req.query.token)
            const p = await getAllTimeShotCharts(decode, req.query?.period === 'max' ? req.query?.period : Number(req.query?.period))
            res.send(JSON.stringify(p));
        } else {
            throw Error('Не передан token или period')
        }
    } catch (e) {
        res.send({ error: e.message })
    }
});

app.post('/change-transaction', async (req, res) => {
    try{
        if(!req.body.cryptocurrencyId) throw Error('Не передано cryptocurrencyId')
        if (req.query?.token) {
            const decode = jwtDecode(req.query.token)
           const p = changeTransaction(decode,req.body)
           if (p) {
            res.send({ success: true })
           }
        } else {
            throw Error('Не передан token')
        }
    }catch(e) {
        res.send({ error: e.message })
    }
})

app.post('/remove-transaction', async (req, res) => {
    try{
        if (req.query?.token) {
            const decode = jwtDecode(req.query.token)
           const p = removeTransaction(decode,req.body)
           if (p) {
            res.send({ success: true })
           }
        } else {
            throw Error('Не передан token')
        }
    }catch(e) {
        res.send({ error: e.message })
    }
})

app.post('/add-to-portfolio', async (req, res) => {
    try {
        if (!req.body.amount) throw Error('Не передано amount')
        if (!req.body.cryptocurrencyId) throw Error('Не передано cryptocurrencyId')
        if (!req.body.price) throw Error('Не передано price')
        if (!req.body.name) throw Error('Не передано name')
        if (!req.body.symbol) throw Error('Не передано symbol')
        if(!req.body.type) throw Error('Не передан type')
        if (req.query?.token) {
            const decode = jwtDecode(req.query.token)
            const p = await addToPortfolio(decode, req.body)
            if (p) {
                res.send({ success: true })
            }
        } else {
            throw Error('Не передано token')
        }
    } catch (e) {
        res.send({ error: e.message })
    }
});

app.post('/remove-token', async (req, res) => {
    try {
        if (!req.body.cryptocurrencyId) throw Error('Не передано cryptocurrencyId')
        if (req.query?.token) {
            const decode = jwtDecode(req.query.token)
            const p = await removeToken(decode, req.body.cryptocurrencyId)
            if (p) {
                res.send({ success: true })
            }
        } else {
            throw Error('Не передан token')
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
        if (response.method === 'getChartValues' && response.id && response?.period) {
            setInterval(async () => {
                const p = await getAllTimeShotCharts(response.id, Number(response?.period))
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

