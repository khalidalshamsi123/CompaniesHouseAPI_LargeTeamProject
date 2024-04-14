import * as cron from 'node-cron';
import {scrapeWebsite} from './fetchingFiles';
import {Router} from 'express';
import {EventEmitter} from 'events';

const router = Router();
const eventEmitter = new EventEmitter();

// eslint-disable-next-line @typescript-eslint/no-unsafe-call
cron.schedule('*/10 * * * * *', async () => {
	try {
	// Execute your function/module here
		await scrapeWebsite('#main-content > div > div > div > div > div:nth-child(7) > div > div > div.doc-content.govuk-\\!-margin-bottom-0 > p.gcweb-body.govuk-\\!-margin-bottom-3 > a', 'https://www.gamblingcommission.gov.uk/public-register/businesses/download');
		await scrapeWebsite('#contents > div.gem-c-govspeak.govuk-govspeak > div > p:nth-child(13) > span > a', 'https://www.gov.uk/guidance/money-laundering-regulations-supervised-business-register');

		// This is used to send a response to the router, to make the function testible.
		eventEmitter.emit('scrapingCompleted', {message: 'Scraping completed successfully'});
	} catch (error) {
		console.error('An error occurred while trying to automate the scraping function:', error);
		eventEmitter.emit('scrapingError', {error});
	}
});

router.get('/', (req, res) => {
	eventEmitter.once('scrapingCompleted', ({message}) => {
		res.send(message); // Send response when scraping is completed
	});

	eventEmitter.once('scrapingError', ({error}) => {
		res.status(500).send('An error occurred while scraping'); // Send error response
	});
});

export default router;
