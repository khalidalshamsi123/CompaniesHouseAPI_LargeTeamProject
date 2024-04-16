import request from 'supertest';
import app from '../app';
import {Router} from 'express';
import * as cron from 'node-cron';
import {scrapeWebsite} from '../scraping/fetchingFiles';

jest.mock('../scraping/fetchingFiles', () => ({
	scrapeWebsite: jest.fn(),
}));

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
