import * as cron from 'node-cron';
import {scrapeWebsite} from './fetchingFiles';
import {Router} from 'express';
import {EventEmitter} from 'events';
import {insertDataStandardiser} from '../database/insertDataStandardiser';
import StandardiserInterface from '../components/standardiserInterface';

const router = Router();
const eventEmitter = new EventEmitter();
/**
 * To automate the scraping method, i used cron to trigger the scrapingWebsite method once every week
 * on Sunday 12am. After the files are fetched, the standardiserInterface class will be called to assign
 * each file a csv key that would be used for identifying each files so that they could be processed.
 * The event emmiters are used to send the API route a message that would signify the status the function.
 * So if it was 12am sunday and function has been successfully triggered, a 'successful' message would be displayed,
 * if not an error message would be displayed.
 */
cron.schedule('0 0 * * 0', async () => {
	try {
		await scrapeWebsite('#main-content > div > div > div > div > div:nth-child(7) > div > div > div.doc-content.govuk-\\!-margin-bottom-0 > p.gcweb-body.govuk-\\!-margin-bottom-3 > a', 'https://www.gamblingcommission.gov.uk/public-register/businesses/download');
		await scrapeWebsite('#main-content > div > div > div > div > div:nth-child(10) > div > div > div.doc-content.govuk-\\!-margin-bottom-0 > p.gcweb-body.govuk-\\!-margin-bottom-3 > a', 'https://www.gamblingcommission.gov.uk/public-register/businesses/download');
		await scrapeWebsite('#contents > div.gem-c-govspeak.govuk-govspeak > div > p:nth-child(13) > span > a', 'https://www.gov.uk/guidance/money-laundering-regulations-supervised-business-register');
		const standardiserInterface = new StandardiserInterface();
		await standardiserInterface.processCsvKeys(['businessesCsv', 'licencesCsv'], 'registration_schema');
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
