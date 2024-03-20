/* eslint-disable @typescript-eslint/naming-convention */
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

	it('should throw an error when account is not found', async () => {
		// Arrange
		const registrationId = '401805';
		const mockResponse = {
			data: {
				Status: 'FSR-API-02-01-21',
				ResultInfo: {
					page: '1',
					per_page: '1',
					total_count: '1',
				},
				Message: 'ERROR : Account Not Found',
				Data: [
					{
						Name: 'https://register.fca.org.uk/services/V0.1/Firm/401805/Names',
						Individuals: 'https://register.fca.org.uk/services/V0.1/Firm/401805/Individuals',
						Requirements: 'https://register.fca.org.uk/services/V0.1/Firm/401805/Requirements',
						Permissions: 'https://register.fca.org.uk/services/V0.1/Firm/401805/Permissions',
						Passport: 'https://register.fca.org.uk/services/V0.1/Firm/401805/Passports',
						Regulators: 'https://register.fca.org.uk/services/V0.1/Firm/401805/Regulators',
						'Appointed Representative': 'https://register.fca.org.uk/services/V0.1/Firm/401805/AR',
						Address: 'https://register.fca.org.uk/services/V0.1/Firm/401805/Address',
						Waivers: 'https://register.fca.org.uk/services/V0.1/Firm/401805/Waivers',
						Exclusions: 'https://register.fca.org.uk/services/V0.1/Firm/401805/Exclusions',
						DisciplinaryHistory: 'https://register.fca.org.uk/services/V0.1/Firm/401805/DisciplinaryHistory',
						'System Timestamp': '2018-10-24 09:49:29',
						'Exceptional Info Details': [
							{
								'Exceptional Info Title': 'CAUTION',
							},
							{
								'Exceptional Info Title': 'ATTENTION - Firm in a compromise arrangement',
							},
						],
						'Status Effective Date': 'Wed Sep 01 00:00:00 GMT 2004',
					},
				],
			},
		};

		// Mock the axios.get function to return the mock response
		mockedAxios.get.mockResolvedValueOnce(mockResponse);

		// Act and Assert
		await expect(fcaQuerier.fcaGetApprovalStatus(registrationId)).rejects.toThrow(
			'FSR-API-02-01-21: ERROR : Account Not Found',
		);
	});
});

