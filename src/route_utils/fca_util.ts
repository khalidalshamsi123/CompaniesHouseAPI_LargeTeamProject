//Here is a reusable function for getting FCA Approval based on original implementation for /fca subroute but this takes in registrationID
import axios, {type AxiosRequestConfig} from 'axios';

const axiosConfig: AxiosRequestConfig = {
    headers: {
        'X-Auth-Email': 'vieirai@cardiff.ac.uk',
        'X-Auth-Key': process.env.API_KEY_FCA,
        'Content-Type': 'application/json',
    },
};
async function isApprovedFCA(registrationId: string): Promise<{ authorized: boolean; timestamp: number }> {
    try {
        const fcaResponse = await axios.get(`https://register.fca.org.uk/services/V0.1/Firm/${registrationId}`, axiosConfig);

        const data = fcaResponse.data.Data[0];
        const status = data?.Status || '';

        const isAuthorised = status === 'Authorised';
        const timestamp = Math.floor(new Date().getTime() / 1000);

        return { authorized: isAuthorised, timestamp };
    } catch (error) {
        console.error('Error checking FCA approval:', error);
        throw new Error('Error checking FCA approval');
    }
}