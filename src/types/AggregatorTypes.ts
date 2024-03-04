// Define type that enforces the response object to contain these needed values.
export type ResponseBodyStatus = {
	timestamp: number;
	hmrc: boolean;
	fca: boolean;
};
