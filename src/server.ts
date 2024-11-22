import express, { Request, Response } from 'express';
import fileUpload from 'express-fileupload';
import { convertToBionic } from './index.js';
import path from 'path';
import { tmpdir } from 'os';
import { writeFile } from 'fs/promises';
import type { UploadedFile } from 'express-fileupload';

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(fileUpload());

const convertHandler = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.files?.epub) {
            res.status(400).send('No EPUB file uploaded');
            return;
        }

        const file = req.files.epub as UploadedFile;
        const tempPath = path.join(tmpdir(), `${Date.now()}-${file.name}`);
        
        await writeFile(tempPath, file.data);

        // Convert the file
        const result = await convertToBionic(tempPath, req.body);

        if (result.success && result.outputPath) {
            res.download(result.outputPath);
        } else {
            res.status(500).send('Conversion failed');
        }
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).send('Internal server error');
    }
};

app.post('/convert', convertHandler);

app.get('/health', (_req: Request, res: Response) => {
    res.send('Server is running');
});

export function startServer() {
    return new Promise<void>((resolve) => {
        app.listen(port, () => {
            console.log(`Server running at http://localhost:${port}`);
            resolve();
        });
    });
}
