import axios from 'axios';
import * as fcaQuerier from '../components/fcaQuerier';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('when a request is sent through the API and is missing:', () => {
	// Set up a valid API_KEY_FCA before each test
	beforeEach(() => {
		process.env.API_KEY_FCA = 'valid_api_key';
	});

	afterEach(() => {
		jest.resetAllMocks();
	});

	it('should throw an error for invalid registrationId', async () => {
		const registrationId = 'invalid123';
		// Calls the fcaGetApprovalStatus function with the invalid registrationId
		// fcaGetApprovalStatus function, there is a check for the validity of the registrationId using a regular expression
		await expect(fcaQuerier.fcaGetApprovalStatus(registrationId)).rejects.toThrow(
			'FSR-API-02-01-11: Bad Request - Invalid Input for registrationId',
		);
	});

	it('should throw an error for unauthorized access', async () => {
		// Calls the fcaGetApprovalStatus function with a valid registrationId value ('122702')
		const registrationId = '122702';
		// API_KEY_FCA environment variable to an empty string ('')
		process.env.API_KEY_FCA = ''; // Set the key to be invalid
		// fcaGetApprovalStatus function, there is a check for the validity of the API_KEY_FCA and other headers
		await expect(fcaQuerier.fcaGetApprovalStatus(registrationId)).rejects.toThrow(
			'FSR-API-01-01-11 Unauthorised: Please include a valid API key and Email address',
		);
	});

	// Add more test cases as needed
});
