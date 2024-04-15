// Define type that enforces the response object to contain these needed values.
export type ResponseBodyStatus = {
	timestamp: string;
	commissionIDs: CommissionIDs;
	businessName: string;
	approvedWith: {
		fca: boolean;
		hmrc: boolean;
		gamblingCommission: boolean;
	};
	approved: boolean;
};

// We have chosen to not follow PascalCase for this type. (typescript-eslint/naming-convention)
// eslint-disable-next-line
export type CommissionIDs = {
	gamblingCommission: string;
	hmrc: string;
	fca: string;
};

// We have chosen to not follow PascalCase for this type. (typescript-eslint/naming-convention)
// eslint-disable-next-line
export type PostCommissionIDsQueryBody = {
	businessName: string;
	commissions: CommissionIDs;
};
