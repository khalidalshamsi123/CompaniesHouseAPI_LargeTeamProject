import * as dotenv from 'dotenv';

import type express from 'express';

dotenv.config();

const isAuthorised = (req: express.Request, res: express.Response, next: express.NextFunction) => {
	const apiKey = req.header('x-api-key');
	if (!apiKey) {
		res.status(401).json({message: 'Missing API Key In Headers.'});
	} else if (apiKey === process.env.API_KEY) {
		// Authorized.
		next();
	} else {
		res.status(401).json({message: 'Invalid API Key Provided.'});
	}
};

export default isAuthorised;
