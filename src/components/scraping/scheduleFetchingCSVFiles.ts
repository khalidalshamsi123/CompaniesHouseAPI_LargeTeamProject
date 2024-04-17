import * as cron from 'node-cron';
import {scrapeWebsite, scrapingAllFiles} from './fetchingFiles';
import StandardiserInterface from '../standardiserInterface';

/**
 * To automate the scraping method, i used cron to trigger the scrapingWebsite method once every week
 * on Sunday 12am. To schedule weekly change it to ('0 0 * * 0')
 */
function scheduleFetching() {
	cron.schedule('*/5 * * * * *', async () => {
		try {
			await scrapingAllFiles();
		} catch (error) {
			console.error('An error occurred while trying to automate the scraping function:', error);
		}
	});
}

export {scheduleFetching};
