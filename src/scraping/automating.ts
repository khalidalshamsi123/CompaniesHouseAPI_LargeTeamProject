import * as cron from 'node-cron';
import {scrapeWebsite} from './fetchingFiles';
import {Router} from 'express';

const router = Router();
// eslint-disable-next-line @typescript-eslint/no-unsafe-call
cron.schedule('*/10 * * * * *', async () => {
	try {
	// Execute your function/module here
		await scrapeWebsite('#main-content > div > div > div > div > div:nth-child(7) > div > div > div.doc-content.govuk-\\!-margin-bottom-0 > p.gcweb-body.govuk-\\!-margin-bottom-3 > a', 'https://www.gamblingcommission.gov.uk/public-register/businesses/download');
		await scrapeWebsite('#contents > div.gem-c-govspeak.govuk-govspeak > div > p:nth-child(13) > span > a', 'https://www.gov.uk/guidance/money-laundering-regulations-supervised-business-register');
	} catch (error) {
		console.error('An error occurred while trying to automate the scraping function:', error);
	}
});

router.get('/', (req, res) => {
	res.send('Fetching Files...');
});

export default router;
