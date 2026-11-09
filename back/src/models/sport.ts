import mongoose from 'mongoose';

const sportSchema = new mongoose.Schema({
    naziv: {
        type: String,
        required: true,
        unique: true
    }
});

export default mongoose.model('SportModel', sportSchema, 'sportovi');
