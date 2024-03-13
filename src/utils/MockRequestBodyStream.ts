import {Readable} from 'node:stream';

class CustomBodyStream extends Readable {
	constructor(private readonly body: any) {
		super();
	}

	_read() {
		this.push(this.body);
		this.push(null);
	}
}

function decorateMockRequest(mockRequest: any) {
	// Create a Readable stream that simulates the request body
	const stream = new CustomBodyStream(mockRequest.body);

	// Add the pipe method to the mockRequest
	mockRequest.pipe = function (dest: any) {
		stream.pipe(dest);
	};

	// eslint-disable-next-line @typescript-eslint/no-unsafe-return
	return mockRequest;
}

export {decorateMockRequest};
