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
export type {GamblingCommissionData, DataRow};
