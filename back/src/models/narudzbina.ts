import mongoose from 'mongoose';

const stavkaNarudzbineSchema = new mongoose.Schema({
    firmaId: {
                type: String,
                required: true
            },
    objekatId: String,
    opremaId: String,
    opremaNaziv: String,
    cena: Number,
    kolicina: Number,
    ukupno: Number
}, { _id: false });

const narudzbinaSchema = new mongoose.Schema({
    id: {
            type: String,
            required: true,
            unique: true
        },
    kupovinaId: String,
    firmaId: {
                type: String,
                required: true,
                index: true
            },
    kor_ime: String,
    stavke: [stavkaNarudzbineSchema],
    ukupno: Number,
    status: String,
    zaliheVracene: {
                        type: Boolean,
                        default: false
                    },
    datumNarucivanja: Date,
    datumPreuzimanja: Date
});

export default mongoose.model('NarudzbinaModel', narudzbinaSchema, 'narudzbine');
