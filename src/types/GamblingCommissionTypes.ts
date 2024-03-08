type GamblingCommissionCsv = {
	businessesCsv: {
		byteData: Uint8Array;
	};
	licensesCsv: {
		byteData: Uint8Array;
	};
};

type GamblingCommissionKeys = {
	businessesCsv: string[];
	licensesCsv: string[];
};

export type {GamblingCommissionCsv, GamblingCommissionKeys};
