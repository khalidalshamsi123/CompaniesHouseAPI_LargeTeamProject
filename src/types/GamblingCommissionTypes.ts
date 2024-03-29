type GamblingCommissionColumns = {
	businessesCsv: string[];
	licencesCsv: string[];
};

type GamblingCommissionFileDetails = {
	filename: string;
	encoding: string;
	mimeType: string;
};

type CsvKeys = 'licencesCsv' | 'businessesCsv';

export type {GamblingCommissionFileDetails, GamblingCommissionColumns, CsvKeys};
