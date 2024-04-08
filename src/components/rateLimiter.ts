import {fcaGetApprovalStatus, type FcaApprovalStatusResult} from './fcaQuerier';

// Rate limiting variables
const maxRequestsPerWindow = 50;
const windowDurationMs = 10000; // 10 seconds
const requestQueue: Array<{registrationId: string; resolve: (value: FcaApprovalStatusResult) => void; reject: (reason?: any) => void}> = [];
let requestsInWindow = 0;
let windowTimer: NodeJS.Timeout | undefined;

async function rateLimitedFcaGetApprovalStatus(registrationId: string): Promise<FcaApprovalStatusResult> {
	return new Promise((resolve, reject) => {
		// Add the request to the queue
		requestQueue.push({registrationId, resolve, reject});

		// Process the queue if the window is not full or if it's a new window
		if (requestsInWindow < maxRequestsPerWindow || !windowTimer) {
			void processQueue();
		}
	});
}

async function processQueue() {
	if (requestQueue.length === 0) {
		// No requests in the queue, reset the window timer
		if (windowTimer) {
			clearTimeout(windowTimer);
			windowTimer = undefined;
		}

		requestsInWindow = 0;
		return;
	}

	if (requestsInWindow === maxRequestsPerWindow) {
		// Window is full, wait for the timer to expire
		return;
	}

	const {registrationId, resolve, reject} = requestQueue.shift()!;
	requestsInWindow++;

	try {
		const result = await fcaGetApprovalStatus(registrationId);
		resolve(result);
	} catch (error) {
		reject(error);
	} finally {
		if (requestsInWindow === maxRequestsPerWindow) {
			// Window is full, start the timer for the next window
			windowTimer = setTimeout(() => {
				requestsInWindow = 0;
				void processQueue();
			}, windowDurationMs);
		} else {
			// Process the next request in the queue
			void processQueue();
		}
	}
}

export {rateLimitedFcaGetApprovalStatus};
