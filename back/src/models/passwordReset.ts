import mongoose from 'mongoose';

const Schema = mongoose.Schema;

let PasswordReset = new Schema({
    kor_ime: String,
    token: String,
    expiresAt: Date,
    used: Boolean
});

export default mongoose.model('PasswordResetModel', PasswordReset, 'resetLozinke');
