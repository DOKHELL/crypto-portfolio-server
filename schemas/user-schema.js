const mongoose = require('mongoose')


const userSchema = mongoose.Schema({
    email: String,
    name: String,
    picture: String,
    portfolios: Array
})

module.exports = mongoose.model('users', userSchema)