const express = require('express');
const jwtDecode = require('jwt-decode')
// const mongoose = require('mongoose')
const userSchema = require('./schemas/user-schema')
const {
    getAllTokens,
    searchTokens,
    findPortfolio,
    removeToken,
    addToPortfolio,
    getAllTimeShotCharts,
    removeTransaction,
    changeTransaction,
    createPortfolio,
    removePortfolio,
    changePortfolioName,
    getPortfolios,
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

app.post('/check-user', async (req, res) => {
    try{
        const decode = jwtDecode(req.headers.token)
        const result = await userSchema.findOne({email: decode.email})
        const initData = [{name: 'Main Portfolio',id:Math.floor(Math.random() * 10**6), cryptocurrencies: []}]

        const sendData = {
            email: result?.email || decode.email,
            name: result?.name || decode.name,
            picture: result?.picture || decode.picture,
        }


        if(!result) {
            const dataForCreating = {...sendData, portfolios: initData}
            await new userSchema(dataForCreating).save()
            res.send(dataForCreating)

        }else{
            res.send(sendData)
        }
    }catch(e) {
        console.log('70','err');
        res.send(e)
    }
})
app.post('/create-portfolio', async (req, res) => {
    try {
        const decode = jwtDecode(req.headers.token)
        if (decode) {
            const response = await createPortfolio(decode,req.body)
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
})

app.get('/get-portfolios', async (req, res) => {
    try {
        const decode = jwtDecode(req.headers.token)
        if (decode) {
            const response = await getPortfolios(decode)
            if (response) {
                res.send(JSON.stringify(response))
            }
            else throw Error('Портфолио не найдено')
        } else {
            throw Error('Не передано token')
        }
    }catch(e) {
        res.send({ error: e.message })
    }
})

app.get('/find-portfolio', async (req, res) => {
    try {
        const decode = jwtDecode(req.headers.token)
        if (decode && req.query.id) {
            const response = await findPortfolio(decode,req.query.id)
            if (response) {
                res.send(JSON.stringify(response))
            }
            else throw Error('Портфолио не найдено')
        } else {
            throw Error('Не передано token или id')
        }
    } catch (e) {
        res.send({ error: e.message })
    }
});
app.post('/change-portfolio-name', async (req, res) => {
    try{
        if (req.headers?.token && req.query?.id) {
            const decode = jwtDecode(req.headers.token)
            const p = await changePortfolioName(decode,req.query.id, req.body.newName)
            res.send(JSON.stringify(p));
        } else {
            throw Error('Не передан token или id')
        }
    }catch(e) {
        res.send({ error: e.message })
    }
})

app.get('/chart-values', async (req, res) => {
    try {
        if (req.headers?.token && req.query?.period && req.query?.id) {
            const decode = jwtDecode(req.headers.token)
            const p = await getAllTimeShotCharts(decode, req.query?.period === 'max' ? req.query?.period : Number(req.query?.period),req.query.id)
            res.send(JSON.stringify(p));
        } else {
            throw Error('Не передан token или period или id')
        }
    } catch (e) {
        res.send({ error: e.message })
    }
});

app.post('/change-transaction', async (req, res) => {
    try{
        if(!req.body.cryptocurrencyId) throw Error('Не передано cryptocurrencyId')
        if(!req.query.id) throw Error('Не передан id')
        if (req.query?.token) {
            const decode = jwtDecode(req.headers.token)
           const p = await changeTransaction(decode,req.body,req.query.id)
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
        if (req.headers?.token && req.query?.id) {
            const decode = jwtDecode(req.headers.token)
           const p = await removeTransaction(decode,req.body,req.query.id)
           if (p) {
            res.send({ success: true })
           }
        } else {
            throw Error('Не передан token или id')
        }
    }catch(e) {
        res.send({ error: e.message })
    }
})
app.post('/remove-portfolio', async (req, res) => {

    try{
        if (req.headers?.token && req.query?.id) {
            const decode = jwtDecode(req.headers.token)
            const p = await removePortfolio(decode, req.query.id)
            if (p) {
                res.send({ success: true })
            }
        } else {
            throw Error('Не передан token или id')
        }
    }catch (e) {
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
        if(!req.query.id) throw Error('Не передан id')
        if (req.headers?.token) {
            const decode = jwtDecode(req.headers.token)
            const p = await addToPortfolio(decode, req.body, req.query.id)
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
        if (!req.body.id) throw Error('Не передан id')
        if (req.headers?.token) {
            const decode = jwtDecode(req.headers.token)
            const p = await removeToken(decode, req.body.cryptocurrencyId,req.body.id)
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
        if (response.method === 'getPortfolio' && response.portfolioId && response.token) {
            const decode = jwtDecode(response.token)
            setInterval(async () => {
                const p = await getPortfolio(decode, response.portfolioId);
                connection.sendUTF(JSON.stringify({action: 'portfolio', data: p}));
            }, 60000) // 300000
            setInterval(async () => {
                const p = await getAllTimeShotCharts(decode, Number(response?.period), response.portfolioId)
                connection.sendUTF(JSON.stringify({action: 'chart', data: p.historyChart, period: response?.period}));
            }, 300000) //300000
        }
        // if (response.method === 'getChartValues' && response.id && response?.period) {
        //     setInterval(async () => {
        //         const p = await getAllTimeShotCharts(response.id, Number(response?.period))
        //         connection.sendUTF(JSON.stringify({action: 'chart', data: p}));
        //     }, 300000)
        // }
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

