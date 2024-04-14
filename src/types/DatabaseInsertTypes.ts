import type {PoolClient} from 'pg';

type DataRow = {
	row: Record<string, any>;
	refIdIndex: number;
	status1Index: number;
	client: PoolClient;
};

type GamblingCommissionData = {
	referenceId: string[];
	businessNames: string[];
	gamblingApprovalStatuses: boolean[]; // Updated to accept an array of booleans
	insertClient: PoolClient;
	schema: string;
};
// These need to be spelt to match the column names in database so when we read it maps it correctly to this type.
type HmrcBusinessData = {
	referenceid: string;
	businessname: string;
	hmrc_approved: boolean;
};

export type {GamblingCommissionData, DataRow, HmrcBusinessData};
