import * as cron from 'node-cron';
import {scrapeWebsite, scrapingAllFiles} from './fetchingFiles';
import StandardiserInterface from '../components/standardiserInterface';

/**
 * To automate the scraping method, i used cron to trigger the scrapingWebsite method once every week
 * on Sunday 12am. After the files are fetched, the standardiserInterface class will be called to assign
 * each file a csv key that would be used for identifying each files so that they could be processed.
 * So if it was 12am sunday and function has been successfully triggered, a 'successful' message would be displayed,
 * if not an error message would be displayed.
 * To schedule weekly change it to ('0 0 * * 0')
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
