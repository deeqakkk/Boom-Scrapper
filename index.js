const fs = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');

async function findBoomErrorsInFile(filePath) {
    const content = await fs.readFile(filePath, 'utf8');
    console.log(filePath)
    const boomRegex = /throw\s+new\s+Boom\('(.+?)',\s*\{\s*statusCode:\s*(\d+)\s*\}\)/g;
    const errors = [];
    let match;
    while ((match = boomRegex.exec(content))) {
        const error_message = match[1];
        const http_status_code = parseInt(match[2]);
        errors.push({ error_message, http_status_code });
    }
    return errors;
}


function convertToCamelCase(inputString) {
    const words = inputString.match(/[a-zA-Z]+/g);

    if (!words) {
        return "";
    }
    for (let i = 1; i < words.length; i++) {
        words[i] = words[i].toLowerCase();
        words[i] = words[i].charAt(0).toUpperCase() + words[i].slice(1);
    }

    const camelCaseString = words.join('');

    return camelCaseString.charAt(0).toLowerCase() + camelCaseString.slice(1);
}



async function compileBoomErrorsInDirectory(directoryPath) {
    const errorsMap = {};
    const files = await fs.readdir(directoryPath);
    await Promise.all(
        files.map(async(file) => {
            const filePath = path.join(directoryPath, file);
            const fileStats = await fs.stat(filePath);
            if (fileStats.isFile() && ['.js', '.ts'].includes(path.extname(filePath))) {

                const boomErrors = await findBoomErrorsInFile(filePath);
                boomErrors.forEach(({ error_message, http_status_code }) => {
                    const errorId = convertToCamelCase(error_message);
                    console.log(error_message, errorId)
                    errorsMap[errorId] = {
                        title: error_message,
                        description: error_message,
                        httpStatusCode: http_status_code,
                    };
                });
            } else if (fileStats.isDirectory()) {
                const subdirectoryErrors = await compileBoomErrorsInDirectory(filePath);
                Object.assign(errorsMap, subdirectoryErrors);
            }
        })
    );
    return errorsMap;
}

async function main() {
    const directoryPath = 'D:/Github/chatdaddy-service-transcoder';
    const errorsMap = await compileBoomErrorsInDirectory(directoryPath);
    const serviceName = path.basename(directoryPath);
    const errorYaml = {
        [serviceName]: errorsMap,
    };
    //throw new Boom

    const yamlStr = yaml.dump(errorYaml);

    await fs.writeFile('error.yaml', yamlStr);

    console.log('Boom error messages compiled successfully!');
}

main().catch((err) => {
    console.error('Error occurred:', err);
});