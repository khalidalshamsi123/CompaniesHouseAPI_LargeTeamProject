// import pool from './databasePool';
//
// const createSchemaQuery = `
//     CREATE SCHEMA IF NOT EXISTS registration_schema;
//
//     CREATE TABLE IF NOT EXISTS registration_schema.business_registry (
//         registrationid VARCHAR PRIMARY KEY,
//         businessname VARCHAR(255),
//         fca_approved BOOLEAN,
//         hmrc_approved BOOLEAN,
//         gambling_approved BOOLEAN
//     );
// `;
//
// export async function createSchema() {
// 	try {
// 		console.log('Creating database schema...');
// 		const client = await pool.connect();
// 		try {
// 			await client.query(createSchemaQuery);
// 		} finally {
// 			//client.release();
// 		}
// 	} catch (error) {
// 		console.error('Error creating database schema:', error);
// 		throw error;
// 	}
// }
//
// // Call the createSchema function
// createSchema()
// 	.then(() => {
// 		console.log('Schema creation completed successfully.');
// 		// Any additional code to run after schema creation
// 	})
// 	.catch(error => {
// 		console.error('Schema creation failed:', error);
// 		// Handle errors if necessary
// 	});
