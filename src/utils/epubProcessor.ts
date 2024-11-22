import fs from 'fs-extra';
import { join, dirname, relative, basename, extname } from 'path';
import { createRequire } from 'module';
import { EventEmitter } from 'events';
const require = createRequire(import.meta.url);

// Define EPub constructor type
type EPubConstructor = new (epubPath: string) => EPubWithZip;

// Load the epub module with error handling
let EPub: EPubConstructor;
try {
  EPub = require('epub');
  if (!EPub) {
    throw new Error('Failed to load epub module');
  }
} catch (error) {
  console.error('Error loading epub module:', error);
  throw error;
}

import JSZip from 'jszip';
import { HtmlProcessor } from './htmlProcessor.js';
import type { BionicOptions, ConversionResult } from '../types.js';

interface EPubManifestItem {
  href: string;
  id: string;
  mediaType?: string;
}

interface EPubManifest {
  [key: string]: EPubManifestItem;
}

interface EPubWithZip extends EventEmitter {
  manifest: EPubManifest;
  zip: {
    files: {
      [key: string]: {
        _data: Buffer;
      };
    };
  };
  parse(): void;
}

export class EpubProcessor {
  private htmlProcessor: HtmlProcessor;
  private tempDir: string;

  constructor(options: BionicOptions = {}) {
    this.htmlProcessor = new HtmlProcessor(options);
    this.tempDir = join(process.cwd(), 'temp');
  }

  /**
   * Process an EPUB file and convert it to bionic reading format
   */
  public async processEpub(inputPath: string): Promise<ConversionResult> {
    let workDir: string | undefined;
    try {
      console.log('Creating temporary directory...');
      // Create temp directory
      await fs.ensureDir(this.tempDir);
      workDir = await this.createTempDir();
      console.log(`Created temporary directory: ${workDir}`);

      // Extract EPUB
      console.log('Extracting EPUB contents...');
      const files = await this.extractEpub(inputPath, workDir);
      console.log(`Extracted ${files.length} files`);

      // Process HTML files
      console.log('Processing HTML files...');
      let processedCount = 0;
      for (const file of files) {
        if (file.toLowerCase().endsWith('.html') || file.toLowerCase().endsWith('.xhtml') || file.toLowerCase().endsWith('.htm')) {
          console.log(`Processing ${basename(file)}...`);
          const content = await fs.readFile(file, 'utf-8');
          const processedContent = this.htmlProcessor.process(content);
          await fs.writeFile(file, processedContent, 'utf-8');
          processedCount++;
        }
      }
      console.log(`Processed ${processedCount} HTML files`);

      // Create output filename
      const outputPath = this.createOutputPath(inputPath);
      console.log(`Creating output file: ${outputPath}`);

      // Repack EPUB
      console.log('Repacking EPUB...');
      await this.repackEpub(workDir, outputPath);

      console.log('Conversion completed successfully');
      return {
        success: true,
        outputPath,
      };
    } catch (error) {
      console.error('Error during conversion:', error);
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    } finally {
      // Clean up
      console.log('Cleaning up temporary files...');
      if (workDir) {
        await fs.remove(workDir);
      }
    }
  }

  /**
   * Create a temporary directory
   */
  private async createTempDir(): Promise<string> {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    const tempDir = join(this.tempDir, `epub-${timestamp}-${random}`);
    await fs.ensureDir(tempDir);
    return tempDir;
  }

  /**
   * Extract EPUB file to a directory
   */
  private async extractEpub(epubPath: string, outputDir: string): Promise<string[]> {
    try {
      if (!fs.existsSync(epubPath)) {
        throw new Error(`EPUB file not found: ${epubPath}`);
      }

      console.log('Reading EPUB file...');
      const epubData = await fs.readFile(epubPath);
      const zip = await JSZip.loadAsync(epubData);
      
      console.log('Extracting files...');
      const files: string[] = [];

      for (const [path, zipObj] of Object.entries(zip.files)) {
        if (!zipObj.dir) {
          const filePath = join(outputDir, path);
          await fs.ensureDir(dirname(filePath));
          const content = await zipObj.async('nodebuffer');
          await fs.writeFile(filePath, content);
          files.push(filePath);
          console.log(`Extracted: ${path} -> ${filePath}`);
        }
      }

      console.log(`Extracted ${files.length} files from EPUB`);
      return files;
    } catch (error) {
      console.error('Error in extractEpub:', error);
      throw error;
    }
  }

  /**
   * Repack directory into EPUB file
   */
  private async repackEpub(inputDir: string, outputPath: string): Promise<void> {
    const zip = new JSZip();

    // Read all files in the directory
    console.log('Reading files for repacking...');
    const files = await this.getAllFiles(inputDir);
    console.log(`Found ${files.length} files to pack`);

    // Add each file to the zip
    for (const file of files) {
      const relativePath = relative(inputDir, file);
      console.log(`Adding to EPUB: ${relativePath}`);
      const content = await fs.readFile(file);
      zip.file(relativePath, content);
    }

    // Generate the EPUB file
    console.log('Generating EPUB file...');
    const content = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 9 }
    });

    // Write the EPUB file
    console.log(`Writing EPUB to: ${outputPath}`);
    await fs.writeFile(outputPath, content);
  }

  /**
   * Get all files in a directory recursively
   */
  private async getAllFiles(dir: string): Promise<string[]> {
    const files: string[] = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...await this.getAllFiles(fullPath));
      } else {
        files.push(fullPath);
      }
    }

    return files;
  }

  /**
   * Create output path for processed EPUB
   */
  private createOutputPath(inputPath: string): string {
    const dir = dirname(inputPath);
    const ext = extname(inputPath);
    const base = basename(inputPath, ext);
    return join(dir, `${base}-bionic${ext}`);
  }

  /**
   * Clean up temporary files
   */
  public async cleanup(): Promise<void> {
    if (await fs.pathExists(this.tempDir)) {
      await fs.remove(this.tempDir);
    }
  }
}
