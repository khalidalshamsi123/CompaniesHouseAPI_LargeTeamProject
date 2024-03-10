import express from 'express';
// For good security defaults.
import helmet from 'helmet';
import multer from 'multer';
import isAuthorised from "./middleware/authentication";

const upload = multer({ dest: 'uploads/' });

const app = express();

// Import and use routes.
import approvedRoute from './routes/approved';
app.use('/approved',isAuthorised, approvedRoute);

import submitRoute from './routes/submit';
app.use('/submit', submitRoute);

import uploadRoute from './routes/upload';

app.use('/upload',isAuthorised,upload.array('files'), uploadRoute);

export default app;
