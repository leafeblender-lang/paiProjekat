import mongoose from 'mongoose';

const zahtevSchema = new mongoose.Schema({
    kor_ime: String,
    status: String
}, { _id: false });

const oglasSchema = new mongoose.Schema({
    id: String,
    autor: String,
    sport: String,
    grad: String,
    datum: Date,
    terminOd: String,
    terminDo: String,
    brojIgraca: Number,
    status: String,
    zahtevi: [zahtevSchema],
    datumKreiranja: Date
});

export default mongoose.model('OglasModel', oglasSchema, 'oglasi');
