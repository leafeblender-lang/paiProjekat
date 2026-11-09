try { process.loadEnvFile(); } catch { /* .env nije obavezan */ }

import cors from 'cors';
import express from 'express';
import mongoose from 'mongoose';
import adminRouter from './routes/admin.routes';
import objektiRouter from './routes/objekti.routes';
import userRouter from './routes/user.routes';

const app = express();

app.use(cors());
app.use(express.json({ limit: '20mb' }));

app.use('/user', userRouter);
app.use('/objekti', objektiRouter);
app.use('/admin', adminRouter);

app.get('/', (req, res) => {
    res.send('Hello world!');
});

const mongoUrl ='mongodb://127.0.0.1:27017/PIA';

mongoose.connect(mongoUrl).then(() => {
    app.listen(4000, () => console.log('Express running on port 4000!'));
}).catch(err => {
    console.log(err);
});
