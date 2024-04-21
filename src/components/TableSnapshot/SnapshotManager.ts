import {type Regulator} from '../../types/CSVRegulatorTypes';
import {type PoolClient} from 'pg';

export default class SnapshotManager {
	private readonly client: PoolClient;
	private readonly schema: string;

	constructor(clientInTransaction: PoolClient) {
		this.client = clientInTransaction;

		this.schema = 'registration_schema';
		if (process.env.NODE_ENV === 'test') {
			this.schema = 'test_schema';
		}
	}

	public async takeSnapshot(regulator: Regulator): Promise<void> {
		const tableName = await this.createSnapshotTable(regulator);
		// Maintain limit of 5 snapshot tables.
		await this.manageSnapshots(tableName);
	}

	private async createSnapshotTable(regulator: Regulator): Promise<string> {
		const baseTable = this.getBaseTableName(regulator);

		// Shouldn't ever throw, just here to remove the eslint issue.
		if (!baseTable) {
			throw new Error('Undefined base table. Invalid regulator provided.');
		}

		const snapshotName = `${baseTable}_snapshot_${Date.now()}`;

		await this.client.query(`CREATE TABLE ${this.schema}.${snapshotName} AS TABLE ${this.schema}.${baseTable}`);
		console.log(`Snapshot created: ${snapshotName}`);

		return baseTable;
	}

	private getBaseTableName(regulator: string) {
		let baseTable;
		switch (regulator) {
			case 'hmrc':
				baseTable = 'hmrc_business_registry';
				break;
			case 'gambling':
				baseTable = 'gambling_business_registry';
				break;
				// Can't remove default case even though it's redundant because another lint rule will then throw an error.

			default:
            // Do nothing.
		}

		return baseTable;
	}

	private async manageSnapshots(tableName: string, maxSnapshots = 5) {
		/* The information schema provides an insight into all the tables in the database.
           It's preferable to query this table over the 'pg_table' since it most closely
           follows the SQL standard. Meaning queries that uses it will by extension
           be easier to port over to other DBMS systems.

           We find all snapshot tables for a regulatory body and that are part of the working schema.
           These results are put into descending order, which will order the tables from most recent
           to oldest.

           Finally, we use OFFSET to ignore the top 5 recent results, and retain only the excess tables (snapshots) that should be deleted. */
		const snapshotTableName = `${tableName}_snapshot_%`;
		const excessSnapshots = await this.client.query(`
            SELECT table_name
            FROM information_schema.tables
			WHERE table_schema = $1 AND table_name ILIKE $2
			ORDER BY table_name DESC
			OFFSET $3;`,
		[this.schema, snapshotTableName, maxSnapshots]);

		if (excessSnapshots.rows) {
		// Delete excess tables.
			for await (const snapshot of excessSnapshots.rows) {
				await this.client.query(`DROP TABLE ${this.schema}.${snapshot.table_name}`);
				console.log(`Deleted old snapshot: ${snapshot.table_name}`);
			}
		}
	}
}
