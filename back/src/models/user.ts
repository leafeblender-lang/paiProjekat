import mongoose from 'mongoose';

const Schema = mongoose.Schema;

let User = new Schema({
    kor_ime: String, 
    lozinka: String,
    ime: String,
    prezime: String,
    telefon: String,
    mejl: String,
    tip: String,
    profilnaSlika: String,
    sportovi: [String],
    firmaId: String,
    status: String
});

export default mongoose.model('UserModel', User, 'korisnici');
