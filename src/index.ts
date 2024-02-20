import * as dotenv from 'dotenv';
import express from 'express';
// For good security defaults.
import helmet from 'helmet';

const app = express();
dotenv.config();

// Import and use routes.
import approvedRoute from './routes/approved';
app.use('/approved', approvedRoute);

import submitRoute from './routes/submit';
app.use('/submit', submitRoute);

import uploadRoute from './routes/upload';
app.use('/upload', uploadRoute);

// Configure port and start listening for requests.
const port = process.env.port ?? 5000;

app.listen(port, () => {
	console.log(`Listening on port ${port}.`);
});
