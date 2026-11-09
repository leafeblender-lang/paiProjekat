import mongoose from 'mongoose';

const ocenaSchema = new mongoose.Schema({
    id: String,
    objekatId: String,
    objekatNaziv: String,
    kor_ime: String,
    reakcija: String,
    komentar: String,
    datum: Date
});

export default mongoose.model('OcenaModel', ocenaSchema, 'ocene');
