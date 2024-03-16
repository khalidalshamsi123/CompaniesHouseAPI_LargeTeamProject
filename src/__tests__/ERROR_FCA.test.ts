import axios from 'axios';
import * as fcaQuerier from '../components/fcaQuerier';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('fcaGetApprovalStatus', () => {
	beforeEach(() => {
		process.env.API_KEY_FCA = 'valid_api_key';
	});

	afterEach(() => {
		jest.resetAllMocks();
	});

	it('should throw an error for invalid registrationId', async () => {
		const invalidRegistrationId = 'invalid123';

		await expect(fcaQuerier.fcaGetApprovalStatus(invalidRegistrationId)).rejects.toThrow(
			'FSR-API-02-01-11: Bad Request - Invalid Input for registrationId',
		);
	});

	it('should throw an error for unauthorized access', async () => {
		const validRegistrationId = '12345';
		process.env.API_KEY_FCA = ''; // Set an invalid API key

		await expect(fcaQuerier.fcaGetApprovalStatus(validRegistrationId)).rejects.toThrow(
			'FSR-API-01-01-11 Unauthorised: Please include a valid API key and Email address',
		);
	});

	// Add more test cases as needed
});
