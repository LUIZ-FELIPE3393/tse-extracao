import axios, { AxiosError } from 'axios';
import * as fs from 'fs';
/* TODO: Transformar a maior parte de dados "any" em dados catalogados no types.ts */
const API_BASE_URL = "https://dadosabertos.tse.jus.br/api/3/action/";
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const packages = new Array();
const groups = new Array();
const anos = [
    "2018",
    "2020",
    "2022",
    "2024"
];
function getPackageYear(packageItem) {
    const firstTag = packageItem.tags[0];
    const tagName = firstTag.name;
    return tagName.split(' ')[1];
}
async function getData(url, retries = 3, delayMs = 100) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await axios.get(url, {
                timeout: 40000, // Timeout de 40 segundos para a requisição
                headers: {
                    'User-Agent': 'TSE-Extracao/1.0 (luizfelipe122004@hotmail.com)' // Opcional, mas boa prática
                }
            });
            return response.data;
        }
        catch (error) {
            if (axios.isAxiosError(error)) {
                // Se for um erro de rede ou timeout, tentar novamente
                if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND' || error.code === 'ERR_SOCKET_CONNECTION_TIMEOUT' || error.code === 'ERR_NETWORK' || error.message.includes('socket hang up')) {
                    if (i < retries - 1) {
                        const currentDelay = delayMs * (i + 1); // Atraso crescente
                        await sleep(currentDelay);
                    }
                    else {
                        throw error; // Lançar o erro final se todas as retentativas falharem
                    }
                }
                else {
                    // Outros tipos de erros do Axios (ex: 4xx, 5xx), não tentamos novamente automaticamente
                    throw error;
                }
            }
            else {
                throw error;
            }
        }
    }
    throw new Error(`Falha máxima de retentativas para ${url}`); // Deve ser inatingível
}
// Consultar e incluir os pacotes no grupo
function createGroup(groupName) {
    const packagesFromGroup = packages.filter(packageItem => packageItem.group === groupName);
    const newGroup = {
        name: groupName,
        packages: packagesFromGroup
    };
    return newGroup;
}
async function mountDatabase() {
    // A função abaixo consulta os grupos existentes no repositório do TSE
    // const groupListResponse: ListResponse = await getData("https://dadosabertos.tse.jus.br/api/3/action/group_list");
    // const groupList = groupListResponse.result;
    // Optar por definir os grupos
    const groupList = [
        "candidatos",
        "resultados"
    ];
    const packageList = [
        /*"candidatos-2018",
        "candidatos-2020-subtemas",
        "candidatos-2022",
        "candidatos-2024",*/
        //"resultados-2018",
        //"resultados-2020",
        //"resultados-2022",
        "resultados-2024"
    ];
    /*const packageListResponse: ListResponse = await getData("https://dadosabertos.tse.jus.br/api/3/action/package_list");

    // Filtrar os pacotes dos anos e grupos procurados
    const packageList = packageListResponse.result.filter(packageItem => {
        for (const ano of anos) {
            if (packageItem.includes(ano)) {
                return true;
            }
        }
        return false;
    }).filter(packageItem => {
        for (const group of groupList) {
            if (packageItem.includes(group)) {
                return true;
            }
        }
        return false;
    });*/
    for (const packageName of packageList) {
        console.log(packageName);
        try {
            const packageDetailRequest = await getData("https://dadosabertos.tse.jus.br/api/3/action/package_show?id=" + packageName);
            const packageDetail = packageDetailRequest.result;
            const newPackage = {
                name: packageDetail.name,
                group: packageDetail.groups[0].name,
                year: getPackageYear(packageDetail),
                resources: packageDetail.resources
            };
            packages.push(newPackage);
        }
        catch (error) {
            console.error("ERRO ao adquirir pacote", packageName, ":", error.status);
        }
    }
    for (const groupName of groupList) {
        const newGroup = createGroup(groupName);
        groups.push(newGroup);
    }
}
async function downloadFileToFolder(filename, url, outputPath) {
    try {
        const response = await axios.get(url, { responseType: 'stream' });
        console.log("Baixando arquivo de:", url, "| Nome do download:", outputPath + filename + ".zip");
        const writer = fs.createWriteStream(outputPath + filename + ".zip");
        response.data.pipe(writer);
        return new Promise((resolve, reject) => {
            writer.on('finish', () => resolve());
            writer.on('error', (error) => reject(error));
        });
    }
    catch (error) {
        console.error('Error downloading file:', error);
    }
}
async function downloadAMDataFromPackage(packageItem, outputPath) {
    try {
        for (const resource of packageItem.resources) {
            if (resource.name.includes("AM")) {
                downloadFileToFolder(resource.name, resource.url, outputPath);
            }
        }
    }
    catch (error) {
        console.error('Error downloading file:', error);
    }
}
async function downloadFiles() {
    for (const group of groups) {
        for (const packageItem of group.packages) {
            const folderPath = `./dados/${group.name}/${packageItem.year}/`;
            if (!fs.existsSync(folderPath + packageItem.name)) {
                fs.mkdir("./dados/" + group.name + '/' + packageItem.year + '/', { recursive: true }, (err) => {
                    if (err)
                        throw err;
                    downloadAMDataFromPackage(packageItem, folderPath);
                });
            }
        }
    }
}
await mountDatabase();
await downloadFiles();
//# sourceMappingURL=app.js.map