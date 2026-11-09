import mongoose from 'mongoose';

const kaznaSchema = new mongoose.Schema({
    objekatId: String,
    kor_ime: String,
    nedolasci: Number,
    blokiran: Boolean
});

export default mongoose.model('KaznaModel', kaznaSchema, 'kazne');
