import * as dotenv from 'dotenv'
import express from 'express'
// For good security defaults.
import helmet from 'helmet'

const app = express();
dotenv.config();

// Import and use routes.
import formRoute from './routes/form'
app.use('/form', formRoute)

// Configure port and start listening for requests.
const PORT = process.env.port || 5000

app.listen(PORT, () => console.log(`Listening on port ${PORT}.`));