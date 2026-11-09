import mongoose from 'mongoose';

const promocijaSchema = new mongoose.Schema({
    id: String,
    naziv: String,
    objekatId: String,
    objekatNaziv: String,
    vaziOd: Date,
    vaziDo: Date,
    tipPopusta: String,
    popust: Number,
    sport: String
});

export default mongoose.model('PromocijaModel', promocijaSchema, 'promocije');
