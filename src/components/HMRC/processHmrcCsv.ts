import {csvReader} from './csvReaderHMRC';
import {type PoolClient} from 'pg';

type CsvProcessorOptions = {
	filename: string;
	client: PoolClient;
	batchSize: number;
};

/**
 * Process CSV data from the given file.
 * @param options Options including filename, database client, and batch size.
 * @returns The number of rows processed.
 */
async function processHmrcCsv({filename, client, batchSize}: CsvProcessorOptions): Promise<number> {
	const rowCount = await csvReader(filename, client, batchSize);
	return rowCount;
}

export{processHmrcCsv};

