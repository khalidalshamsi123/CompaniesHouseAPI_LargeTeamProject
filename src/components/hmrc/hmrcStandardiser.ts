import {Request} from "express";

export default class hmrcStandardiser {
    public async standardise(data: Request | string[] , schema: string): Promise<void> {
        if (Array.isArray(data)) {

        }
        else {
            // Handle the case where the first argument is a Request object.
            //await this.uploadCsvWithStream(data, schema);
        }
    }
}