import {clearTestDatabase, deleteRowsFromTestTable, setupTestDatabase} from '../utils/databaseTestFuncs';
import pool from '../database/setup/databasePool';
import SnapshotManager from '../components/TableSnapshot/SnapshotManager';
import {type Regulator} from '../types/CSVRegulatorTypes';

const initialiseDatabase = async () => {
	await clearTestDatabase();
	await setupTestDatabase();

	await deleteRowsFromTestTable('hmrc_business_registry');
	await deleteRowsFromTestTable('gambling_business_registry');

	await pool.query('INSERT INTO test_schema.hmrc_business_registry (referenceid, businessname, hmrc_approved) VALUES ($1, $2, $3);',
		['122727', 'a real business limited.', true]);
	await pool.query('INSERT INTO test_schema.gambling_business_registry (referenceid, businessname, gambling_approved) VALUES ($1, $2, $3);',
		['142355', 'a real business limited.', false]);
};

afterAll(async () => {
	await pool.end();
});

//  Scenario: Creating a new snapshot when required.

// Given.
describe('Given there are fewer than five snapshots of a regulator\'s approval status data.', () => {
	beforeEach(async () => {
		await initialiseDatabase();
	});
	// When.
	describe('When the snapshot creation process is initiated for the regulator.', () => {
		// Then.
		it('Then a new, timestamped snapshot of the data should be created.', async () => {
			const client = await pool.connect();

			const snapshotManager = new SnapshotManager(client);
			await snapshotManager.takeSnapshot('gambling');
			await snapshotManager.takeSnapshot('hmrc');

			const gamblingSnapshotTables = await client.query(`
				SELECT table_name
				FROM information_schema.tables
				WHERE table_schema = $1 AND table_name LIKE $2`,
			['test_schema', 'gambling_business_registry_snapshot_%']);

			const hmrcSnapshotTables = await client.query(`
				SELECT table_name
				FROM information_schema.tables
				WHERE table_schema = $1 AND table_name LIKE $2`,
			['test_schema', 'hmrc_business_registry_snapshot_%']);

			// Gambling expects.
			expect(gamblingSnapshotTables.rowCount).toEqual(1);
			expect(gamblingSnapshotTables.rows[0].table_name).toMatch(/(gambling_business_registry_snapshot)/);

			// HMRC expects.
			expect(hmrcSnapshotTables.rowCount).toEqual(1);
			expect(hmrcSnapshotTables.rows[0].table_name).toMatch(/(hmrc_business_registry_snapshot)/);

			const gamblingSnapshotData = await client.query(`
				SELECT * 
				FROM test_schema.${gamblingSnapshotTables.rows[0].table_name}`);

			const hmrcSnapshotData = await client.query(`
				SELECT *
				FROM test_schema.${hmrcSnapshotTables.rows[0].table_name}`);

			// Gambling expects - Content check.
			expect(gamblingSnapshotData.rows).toStrictEqual([
				{
					referenceid: '142355',
					businessname: 'a real business limited.',
					// eslint-disable-next-line @typescript-eslint/naming-convention
					gambling_approved: false,
				},
			]);

			// HMRC expects - Content check.
			expect(hmrcSnapshotData.rows).toStrictEqual([
				{
					referenceid: '122727',
					businessname: 'a real business limited.',
					// eslint-disable-next-line @typescript-eslint/naming-convention
					hmrc_approved: true,
				},
			]);

			// Release client manually acquired from pool.
			client.release();
		});
	});
});

//  Scenario: Managing snapshot limits to prevent overflow.

// Given.
describe('Given there are already five snapshots for the regulator\'s approval data.', () => {
	/* This version of the beforeAll() avoids using the snapshot component to create the initial 5 snapshots.
	beforeAll(async () => {
		const timestamps = [];
		for (let i = 0; i < 5; i++) {
			timestamps.push(Date.now());
		}

		const regulatorTables = ['gambling_business_registry', 'hmrc_business_registry'];

		for await (const regulatorTable of regulatorTables) {
			for await (const timestamp of timestamps) {
				// Create set of snapshots for each registry table, each with a date older than the last appended to its identifier.
				await pool.query(`
				CREATE TABLE test_schema.$1_snapshot_$2
			 	AS TABLE test_schema.$1`,
				[regulatorTable, timestamp]);
			}
		}
	}); */

	// This beforeEach() makes use of the snapshot manager to create the 5 original snapshots.
	beforeEach(async () => {
		const regulators = ['gambling', 'hmrc'];
		const client = await pool.connect();

		const snapshotManager = new SnapshotManager(client);
		for await (const regulator of regulators) {
			for (let i = 0; i < 4; i++) {
				// eslint-disable-next-line no-await-in-loop
				await snapshotManager.takeSnapshot(regulator as Regulator);
			}
		}

		client.release();
	});

	afterEach(async () => {
		await initialiseDatabase();
	});

	// When.
	describe('When another snapshot is requested and created for the regulator.', () => {
		// Then.
		it('Then the system should automatically remove the oldest snapshot, ensuring that only the five most recent snapshots remain.', async () => {
			const client = await pool.connect();

			let gamblingSnapshotTables = await client.query(`
				SELECT table_name
				FROM information_schema.tables
				WHERE table_schema = $1 AND table_name LIKE $2
				ORDER BY table_name DESC`,
			['test_schema', 'gambling_business_registry_snapshot_%']);

			let hmrcSnapshotTables = await client.query(`
				SELECT table_name
				FROM information_schema.tables
				WHERE table_schema = $1 AND table_name LIKE $2
				ORDER BY table_name DESC`,
			['test_schema', 'hmrc_business_registry_snapshot_%']);

			// Gambling expects.
			expect(gamblingSnapshotTables.rowCount).toEqual(5);
			expect(gamblingSnapshotTables.rows[0].table_name).toMatch(/(gambling_business_registry_snapshot)/);
			// 5th table - oldest.
			expect(gamblingSnapshotTables.rows[4].table_name).toBeDefined();

			// HMRC expects.
			expect(hmrcSnapshotTables.rowCount).toEqual(5);
			expect(hmrcSnapshotTables.rows[0].table_name).toMatch(/(hmrc_business_registry_snapshot)/);
			// 5th table - oldest.
			expect(hmrcSnapshotTables.rows[4].table_name).toBeDefined();

			const oldestGamblingTable = gamblingSnapshotTables.rows[4].table_name as string;
			const oldestHmrcTable = hmrcSnapshotTables.rows[4].table_name as string;

			const snapshotManager = new SnapshotManager(client);
			await snapshotManager.takeSnapshot('gambling');
			await snapshotManager.takeSnapshot('hmrc');

			// Check that the original oldest table no longer exists and that number of tables equals 5.
			gamblingSnapshotTables = await client.query(`
				SELECT table_name
				FROM information_schema.tables
				WHERE table_schema = $1 AND table_name LIKE $2
				ORDER BY table_name DESC`,
			['test_schema', 'gambling_business_registry_snapshot_%']);

			hmrcSnapshotTables = await client.query(`
				SELECT table_name
				FROM information_schema.tables
				WHERE table_schema = $1 AND table_name LIKE $2
				ORDER BY table_name DESC`,
			['test_schema', 'hmrc_business_registry_snapshot_%']);

			// Gambling expects.
			expect(gamblingSnapshotTables.rows[4].table_name).not.toEqual(oldestGamblingTable);

			// HMRC expects.
			expect(hmrcSnapshotTables.rows[4].table_name).not.toEqual(oldestHmrcTable);

			// Release client manually acquired from pool.
			client.release();
		});
	});
});
