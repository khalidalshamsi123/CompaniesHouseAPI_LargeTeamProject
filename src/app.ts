import express from 'express';
import isAuthorised from './middleware/authentication';

const app = express();

// Import and use routes.
import approvedRoute from './routes/approved';
app.use('/approved', isAuthorised, approvedRoute);

import submitRoute from './routes/submit';
app.use('/submit', submitRoute);

import uploadRoute from './routes/upload';
app.use('/upload', isAuthorised, uploadRoute);

export default app;
