const fs = require('fs');

const getPortfolio = (id) => {
    let res = fs.readFileSync('portfolios.json');
    let allData = JSON.parse(res);
    const currentPortfolio = allData.find((item) => +item.id === +id);
    if (currentPortfolio) {
        return currentPortfolio;
    } else {
        return null;
    }
}

const addToPortfolio = (id, data) => {
    const nData = data;
    let res = fs.readFileSync('portfolios.json');
    let allData = JSON.parse(res);
    const currentPortfolio = allData.find((item) => +item.id === +id);
    const currentToken = currentPortfolio?.tokenList?.find((item) => +item.cryptocurrencyId === +nData.cryptocurrencyId)
    currentToken.historyList = [...currentToken.historyList, nData]
    fs.writeFileSync('portfolios.json', JSON.stringify(allData));
    return true;
}

module.exports = function(app, db) {
    app.get('/get-portfolio', async (req, res) => {
        try {
            if (req.query?.id) {
                const p = getPortfolio(req.query?.id)
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
            if (!res.body.amount) throw Error('Не передано amount')
            if (!res.body.cryptocurrencyId) throw Error('Не передано cryptocurrencyId')
            if (!res.body.price) throw Error('Не передано price')
            if (req.query?.id) {
                const p = addToPortfolio(req.query?.id, req.body)
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
};






