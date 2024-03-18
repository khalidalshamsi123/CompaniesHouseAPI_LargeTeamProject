import pool from '../../database/databasePool';

import {pipeline} from 'node:stream/promises';
import fs, {type ReadStream} from 'node:fs';
import {type CopyStreamQuery, from as copyFrom} from 'pg-copy-streams';
import {type GamblingCommissionFileDetails, type GamblingCommissionColumns} from '../../types/GamblingCommissionTypes';
import {Transform, type Readable} from 'node:stream';
import {parse, format} from 'fast-csv';

import busBoy from 'busboy';
import {type Request} from 'express-serve-static-core';

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
     * Creates a new table in the production schema based on the data from the local CSV file associated with the key provided.
     * @param csvKey Key for a CSV available locally. E.g., giving 'businessesCsv' - would trigger an update using the 'business_licence_register_businesses.csv' file.
	 * @param schema What schema should the upload be applied to. If testing, can provide the test schema.
     */
	async uploadCsv(csvKey: string, schema: string): Promise<void>;

	async uploadCsv(data: string | Request, schema: string): Promise<void | Error> {
		if (typeof data === 'string') {
			const csvKey = data;
			// Handle the case where the first argument is a string (csvKey).
			await this.updateFromLocalFile(csvKey, schema);
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

		/* Manually define a promise here. The benefit of this is that we get to decide exactly
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
						resolve('Successfully updated database using files provided.');
					}
				} catch (e) {
					reject(e as Error);
				}
			});
		});
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
     * Creates a new table in the production schema based on the data from the local CSV file associated with the key provided.
     * @param csvKey Key for a CSV available locally. E.g., giving 'businessesCsv' - would trigger an update using the 'business_licence_register_businesses.csv' file.
	 * @param schema What schema should the upload be applied to. If testing, can provide the test schema.
     */
	private async updateFromLocalFile(csvKey: string, schema: string) {
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

			// Start transaction.
			await client.query('BEGIN');

			/* Delete rows from table we plan to add the new CSV data to. I make sure to use the same client instance. If I don't
			   the query is not run within the same transaction. */
			await client.query(`DELETE FROM ${schema}.${tableName}`);
			// The CSV keyword tells postgres that the data is being provided in a CSV format. HEADER is used to skip the first line of the CSV as it contains the column names.
			const ingestStream: CopyStreamQuery = client.query(copyFrom(`COPY ${schema}.${tableName} FROM STDIN WITH (FORMAT csv, HEADER)`));

			// Might be a good idea to create an ENV variable for where the CSVs are stored, more customisable.
			const sourceStream: ReadStream = fs.createReadStream(`./files/${fileName}.csv`);
			await pipeline(sourceStream, ingestStream);

			// If no errors occur, we commit the changes.
			await client.query('COMMIT');
		} catch (e) {
			console.error(e);
			/* If an error has occured, we rollback the changes.
			Ensuring that the application keeps the original contents of the table. */
			await client.query('ROLLBACK');
		} finally {
			// Release client back to pool.
			client.release();
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
			return 'business-licence-register-businesses';
		}

		if (key === 'businessesCsv') {
			return 'business-licence-register-businesses';
		}
	};
}

