import {csvReader} from './csvReaderHMRC';
import {type CsvProcessorOptions} from '../../types/HmrcTypes';

/**
 * Process CSV data using the received file.
 * @param options Options including filename, database client, and batch size.
 * @param insertClient Database client retrieved from the postgres pool.
 * @returns The number of rows processed.
 */
async function processHmrcCsv({filePath, client, batchSize}: CsvProcessorOptions): Promise<number> {
	const rowCount = await csvReader(filePath, client, batchSize);
	return rowCount;
}

export {processHmrcCsv};

