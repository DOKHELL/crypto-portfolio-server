const mongoose = require('mongoose')

const connectDB = async () => {
    try{
        const connect = await mongoose.connect('mongodb+srv://James:CAxLhtEMaN5Hm99M@cluster0.hv9tsff.mongodb.net/?retryWrites=true&w=majority', {
            useNewUrlParser: true,
            UseUnifiedTopology: true,
        })

        console.log('Mongodb connected');
    }catch(err) {
        console.log(err);
        process.exit(1)
    }
}

module.exports = connectDB