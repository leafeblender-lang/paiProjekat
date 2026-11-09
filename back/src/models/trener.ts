import mongoose from 'mongoose';

const trenerSchema = new mongoose.Schema({
    id: String,
    objekatId: [String],
    ime: String,
    sport: String,
    specijalizacija: String,
    prosecnaOcena: Number,
    cenaPoSatu: Number,
    status: {
            type: String,
            enum: ['aktivan', 'neaktivan'], 
            default: 'aktivan'
        }
});

export default mongoose.model('TrenerModel', trenerSchema, 'treneri');
