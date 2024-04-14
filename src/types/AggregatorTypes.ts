// Define type that enforces the response object to contain these needed values.
type ResponseBodyStatus = {
	timestamp: string;
	referenceId: string;
	businessName: string;
	approvedWith: {
		fca: boolean;
		databaseCommissions: boolean;
	};
	approved: boolean;
};

// eslint-disable-next-line @typescript-eslint/naming-convention
type CommissionIDs = Partial<{
	gamblingCommission: string;
	hmrc: string;
	fca: string;
}>;

// eslint-disable-next-line @typescript-eslint/naming-convention
type PostCommissionIDsQueryBody = {
	referenceId: string;
	businessName: string;
	commissions: CommissionIDs;
	schema: string;
};

export type {CommissionIDs, ResponseBodyStatus, PostCommissionIDsQueryBody};
