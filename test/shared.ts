import { DOMParser } from '@xmldom/xmldom';
import fs from 'fs/promises';

export const getXForm = async (fileName: string) => {
    const fileContents = await fs.readFile(`./test/forms/${fileName}`);

    return String(fileContents);
};

export const parser = new DOMParser();
