import mongoose from 'mongoose';

const firmaSchema = new mongoose.Schema({
    id: String,
    naziv: String, 
    adresaSedista: String,     
    maticniBroj: String,     
    pib: String,
   
});

export default mongoose.model('FirmaModel', firmaSchema, 'firme');