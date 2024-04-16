import request from 'supertest';
import app from '../app';
import {Router} from 'express';
import * as cron from 'node-cron';
import {scrapeWebsite} from '../scraping/fetchingFiles';
import {scheduleFetching} from '../scraping/scheduleFetchingCSVFiles';

jest.mock('../scraping/scheduleFetchingCSVFiles', () =>
	({
		scheduleFetching: jest.fn(),
	}),
);

describe('Given the scheduler is set to execute the function at a specified interval', () => {
	describe('When that specified interval is reached', () => {
		it('Then the scraping method should be called.', async () => {
			const scrapeWebsiteMock = jest.fn();

			// Schedule the cron job
			const cronJob = cron.schedule('*/1 * * * * *', () => {
				console.log('Cron job executed');
				scrapeWebsiteMock();
			});

			// Wait for a sufficient amount of time for cron to execute the job
			// eslint-disable-next-line no-promise-executor-return
			await new Promise(resolve => setTimeout(resolve, 2000));

			expect(scrapeWebsiteMock).toHaveBeenCalledTimes(1);
			// Stop the cron job
			cronJob.stop();
		});
	});
});

describe('When the /automate route is reached', () => {
	it('the scheduleFetching function should be called', async () => {
		await request(app)
			.get('/automate');

		// Expect the original scheduleFetching method to be called once
		expect(scheduleFetching).toHaveBeenCalled();
	});
});
