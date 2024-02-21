import app from './index';

import * as dotenv from 'dotenv';

dotenv.config();

// Configure port and start listening for requests.
const port = process.env.port ?? 5000;

app.listen(port, () => {
	console.log(`Listening on port ${port}.`);
});
