import axios, {AxiosError} from 'axios';
import * as fcaQuerier from '../components/fcaQuerier';
import * as rateLimiter from '../components/rateLimiter';
import {rateLimitedFcaGetApprovalStatus} from '../components/rateLimiter';
import {fcaGetApprovalStatus} from '../components/fcaQuerier';

jest.mock('../components/fcaQuerier', () => ({
	fcaGetApprovalStatus: jest.fn(),
}));

describe('rateLimitedFcaGetApprovalStatus', () => {
	beforeEach(() => {
		jest.useFakeTimers();
		(fcaGetApprovalStatus as jest.Mock).mockClear();
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	it('should limit the number of requests within the specified window', async () => {
		const maxRequestsPerWindow = 50;
		const windowDurationMs = 10000;

		// Mock the behavior of fcaGetApprovalStatus to resolve immediately with a dummy response
		(fcaGetApprovalStatus as jest.Mock).mockResolvedValue({isAuthorised: true, isCertified: false});

		const promises: Array<Promise<any>> = [];
		for (let i = 0; i < maxRequestsPerWindow; i++) {
			const registrationId = String(i);
			promises.push(rateLimitedFcaGetApprovalStatus(registrationId));
		}

		// Wait for the promises to resolve
		await Promise.all(promises);

		// Check if fcaGetApprovalStatus was called within the rate limit
		expect(fcaGetApprovalStatus).toHaveBeenCalledTimes(maxRequestsPerWindow);

		// Try to make one more request, which should be queued
		const extraRequestPromise = rateLimitedFcaGetApprovalStatus('extra-request');

		// Advance the timer by a short duration
		jest.advanceTimersByTime(100);

		// Check if fcaGetApprovalStatus was not called yet for the extra request
		expect(fcaGetApprovalStatus).toHaveBeenCalledTimes(maxRequestsPerWindow);

		// Advance the timer by the window duration
		jest.advanceTimersByTime(windowDurationMs);

		// Wait for the extra request promise to resolve
		await extraRequestPromise;

		// Check if fcaGetApprovalStatus was called for the extra request after the window duration
		expect(fcaGetApprovalStatus).toHaveBeenCalledTimes(maxRequestsPerWindow + 1);
	});

	it('should handle errors thrown by fcaGetApprovalStatus', async () => {
		const registrationId = 'error-request';

		// Mock the behavior of fcaGetApprovalStatus to throw an error
		(fcaGetApprovalStatus as jest.Mock).mockRejectedValue(new Error('API error'));

		// Call rateLimitedFcaGetApprovalStatus with the error-causing registrationId
		await expect(rateLimitedFcaGetApprovalStatus(registrationId)).rejects.toThrow('API error');
	});
});
