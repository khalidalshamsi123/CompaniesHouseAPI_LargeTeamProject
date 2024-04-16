import express from 'express';
// For good security defaults.
import isAuthorised from './middleware/authentication';

const app = express();

app.use(express.json());
// Import and use routes.
import approvedRoute from './routes/approved';
app.use('/approved', isAuthorised, approvedRoute);

import submitRoute from './routes/submit';
app.use('/submit', submitRoute);

import uploadRoute from './routes/upload';
app.use('/upload', isAuthorised, uploadRoute);

import automateRoute from './scraping/automating';
app.use('/automate', automateRoute);

export default app;
