import {clearTestDatabase, setupTestDatabase} from '../utils/databaseTestFuncs';
import pool from '../database/setup/databasePool';
import SnapshotManager from '../components/TableSnapshot/SnapshotManager';

beforeAll(async () => {
	await clearTestDatabase();
	await setupTestDatabase();

	await pool.query('INSERT INTO test_schema.hmrc_business_registry (referenceid, businessname, hmrc_approved) VALUES ($1, $2, $3);',
		['122727', 'a real business limited.', true]);
	await pool.query('INSERT INTO test_schema.gambling_business_registry (referenceid, businessname, gambling_approved) VALUES ($1, $2, $3);',
		['142355', 'a real business limited.', false]);
});

beforeEach(() => {
	jest.clearAllMocks();
});

afterAll(async () => {
	await clearTestDatabase();
	await pool.end();
});

//  Scenario: 

// Given.
describe('', () => {
	// When.
	describe('', () => {
		// Then.
		it('', async () => {
			const client = await pool.connect();
			const snapshotManager = new SnapshotManager(client);
			await snapshotManager.takeSnapshot('gambling');
			const rows = await client.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = $1 AND table_name LIKE $2
            ORDER BY table_name DESC`,
			['test_schema', 'gambling_registry_snapshot_%']);
			client.release();
		});
	});
});
