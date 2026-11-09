import mongoose from 'mongoose';

const terminSchema = new mongoose.Schema({
    id: String, 
    objekatId: String, 
    objekatNaziv: String, 
    terenNaziv: String,
    grad: String,
    sport: String,
    kor_ime: String,
    tip: String,
    pocetak: Date,
    kraj: Date,
    status: String,//odbijen, na cekanju, prihvacen, otkazan
    prisustvo: String,
    trenerId: String
});

export default mongoose.model('TerminModel', terminSchema, 'termini');