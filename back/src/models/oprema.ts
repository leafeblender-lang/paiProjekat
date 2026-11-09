import mongoose from 'mongoose';

const opremaSchema = new mongoose.Schema({
    id: {
        type: String,
        required: true,
        unique: true
    },
    firmaId: {
        type: String,
        required: true,
        index: true
    },
    objekatId: String,
    naziv: String,
    cena: Number,
    zalihe: Number,
    sport: String,
    slika: String
});

export default mongoose.model('OpremaModel', opremaSchema, 'oprema');
