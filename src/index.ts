import express from 'express';
// For good security defaults.
import helmet from 'helmet';

const app = express();

// Import and use routes.
import approvedRoute from './routes/approved';
app.use('/approved', approvedRoute);

import submitRoute from './routes/submit';
app.use('/submit', submitRoute);

import uploadRoute from './routes/upload';
app.use('/upload', uploadRoute);

export default app;
