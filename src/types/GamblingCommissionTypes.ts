type GamblingCommissionColumns = {
	businessesCsv: string[];
	licencesCsv: string[];
};

type GamblingCommissionFileDetails = {
	filename: string;
	encoding: string;
	mimeType: string;
};

export type {GamblingCommissionFileDetails, GamblingCommissionColumns};
