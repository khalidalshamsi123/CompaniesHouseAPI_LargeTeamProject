import type {PoolClient} from 'pg';

type DataRow = {
	row: Record<string, any>;
	regIdIndex: number;
	status1Index: number;
	client: PoolClient;
};

type GamblingCommissionData = {
	businessNames: string[];
	gamblingApprovalStatuses: boolean[]; // Updated to accept an array of booleans
	insertClient: PoolClient;
	schema: string;
};
export type {GamblingCommissionData, DataRow};
