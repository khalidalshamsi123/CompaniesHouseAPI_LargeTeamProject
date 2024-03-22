
import axios, {type AxiosRequestConfig} from 'axios';

import * as dotenv from 'dotenv';

dotenv.config();

const axiosConfig: AxiosRequestConfig = {
	headers: {
		'X-Auth-Email': 'vieirai@cardiff.ac.uk',
		'X-Auth-Key': process.env.API_KEY_FCA,
		'Content-Type': 'application/json',
	},
};

// Will query the FCA API for the Barclays firms approval status. Should return true.
// This will be refactored in the future to be able to search for the approval status of
// any firm.

// I have removed the try-catch as we want it to throw an error that can be handled by the method caller.
// Since if we handle it, we would need to return a boolean which would be incorrect. As just because
// the API request may have failed, that doesn't mean the business itself is unapproved.
// The code does not include a try...catch block within the fcaGetApprovalStatus function itself. Instead, it relies on the caller to handle the thrown errors
async function fcaGetApprovalStatus(registrationId: string): Promise<{isAuthorised: boolean}> {
	// Check if registrationId contains only numerical characters (internal)
	if (!/^\d+$/.test(registrationId)) {
		throw new Error('FSR-API-02-01-11: Bad Request - Invalid Input for registrationId');
	}

	// Check if 'X-Auth-Email' and 'X-Auth-Key' headers are present and have the correct values (internal)
	if (
		(!axiosConfig.headers || !axiosConfig.headers['X-Auth-Email'] || !axiosConfig.headers['X-Auth-Key'])
		|| (axiosConfig.headers['X-Auth-Email'] !== 'vieirai@cardiff.ac.uk' || !process.env.API_KEY_FCA)
	) {
		throw new Error('FSR-API-01-01-11 Unauthorised: Please include a valid API key and Email address');
	}

	const fcaResponse = await axios.get(`https://register.fca.org.uk/services/V0.1/Firm/${registrationId}`, axiosConfig);

	// Error message responding for accound not found (external)
	if (fcaResponse.data.Status === 'FSR-API-02-01-21') {
		// Respond with a specific error message for account not found
		throw new Error('ERROR : Account Not Found');
	}

	// Error for Bad Request (external)
	if (fcaResponse.data.Status === 'FSR-API-02-01-11') {
		// Respond with a specific error message for Bad request
		throw new Error('Bad Request : Invalid Input');
	}

	// Error for missing and or unauthrised API key and email address (external)
	if (fcaResponse.data.Status === 'FSR-API-01-01-11') {
		// Respond with a specific error message for unauthorised
		throw new Error('Unauthorised: Please include a valid API key and Email address');
	}

	let isAuthorised = false;
	// The response could be null which can throw error when we try to read it for the authorised value.
	if (fcaResponse.data.Data && fcaResponse.data.Data.length > 0) {
		const data = fcaResponse.data.Data[0] as Record<string, unknown>;
		const status = data.Status;
		isAuthorised = (status === 'Authorised');
	}

	return {isAuthorised};
}

export {fcaGetApprovalStatus};
