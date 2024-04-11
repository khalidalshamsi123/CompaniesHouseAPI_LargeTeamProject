// Define type that enforces the response object to contain these needed values.
export type ResponseBodyStatus = {
	timestamp: string;
	referenceId: string;
	businessName: string;
	approvedWith: {
		fca: boolean;
		hmrc: boolean;
		gamblingCommission: boolean;
	};
	approved: boolean;
};

