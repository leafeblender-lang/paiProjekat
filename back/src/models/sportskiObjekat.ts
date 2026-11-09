import mongoose from 'mongoose';

const terenSchema = new mongoose.Schema({
    naziv: String,
    sport: String,
    tip: String,
    vrsta: String,
    kapacitet: Number,
    opisOpreme: String,
}, { _id: false });

const sportskiObjekatSchema = new mongoose.Schema({
    id: String,
    naziv: String,
    grad: String,
    adresa: String,
    aktivan: Boolean,
    status: {
                type: String,
                enum: ['na cekanju', 'aktivan', 'odbijen']
            },
    uneo: String,
    lajkovi: Number,
    dislajkovi: Number,
    sportovi: Array,
    tipoviTerena: Array, 
    cenaRezervacijePoSatu: Number,
    radnoVremeOd: String,
    radnoVremeDo: String,
    dozvoljeniNedolasci: Number,
    tereni: [terenSchema],
    galerijaSlika: [String],
    firmaId: String
}, { _id: false });


export default mongoose.model('SportskiObjekatModel', sportskiObjekatSchema, 'sportskiObjekti');
