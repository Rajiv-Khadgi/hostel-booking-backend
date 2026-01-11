import express from 'express';
import cors from 'cors';
import { initDB } from './config/database.js';
import apiRoutes from './routes/api.js';
import path from 'path';


const app = express();

app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));


app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.use('/api', apiRoutes);

app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

export default app;
