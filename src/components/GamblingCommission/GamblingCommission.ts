import pool from '../../database/databasePool';

import {finished, pipeline} from 'node:stream/promises';
import fs, {type ReadStream} from 'node:fs';
import {type CopyStreamQuery, from as copyFrom} from 'pg-copy-streams';
import {type GamblingCommissionKeys, type GamblingCommissionCsv} from '../../types/GamblingCommissionTypes';
import {Readable} from 'node:stream';
import {parse} from 'csv-parse';
import {stringify} from 'csv-stringify/sync';
import {deleteTableRows} from '../../database/queries';

/**
 * Holds logic relating to the Gambling Commission flow. **DO NOT** directly instantiate this class, use the Gambling Commission Factory instead.
 */
export default class GamblingCommission {
	// Determines what CSVs the class will process.
	private readonly csvAllowList = [
		'licensesCsv',
		'businessesCsv',
	];

	/*  I've decided to hardcode the column names. Since I will be making SQL queries in a future story
	    that will depend on these exact columns existing. I don't think I can make the logic generic. */
	private readonly columnNames: GamblingCommissionKeys = {
		licensesCsv: [
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

	/**
     * Populates relevant Gambling Commission tables in the production schema based on the byte representations of the CSV files provided.
	 * Useful for when receiving the data as part of a POST request.
     * @param {GamblingCommissionCsv} csvData is an object that contains two keys. One for both required CSVs. Each key contains a byteData field that should hold an Uint8Array value for the CSV file.
     */
	async uploadCsvFromBytes(csvData: GamblingCommissionCsv) {
		// If any key of the object isn't in our allow list, we throw an error.
		if (!this.checkIfValidCsv(csvData)) {
			throw new Error('Invalid CSV provided.');
		}

		// Process the bytes for each CSV, adding the data to the database.
		for await (const key of Object.keys(csvData)) {
			const client = await pool.connect();
			try {
				// Here we tell the typescript compiler that the csvName key is a valid key of csvData.
				const typedKey = key as keyof typeof csvData;
				const {byteData} = csvData[typedKey];

				const tableName = this.getTableName(key);

				// Should never trigger but included as a safeguard.
				if (!tableName) {
					throw new Error('Table name is undefined.');
				}

				// Creating a buffer from the (now standardised) CSV bytes.
				// In modern versions of Node.js, Buffers extend from Uint8Array.
				const buffer = Buffer.from(byteData);
				// Create a stream and push bytes to it.
				const stream = new Readable();
				stream.push(buffer);
				// Signifies end of file/data.
				stream.push(null);

				// Pre-process CSV to remove trailing delimeters in Gambling Commission CSVs.
				const standardisedCsvBytesStream: Readable = await this.standardiseCsvColumns(stream, typedKey);

				// Use the pg-copy-streams library to stream the CSV data into the database efficiently.
				const ingestStream: CopyStreamQuery = client.query(copyFrom(`COPY registration_schema.${tableName} FROM STDIN WITH (FORMAT csv)`));

				// Delete rows from table we plan to add the new CSV data to.
				await deleteTableRows(tableName);

				/* Populate table with CSV data.
				   If any problems occur during the COPY process Postgres will throw and error and since
				   this process runs within a transaction. Any changes will not be committed. */
				await pipeline(standardisedCsvBytesStream, ingestStream);
			} finally {
				// Release the client back to the postgres pool.
				client.release();
			}
		}
	}

	/**
     * Creates a new table in the production schema based on the data from the local CSV file specified.
     * @param csvName The name of the CSV file WITHOUT the file extension. E.g., 'business_license_register_businesses'.
     */
	async uploadCsvFromFile(csvName: string) {
		/* We manually request a client from the pool in this instance.
		   As this library requires us run the queries within a transaction, which is not
		   possible if using the pool.query() method.

		   A down-side to this is that we have to manually release the client
		   back to the pool when finished querying the database. */
		const client = await pool.connect();
		try {
			const ingestStream: CopyStreamQuery = client.query(copyFrom(`COPY registration_schema.${csvName} FROM STDIN WITH (FORMAT csv)`));
			const sourceStream: ReadStream = fs.createReadStream(`${csvName}.csv`);
			await pipeline(sourceStream, ingestStream);
		} finally {
			client.release();
		}
	}

	private checkIfValidCsv(csvInformation: GamblingCommissionCsv | string): boolean {
		// Custom types don't exist at runtime so will need to check if the input is an Object.
		// if it's an object that indicates it's a string, since only one of our parameters allows for an Object.
		if (csvInformation instanceof Object) {
			// Returns a array of the key names.
			const keyNames = Object.keys(csvInformation);
			for (const key of keyNames) {
				// If our allowList doesn't contain one of the objects keys.
				if (!this.csvAllowList.includes(key)) {
					return false;
				}
			}

			// If no invalid keys are found 'true' is returned.
			return true;
		}
		// Else - it's safe to assume that the input is a string for the reasons mentioned prior.
		// If individual CSV is in allow-list we return true.

		return this.csvAllowList.includes(csvInformation);
	}

	/**
	 * Compares the given key against strings. If a match is found will return the table name relevant to the key provided.
	 * @param key Either 'licensesCsv' or 'businessesCsv'.
	 * @returns the tables name that is related to the given key. E.g., licensesCsv will return `business_licence_register_licences`.
	 */
	private readonly getTableName = (key: string) => {
		if (key === 'licensesCsv') {
			return 'business_licence_register_licences';
		}

		if (key === 'businessesCsv') {
			return 'business_license_register_businesses';
		}
	};

	/**
	 * Parses the CSV data, removing trailing delimeters. Returning a correctly formatted CSV string.
	 * @param csvDataStream Readable stream of CSV data.
	 * @param csvKey What CSV file is being processed.
	 * @returns A string representation of the CSV file - parsed to remove trailing delimeters and such.
	 */
	private async parseCsv(csvDataStream: Readable, csvKey: keyof GamblingCommissionKeys) {
		const records: any[] = [];
		const columns: string[] = this.columnNames[csvKey];

		/* 	https://csv.js.org/parse/options/

			I can't use camel case even though it's an option
			with this library.

			Since when I attempt to do this, Typescript assumes
			I want to use the version of this method that takes
			an input to process as the first parameter. Causing errors. */
		const parserStream = parse({
			columns,
			delimiter: ',',
			// eslint-disable-next-line @typescript-eslint/naming-convention
			ignore_last_delimiters: true,
			// eslint-disable-next-line @typescript-eslint/naming-convention
			skip_empty_lines: true,
			// eslint-disable-next-line @typescript-eslint/naming-convention
			from_line: 2,
		});

		csvDataStream.pipe(parserStream);

		// As each record of the CSV is parsed, push each to a local array.
		for await (const record of parserStream) {
			records.push(record);
		}

		// Wait for the data stream to close. Indicating parsing has finished.
		await finished(csvDataStream);

		// Synchronously process the records and produce a single valid CSV string.
		const string = stringify(records, {
			delimiter: ',',
			columns,
			header: false,
		});

		return string;
	}

	private async standardiseCsvColumns(csvDataStream: Readable, csvKey: string): Promise<Readable> {
		// The CSVs can have data as various types for the values. E.g., Account Number is a number, while License Number is a string.
		// const csvData: Array<Record<string, any>> = [];

		// Tell the compiler that this string is a key of the columnNames type.
		const typedKey = csvKey as keyof typeof this.columnNames;

		const result = (await this.parseCsv(csvDataStream, typedKey));

		// Convert the CSV string to a Buffer.
		const buffer = Buffer.from(result);

		// Create a new readable stream from the buffer
		const stream = Readable.from(buffer);

		return stream;
	}
}

