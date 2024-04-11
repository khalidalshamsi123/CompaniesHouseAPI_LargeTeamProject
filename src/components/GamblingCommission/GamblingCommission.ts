import pool from '../../database/setup/databasePool';

import {pipeline} from 'node:stream/promises';
import fs, {type ReadStream} from 'node:fs';
import {type CopyStreamQuery, from as copyFrom} from 'pg-copy-streams';
import {type GamblingCommissionFileDetails, type GamblingCommissionColumns, type CsvKeys} from '../../types/GamblingCommissionTypes';
import {Transform, type Readable} from 'node:stream';
import {parse, format} from 'fast-csv';

import busBoy from 'busboy';
import {type Request} from 'express-serve-static-core';

import Cursor from 'pg-cursor';
import {type PoolClient} from 'pg';
import {sortStringToFrontOfArray} from '../../utils/utils';
import {insertDataStandardiser} from '../../database/insertDataStandardiser';
import {type GamblingCommissionData} from '../../types/DatabaseInsertTypes';

/**
 * Holds logic relating to the Gambling Commission flow. **DO NOT** directly instantiate this class, use the Gambling Commission Factory instead.
 */
export default class GamblingCommission {
	// Determines what CSVs the class will process.
	private readonly csvAllowList = [
		'licencesCsv',
		'businessesCsv',
	];

	/*  I've decided to hardcode the column names. Since I will be making SQL queries in a future story
	    that will depend on these exact columns existing. I don't think I can make the logic generic. */
	private readonly columnNames: GamblingCommissionColumns = {
		licencesCsv: [
			'Account Number',
			'Licence Number',
			'Status',
			'Type',
			'Activity',
			'Start Date',
			'End Date',
		],
		businessesCsv: [
			'Account Number',
			'Licence Account Name',
		],
	};

	/* Overload signatures. */
	/**
	 * Populates relevant Gambling Commission tables in the production schema from a readable stream of CSV data.
	 * Useful for when receiving the data as part of a POST request.
	 *
	 * As this method uses streams, the CSV will not be loaded into memory all at once. Instead portions of it will be streamed, processed and then
	 * uploaded to the database. Thereby making this solution highly scalable. Being able to handle very large CSVs.
	 * @param {Request} request A Readable stream.
	 * @param schema What schema should the upload take place in.
	 */
	async uploadCsv(request: Request, schema: string): Promise<void | Error>;
	/**
	 * Creates a new table in the production schema based on the data from the local CSV files associated with the keys provided.
	 * @param csvKeys Array of keys for the CSVs available locally. E.g., giving 'businessesCsv' as an element would trigger an update using the 'business_licence_register_businesses.csv' file.
	 * @param schema What schema should the upload be applied to. If testing, can provide the test schema.
	 */
	async uploadCsv(csvKeys: CsvKeys[], schema: string): Promise<void>;

	async uploadCsv(data: CsvKeys[] | Request, schema: string): Promise<void | Error> {
		if (data instanceof Array) {
			const csvKeys = data;
			// Handle the case where the first argument is an array of valid CSV keys.
			await this.updateFromLocalFile(csvKeys, schema);
		} else {
			// Handle the case where the first argument is a Request object.
			await this.uploadCsvWithStream(data, schema);
		}
	}

	public async standardise(data: Request | CsvKeys[], schema: string): Promise<void> {
		if (data instanceof Array) {
			// Handle the case where the first argument is a string (csvKey).
			await this.uploadCsv(data, schema);
		} else {
			// Handle the case where the first argument is a Request object.
			await this.uploadCsvWithStream(data, schema);
		}
	}

	/**
	 * Populates relevant Gambling Commission tables in the production schema from a readable stream of CSV data.
	 * Useful for when receiving the data as part of a POST request.
	 *
	 * As this method uses streams, the CSV will not be loaded into memory all at once. Instead portions of it will be streamed, processed and then
	 * uploaded to the database. Thereby making this solution highly scalable. Being able to handle very large CSVs.
	 * @param {Request} request A Readable stream.
	 * @param schema What schema should the upload take place in.
	 */
	private async uploadCsvWithStream(request: Request, schema: string) {
		const busBoyInstance = busBoy({
			headers: request.headers,
		});

		const filePromises: Array<Promise<string>> = [];

		// Need to set a flag. Can't simply throw an error within an event handler due to async weirdness.
		const validationErrors: Error[] = [];

		request.pipe(busBoyInstance);

		busBoyInstance.on('file', (name: string, file: Readable, fileDetails: GamblingCommissionFileDetails) => {
			// Need to wrap any thrown errors within an event-handler with a try-catch.
			// This is because errors thrown in event-handlers do not propagate in the same way
			// as errors in a typical function would for instance.
			try {
				let errorString;
				// Validate the CSV based on its key and MIME type.

				/* This check isn't even strictly necessary as the code is built in a way where it will be able to handle
				   an invalid mimetype. Even if it somehow has managed to get passed this check. */
				if (!this.checkIfValidCsv(name, fileDetails)) {
					errorString = `Invalid CSV: ${name} with MIME type: ${fileDetails.mimeType}`;
					// If validation fails push it to an array of errors.
					validationErrors.push(new Error(errorString));
					throw new Error(errorString);
				}

				// If any key of the object isn't in our allow list, throw an error.
				const tableName = this.getTableNameFromKey(name);

				// Should never trigger but included as a safeguard.
				if (!tableName) {
					errorString = 'Table name is undefined.';
					validationErrors.push(new Error(errorString));
					throw new Error(errorString);
				}

				const typedKey = name as keyof typeof this.columnNames;

				const columns: string[] = this.columnNames[typedKey];

				// If initial validation passes, process the CSV data. Store promise of which in array.
				filePromises.push(this.csvStreamParseAndCopy(tableName, schema, file, columns));
			} catch (e) {
				// Very important. This is needed to skip rest of file stream.
				// If we just return or throw an error it causes the event handler to hang indefinitely.
				file.resume();
			}
		});

		/* Manually define a promise. The benefit of this is that we get to decide exactly
		   when it will be resolved or rejected.
		   Meanwhile with an async function it tries to infer by itself when its 'complete'.

		   A Promise will only allow the uploadCsvWithStream() method to return control back to the caller
		   once ALL csv files have been processed by busboy. AND all promises todo with processing
		   said files (uploading to database) have completed. */
		return new Promise((resolve, reject) => {
			busBoyInstance.on('error', error => {
				reject(error as Error);
			});

			busBoyInstance.on('finish', async () => {
				if (validationErrors.length > 0) {
					reject(new Error(validationErrors.map(e => e.message).join(', ')));
					return;
				}

				try {
					const results = await Promise.allSettled(filePromises);
					const rejectedPromises = results.filter(result => result.status === 'rejected');

					if (rejectedPromises.length > 0) {
						// Safely access the `reason` property by ensuring we're working with `PromiseRejectedResult`.
						const errorMessages = rejectedPromises.map(p => {
							if (p.status === 'rejected') {
								// eslint-disable-next-line @typescript-eslint/no-unsafe-call
								return p.reason.toString() as string;
							}

							return '';
						}).filter(msg => msg).join(', ');

						reject(new Error(`Errors occurred during file processing: ${errorMessages}`));
					} else {
						// Start and wait for process to use newly formed tables to update main database table.
						await this.aggregateTemporaryTableData(schema);
						resolve('Successfully updated database using files provided.');
					}
				} catch (e) {
					reject(e as Error);
				}
			});
		});
	}

	/**
	 * Performs a INNER JOIN on the two temporary tables created using the CSV data previously uploaded.
	 * Aggregates the results, determining the licence approval status for each business.
	 * Calls methods that will use this data to update the main database table.
	 * Which is used for ascertaining licence statuses by the API.
	 * @param schema Database schema the method should apply to. E.g., test_schema or registration_schema.
	 */
	private async aggregateTemporaryTableData(schema: string) {
		/* I use two clients, one for the read operations (cursor) and one for writing to the database.
		   This lowers the risk of locking issues, which I had experienced when attempting to run the actions
		   all on one client. */
		const insertClient = await pool.connect();
		const cursorClient = await pool.connect();

		try {
			// Begin database transaction.
			await insertClient.query('BEGIN');

			/* Joins the two temporary tables on account id.
			   Creates a cursor which will be used to read the results of said query. */
			const cursor = cursorClient.query(new Cursor(`
				SELECT DISTINCT ON (rb.account_number) rb.*, rl.*
				FROM ${schema}.business_licence_register_businesses rb
					JOIN ${schema}.business_licence_register_licences rl
				ON rb.account_number = rl.account_number
				ORDER BY rb.account_number, rl.start_date DESC;
			`));
			// Reads from the cursor and performs upsert. Batches of 50 till completion.
			await this.readBatchAndInsert(cursor, insertClient, schema);
			// If no errors have occured, commit the changes to the database.
			await insertClient.query('COMMIT');
			console.log('Successfully updated businesses in main database table with latest Gambling Commission statuses.');
		} catch (e) {
			// Error has occured, rollback database changes.
			await insertClient.query('ROLLBACK');
			throw e;
		} finally {
			// Release client back to the pool.
			insertClient.release();
			cursorClient.release();
		}
	}

	/**
	 * Reads rows from given cursor in batches of up-to 50. Processing them to ascertain approval status with the Gambling Commission for each business.
	 * Passing this data to a function that handles perfoming a upsert to the main database table using these values.
	 * Memory efficient as it only loads 50 rows at one time, not the entire tables contents at once.
	 * @param cursor Cursor wrapping an INNER JOIN query between the two temporary tables. Which were created from the previously uploaded CSV data.
	 * @param insertClient Database client retrieved from the postgres pool.
	 * @param schema Determines whether the changes should be made to a different schemas table. E.g., for testing provide 'test_schema'.
	 */
	private async readBatchAndInsert(cursor: Cursor, insertClient: PoolClient, schema: string) {
		// Initial read from cursor.
		let rows = await cursor.read(50);

		/* One of, or both of the tables involved in the JOIN operation are empty.
		   This can happen if only one CSV was provided by the uploader.
		   And the other CSV had never been provided before. */
		if (rows.length === 0) {
			throw new Error('No changes were made. Please provide both Gambling Commission CSV files.');
		}

		while (rows.length > 0) {
			/* Put needed column values for each row in batch into separate arrays.
			   It's safe to assume that this value will be a string. */
			const businessNames = rows.map(row => row.licence_account_name as string);
			// If status is 'Active' i.e., approved. Then we set that records approval status as true.
			// Otherwise, it will be set to false.
			const gamblingApprovalStatuses = rows.map(row => row.status === 'Active');
			const referenceId = rows.map(row => row.licence_number as string);
			/* Insert batch of rows.
			   ignore eslint rule as we need to sequentially process rows here to maintain data
			   integrity and ensure that we only process 50 rows at a time. */

			const gamblingCommissionData: GamblingCommissionData = {
				referenceId,
				businessNames,
				gamblingApprovalStatuses,
				insertClient,
				schema,
			};
			// eslint-disable-next-line no-await-in-loop
			await insertDataStandardiser(gamblingCommissionData);// eslint-disable-next-line no-await-in-loop
			rows = await cursor.read(50);
		}

		// Once all rows have been read, close the cursor.
		await cursor.close();
	}

	private async csvStreamParseAndCopy(tableName: string, schema: string, file: Readable, expectedHeaders: string[]) {
		/* We manually request a client from the pool in this instance.
		   As this library requires us run the queries within a transaction, which is not
		   possible if using the pool.query() method.

		   A down-side to this is that we have to manually release the client
		   back to the pool when finished querying the database. */
		const client = await pool.connect();

		try {
			/**
			 * Parse the given CSV data into JSON objects.
			 * - Removes trailing whitespace from left and right-hand sides of column values.
			 * - Discards unmapped columns. Where the amount of column values exceed the
			 *   expected number of headers, we discard the excess.
			 */
			const csvParseStream = parse({
				headers: true,
				delimiter: ',',
				trim: true,
				discardUnmappedColumns: true,
			}).on('data-invalid', (_row, rowNumber, reason) => {
				console.log(`Invalid row at line ${rowNumber}: ${reason}`);
			}).on('error', error => {
				console.error(`Error parsing CSV: ${error.message}`);
			});

			// Flag to indicate if any data was processed.
			let hasProcessedData = false;

			// Custom transform stream to check for existence of at least some processed data.
			// The CSV parser may be unable to determine any rows from the data fed to it.
			// For example, if our mimetype check is bypassed and an invalid file is passed.

			// We manually check to see if there are any usable chunks (rows/records).
			// If not we throw an error within the pipeline, stopping the stream from piping to the
			// next stream. Stopping the pipeline process and rejecting the async function.
			const checkForDataTransform = new Transform({
				objectMode: true,
				transform(chunk, _encoding, callback) {
					hasProcessedData = true; // Set flag to true when data is processed.
					this.push(chunk); // Pass data through.
					callback();
				},
				final(callback) {
					if (hasProcessedData) {
						callback();
					} else {
						callback(new Error('No rows processed. The CSV file is empty or invalid.'));
					}
				},
			});

			/**
			 * Specify order columns should have. But do not write them in the resulting csv string.
			 * https://c2fo.github.io/fast-csv/docs/formatting/examples/
			 */
			const csvFormatStream = format({
				headers: expectedHeaders,
				writeHeaders: false,
				delimiter: ',',
			});

			// Start database transaction.
			await client.query('BEGIN');

			/* Delete rows from table we plan to add the new CSV data to. I make sure to use the same client instance. If I don't
			   the query is not run within the same transaction.

			Truncate is faster than the standard DELETE FROM query. */
			await client.query(`TRUNCATE ${schema}.${tableName}`);

			// Use the pg-copy-streams library to stream the CSV data into the database efficiently.
			const ingestStream: CopyStreamQuery = client.query(copyFrom(`COPY ${schema}.${tableName} FROM STDIN WITH (FORMAT csv)`));

			/* Populate table with CSV data.
			   If any problems occur during the COPY process Postgres will throw an error.
			   And since this process runs within a transaction. Any changes will not be committed. */
			await pipeline(
				file,
				// Parse file-data to object, identifying rows and column values.
				csvParseStream,
				/* Checks that there is at least one record provided by CSV parse process.
				   If we pass along no records it causes the pipeline to hang indefinitely. */
				checkForDataTransform,
				// Format to CSV string, without headers, ready for COPY process.
				csvFormatStream,
				// Pass to Postgres COPY stream.
				ingestStream,
			);

			// If no errors occur, we commit the changes.
			await client.query('COMMIT');
			// Resolve the promise. Processing of this file is complete.
			return `Updated ${tableName}`;
		} catch (e: unknown) {
			/*  If an error has occured, we rollback the changes.
				Ensuring that the application keeps the original contents of the table. */
			await client.query('ROLLBACK');
			// Reject async method.
			throw e;
		} finally {
			// Release the client back to the pool.
			client.release();
		}
	}

	/**
	 * Creates a new table in the production schema based on the data from the local CSV files associated with the keys provided.
	 * @param csvKeys Array of keys for the CSVs available locally. E.g., giving 'businessesCsv' as an element would trigger an update using the 'business_licence_register_businesses.csv' file.
	 * @param schema What schema should the upload be applied to. If testing, can provide the test schema.
	 */
	private async updateFromLocalFile(csvKeys: CsvKeys[], schema: string) {
		// Loop through csvKeys, processing each file given. Will update using the businessesCsv first.
		// It is safe to cast csvKeys to string[], since csvKeys can only contain string values.
		const sortedArray = sortStringToFrontOfArray(csvKeys as string[], this.csvAllowList[1]);

		for await (const csvKey of sortedArray) {
			/* We manually request a client from the pool in this instance.
		   As this library requires us run the queries within a transaction, which is not
		   possible if using the pool.query() method.

		   A down-side to this is that we have to manually release the client
		   back to the pool when finished querying the database. */
			const client = await pool.connect();
			try {
				// Checks if the key is associated with a known CSV in our allow-list.
				if (!this.csvAllowList.includes(csvKey)) {
					throw new Error('Invalid CSV key provided.');
				}

				const tableName = this.getTableNameFromKey(csvKey);
				const fileName = this.getFileNameFromKey(csvKey);

				// Should never trigger but included as a safeguard.
				if (!tableName) {
					throw new Error('Table name is undefined.');
				}

				const csvParseStream = parse({
					headers: true,
					delimiter: ',',
					trim: true,
					discardUnmappedColumns: true,
				}).on('data-invalid', (_row, rowNumber, reason) => {
					console.log(`Invalid row at line ${rowNumber}: ${reason}`);
				}).on('error', error => {
					console.error(`Error parsing CSV: ${error.message}`);
				});

				const typedKey = csvKey as keyof typeof this.columnNames;

				const columns: string[] = this.columnNames[typedKey];

				/**
				 * Specify order columns should have. But do not write them in the resulting csv string.
				 * https://c2fo.github.io/fast-csv/docs/formatting/examples/
				 */
				const csvFormatStream = format({
					headers: columns,
					writeHeaders: false,
					delimiter: ',',
				});

				// Flag to indicate if any data was processed.
				let hasProcessedData = false;

				// Custom transform stream to check for existence of at least some processed data.
				// The CSV parser may be unable to determine any rows from the data fed to it.
				// For example, if our mimetype check is bypassed and an invalid file is passed.

				// We manually check to see if there are any usable chunks (rows/records).
				// If not we throw an error within the pipeline, stopping the stream from piping to the
				// next stream. Stopping the pipeline process and rejecting the async function.
				const checkForDataTransform = new Transform({
					objectMode: true,
					transform(chunk, _encoding, callback) {
						hasProcessedData = true; // Set flag to true when data is processed.
						this.push(chunk); // Pass data through.
						callback();
					},
					final(callback) {
						if (hasProcessedData) {
							callback();
						} else {
							callback(new Error('No rows processed. The CSV file is empty or invalid.'));
						}
					},
				});

				// Start transaction.
				await client.query('BEGIN');

				/* Delete rows from table we plan to add the new CSV data to. I make sure to use the same client instance. If I don't
			   the query is not run within the same transaction. */
				await client.query(`DELETE FROM ${schema}.${tableName}`);
				// The CSV keyword tells postgres that the data is being provided in a CSV format.
				const ingestStream: CopyStreamQuery = client.query(copyFrom(`COPY ${schema}.${tableName} FROM STDIN WITH (FORMAT csv)`));

				// Might be a good idea to create an ENV variable for where the CSVs are stored, more customisable.
				const sourceStream: ReadStream = fs.createReadStream(`./files/${fileName}.csv`);
				await pipeline(
					sourceStream,
					csvParseStream,
					checkForDataTransform,
					csvFormatStream,
					ingestStream,
				);

				// If no errors occur, we commit the changes.
				await client.query('COMMIT');
			} catch (e) {
				console.error(e);
				/* If an error has occured, we rollback the changes.
				   Ensuring that the application keeps the original contents of the table. */
				await client.query('ROLLBACK');
				// Return so aggregate process doesn't start.
				return;
			} finally {
				// Release client back to pool.
				client.release();
			}
		}

		// If all went well uploading the local CSV to the relevant temp database table.
		try {
			await this.aggregateTemporaryTableData(schema);
		} catch (e) {
			console.error(e);
			// On error, implicitly let the method 'return' for now.
			// This can be adjusted if the callers logically need to recieve a thrown error if anything went wrong.
		}
	}

	/**
	 * Checks if the CSV provided is valid at a surface-level.
	 * Validates that the mime-type is csv, and that the field containing
	 * the CSV matches one in our records.
	 * @param csvKey Reference ID for the CSV. E.g., licencesCsv = business-licence-register-licences.csv
	 * @param fileDetails An object containing details about the CSV such as mime-type.
	 * @returns A boolean - true or false.
	 */
	private checkIfValidCsv(csvKey: string, fileDetails: GamblingCommissionFileDetails): boolean {
		// Check that field is for a CSV.
		if (fileDetails.mimeType !== 'text/csv') {
			return false;
		}

		// If CSV-related key is in our allow-list we return true.
		return this.csvAllowList.includes(csvKey);
	}

	/**
	 * Compares the given key against strings. If a match is found will return the table name relevant to the key provided.
	 * @param key Either 'licencesCsv' or 'businessesCsv'.
	 * @returns the tables name that is related to the given key. E.g., licencesCsv will return `business_licence_register_licences`.
	 */
	private readonly getTableNameFromKey = (key: string) => {
		if (key === 'licencesCsv') {
			return 'business_licence_register_licences';
		}

		if (key === 'businessesCsv') {
			return 'business_licence_register_businesses';
		}
	};

	/**
	 * Compares the given key against strings. If a match is found will return the name of the CSV file relevant to the key provided.
	 * WITHOUT the .csv extension.
	 * @param key Either 'licencesCsv' or businessesCsv'.
	 * @returns the name of the CSV related to the given key. E.g., licencesCsv will return `business-licence-register-businesses`.
	 */
	private readonly getFileNameFromKey = (key: string) => {
		if (key === 'licencesCsv') {
			return 'business-licence-register-licences';
		}

		if (key === 'businessesCsv') {
			return 'business-licence-register-businesses';
		}
	};
}
