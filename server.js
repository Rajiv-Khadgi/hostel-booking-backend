import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';
import { initDB } from './config/database.js';

const PORT = process.env.PORT || 8081;

async function startServer() {
    try {
        await initDB();
        app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
            console.log('Health check: http://localhost:' + PORT + '/health');
        });
    } catch (error) {
        console.error('Server startup failed:', error.message);
        process.exit(1);
    }
}

startServer();
