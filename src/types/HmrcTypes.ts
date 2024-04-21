import {type PoolClient} from 'pg';

type CsvProcessorOptions = {
	filePath: string;
	client: PoolClient;
	batchSize: number;
};

export type{CsvProcessorOptions};
