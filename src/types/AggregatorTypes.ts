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

export type CommissionIDs = {
	gamblingCommission: string;
	hmrc: string;
	fca: string;
}


export type PostCommissionIDsQueryBody = {
	businessName: string;
	commissions: CommissionIDs;
}
