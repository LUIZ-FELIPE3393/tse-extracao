/**
 *
 * ## App NodeJS para realização de operações para extração de dados da API IBGE ##
 *
 */
// Para dados relacionados à UF do Amazonas, utiliza-se o ID de UF "13"
import path from 'path';
import fs from 'fs';
import axios, { AxiosError } from 'axios';
import { json2csv } from 'json-2-csv';
import { parse } from 'csv-parse';
const API_BASE_URL = "https://servicodados.ibge.gov.br/api/v1/";
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const isNumber = (value) => { return typeof value === 'number' && Number.isFinite(value); };
async function getData(urlPath) {
    const axiosURL = new URL(path.join(API_BASE_URL, urlPath));
    const response = await axios.get(axiosURL.toString());
    return response;
}
function writeFileCreateDir(filePath, data) {
    const directory = path.dirname(filePath);
    try {
        fs.mkdirSync(directory, { recursive: true });
    }
    catch (error) {
        if (error.code !== 'EEXIST') { // Ignore error if directory already exists
            console.error(`Error creating directory "${directory}":`, error);
            return; // Exit if a different error occurred
        }
    }
    try {
        fs.writeFileSync(filePath, data);
        console.log(`File "${filePath}" written successfully.`);
    }
    catch (err) {
        console.error(`Error writing file "${filePath}":`, err);
    }
}
/*
getData("localidades/estados").then(res => {
    const buffer = json2csv(res.data);
    writeFileCreateDir("./dados/local/estados.csv", buffer);
});
*/
/*
function transformToCSV() {
    getData("localidades/estados").then(res => {
        const buffer = json2csv(res.data);
        writeFileCreateDir("./dados/local/estados.csv", buffer);
    });
}

transformToCSV();
*/
async function parseCsvString(buffer) {
    return new Promise((resolve, reject) => {
        const records = [];
        const parser = parse({
            delimiter: ","
        });
        parser.on('readable', function () {
            let record;
            while ((record = parser.read()) !== null) {
                let index = -1;
                for (const value of record) {
                    index++;
                    try {
                        const jsonValue = JSON.parse(value);
                        if (isNumber(jsonValue))
                            continue;
                        record[index] = jsonValue["id"];
                    }
                    catch (error) {
                        continue;
                    }
                }
                records.push(record);
            }
        });
        parser.on('error', function (err) {
            reject(err);
        });
        parser.on('end', function () {
            resolve(records.join("\n"));
        });
        parser.write(buffer);
        parser.end();
    });
}
getData("localidades/estados/13/municipios").then(async (res) => {
    const buffer = json2csv(res.data, {
        expandNestedObjects: false
    });
    const parsedBuffer = await parseCsvString(buffer);
    console.log(parsedBuffer);
    writeFileCreateDir("./dados/local/municipiosAM.csv", parsedBuffer);
});
//# sourceMappingURL=app-ibge.js.map