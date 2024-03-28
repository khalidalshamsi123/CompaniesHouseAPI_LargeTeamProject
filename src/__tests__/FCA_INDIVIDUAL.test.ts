/* eslint-disable @typescript-eslint/naming-convention */
import axios from 'axios';
import * as fcaQuerier from '../components/fcaQuerier';
import {fcaGetApprovalStatus} from '../components/fcaQuerier';

// Mock the axios module for testing purposes
jest.mock('axios');

describe('fcaGetApprovalStatus', () => {
	// Define the axiosConfig object with the necessary headers
	const axiosConfig = {
		headers: {
			'X-Auth-Email': 'vieirai@cardiff.ac.uk',
			'X-Auth-Key': 'mock-api-key',
			'Content-Type': 'application/json',
		},
	};

	// Create a variable to hold the spy instance for axios.get
	let axiosGetSpy: jest.SpyInstance;

	// Define mock responses for firm and individual API calls
	const mockFirmResponse = {
		data: {
			Data: [
				{
					Status: 'Unauthorised',
				},
			],
		},
	};

	const mockIndividualResponse = {
		data: {

			Status: 'FSR-API-03-01-00',
			ResultInfo: {
				page: '1',
				per_page: '1',
				total_count: '1',
			},
			Message: 'Ok. Individual found',
			Data: [
				{
					Details: {
						'Controlled Functions': 'https://register.fca.org.uk/services/V0.1/Individuals/JOB01749/CF',
						IRN: 'JOB01749',
						'Commonly Used Name': 'null',
						'Individual Status': 'Active',
						'Full Name': 'Brian Abdelhadi',
					},
				},
			],
		},
	};

	// Reset modules and create a new spy instance for axios.get before each test case
	beforeEach(() => {
		jest.resetModules();
		axiosGetSpy = jest.spyOn(axios, 'get');
	});

	// Restore the original implementation of axios.get after each test case
	afterEach(() => {
		axiosGetSpy.mockRestore();
	});

	// Test case: firm is not authorized, and individual is certified
	test('should return isAuthorised as false and isCertified as true when firm is not authorized and individual is certified', async () => {
		// Set RUN_FCA_CHECK to 'true'
		process.env.RUN_FCA_CHECK = 'true';

		// Mock the axios.get calls with the provided firm and individual responses
		axiosGetSpy
			.mockResolvedValueOnce(mockFirmResponse)
			.mockResolvedValueOnce(mockIndividualResponse);

		// Call the fcaGetApprovalStatus function with a sample registrationId
		const result = await fcaGetApprovalStatus('12345');

		// Assert that the returned result matches the expected values
		expect(result).toEqual({
			isAuthorised: false,
			isCertified: true,
		});
	});

	// Test case: firm is not authorized, and RUN_FCA_CHECK is false
	test('should return isAuthorised as false and isCertified as undefined when firm is not authorized and RUN_FCA_CHECK is false', async () => {
		// Set RUN_FCA_CHECK to 'false'
		process.env.RUN_FCA_CHECK = 'false';

		// Mock the axios.get call with the provided firm response
		axiosGetSpy.mockResolvedValueOnce(mockFirmResponse);

		// Call the fcaGetApprovalStatus function with a sample registrationId
		const result = await fcaGetApprovalStatus('12345');

		// Assert that the returned result matches the expected values
		expect(result).toEqual({
			isAuthorised: false,
			isCertified: undefined,
		});
	});

	// Test case: firm is authorized
	test('should return isAuthorised as true and isCertified as undefined when firm is authorized', async () => {
		// Define a mock response for an authorized firm
		const authorizedFirmResponse = {
			data: {
				Data: [
					{
						Status: 'Authorised',
					},
				],
			},
		};

		// Mock the axios.get call with the authorized firm response
		axiosGetSpy.mockResolvedValueOnce(authorizedFirmResponse);

		// Call the fcaGetApprovalStatus function with a sample registrationId
		const result = await fcaGetApprovalStatus('67890');

		// Assert that the returned result matches the expected values
		expect(result).toEqual({
			isAuthorised: true,
			isCertified: undefined,
		});
	});
});
