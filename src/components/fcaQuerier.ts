
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
async function fcaGetApprovalStatus(registrationId: string): Promise<{ isAuthorised: boolean }> {
    const fcaResponse = await axios.get('https://register.fca.org.uk/services/V0.1/Firm/122702', axiosConfig);

    const data = fcaResponse.data.Data[0] as Record<string, unknown>;
    const status = data.Status;
    const isAuthorised = (status === 'Authorised');

    return {isAuthorised: isAuthorised};
};

export {fcaGetApprovalStatus};