import {Router} from 'express';
import {scrapeWebsite} from '../scraping/fetchingFiles';
const router = Router();

router.get('/', (req, res) => {
	res.send('Success').status(200);
});

router.get('/scrapeTest', async (req, res) => {
	await scrapeWebsite('#main-content > div > div > div > div > div:nth-child(7) > div > div > div.doc-content.govuk-\\!-margin-bottom-0 > p.gcweb-body.govuk-\\!-margin-bottom-3 > a', 'https://www.gamblingcommission.gov.uk/public-register/businesses/download');
	res.sendStatus(200);
	// Res.send(hmrcCsvReader('hmrc-supervised-data-test-data.csv', 'BUSINESS_NAME', 'STATUS1')).status(200);
});

export default router;
