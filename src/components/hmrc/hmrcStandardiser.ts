import {Request} from "express";
import {isArray} from "util";

export default class hmrcStandardiser {
    public async standardise(data: Request | string | string[] , schema: string): Promise<void> {
        if (typeof data === 'string') {
            const csvKey = data;
            // Handle the case where the first argument is a string (csvKey).
           // this.uploadCsv(csvKey,schema);
        }
        else if (isArray(data)) {

        }
        else {
            // Handle the case where the first argument is a Request object.
            //await this.uploadCsvWithStream(data, schema);
        }
    }
}