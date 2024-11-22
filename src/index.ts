import { Command } from 'commander';
import inquirer from 'inquirer';
import ora from 'ora';
import { EpubProcessor } from './utils/epubProcessor.js';
import type { BionicOptions, ConversionResult } from './types.js';
import { dirname, join, resolve } from 'path';
import { existsSync, readFileSync } from 'fs';
import { startServer } from './server.js';
import chalk from 'chalk';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'));
const version = packageJson.version;

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

/**
 * Convert an EPUB file to bionic reading format
 */
export async function convertToBionic(
  inputPath: string,
  options: BionicOptions = {}
): Promise<ConversionResult> {
  const spinner = ora('Starting conversion process...').start();
  const processor = new EpubProcessor(options);
  
  try {
    spinner.text = 'Processing EPUB file...';
    const result = await processor.processEpub(inputPath);
    spinner.succeed('Conversion completed successfully');
    return result;
  } catch (error) {
    spinner.fail('Conversion failed');
    console.error('Error details:', error);
    throw error;
  }
}

interface CustomOptions {
  maxPrefixRatio: number;
  minWordLength: number;
  maxPrefixLength: number;
  processUppercase: boolean;
}

async function promptForOptions(): Promise<{ filepath: string; options: BionicOptions }> {
  const modeAnswer = await inquirer.prompt<{ mode: string }>({
    type: 'list',
    name: 'mode',
    message: 'Choose conversion mode:',
    choices: ['Basic (recommended defaults)', 'Custom (configure options)']
  });

  const fileAnswer = await inquirer.prompt<{ filepath: string }>({
    type: 'input',
    name: 'filepath',
    message: 'Enter the path to your EPUB file:',
    validate: (input: string) => {
      const fullPath = resolve(input);
      if (!existsSync(fullPath)) {
        return 'File does not exist. Please enter a valid path.';
      }
      if (!input.toLowerCase().endsWith('.epub')) {
        return 'File must be an EPUB file.';
      }
      return true;
    }
  });

  let options: BionicOptions = {};

  if (modeAnswer.mode === 'Custom (configure options)') {
    const maxPrefixRatioAnswer = await inquirer.prompt<{ maxPrefixRatio: number }>({
      type: 'number',
      name: 'maxPrefixRatio',
      message: 'Maximum ratio of letters to bold (0-1):',
      default: 0.6,
      validate: (input: any): boolean | string => {
        const num = parseFloat(input);
        if (isNaN(num) || num < 0 || num > 1) {
          return 'Please enter a number between 0 and 1';
        }
        return true;
      }
    });

    const minWordLengthAnswer = await inquirer.prompt<{ minWordLength: number }>({
      type: 'number',
      name: 'minWordLength',
      message: 'Minimum word length to process:',
      default: 3,
      validate: (input: any): boolean | string => {
        const num = parseInt(input);
        if (isNaN(num) || num <= 0) {
          return 'Please enter a positive number';
        }
        return true;
      }
    });

    const maxPrefixLengthAnswer = await inquirer.prompt<{ maxPrefixLength: number }>({
      type: 'number',
      name: 'maxPrefixLength',
      message: 'Maximum prefix length:',
      default: 8,
      validate: (input: any): boolean | string => {
        const num = parseInt(input);
        if (isNaN(num) || num <= 0) {
          return 'Please enter a positive number';
        }
        return true;
      }
    });

    const processUppercaseAnswer = await inquirer.prompt<{ processUppercase: boolean }>({
      type: 'confirm',
      name: 'processUppercase',
      message: 'Process uppercase words?',
      default: false
    });

    options = {
      maxPrefixRatio: maxPrefixRatioAnswer.maxPrefixRatio,
      minWordLength: minWordLengthAnswer.minWordLength,
      maxPrefixLength: maxPrefixLengthAnswer.maxPrefixLength,
      skipUpperCase: !processUppercaseAnswer.processUppercase
    };
  }

  return { filepath: fileAnswer.filepath, options };
}

// CLI support
if (import.meta.url.endsWith(process.argv[1]) || process.argv[1].includes('ts-node')) {
  const program = new Command();

  program
    .name('bionic-epub')
    .description('Convert EPUB files to bionic reading format')
    .version(version)
    .option('-s, --server', 'Run in server mode')
    .option('-i, --interactive', 'Run in interactive mode (default)')
    .option('-f, --file <path>', 'Input EPUB file path')
    .option('-o, --output <path>', 'Output file path')
    .option('-p, --prefix-ratio <ratio>', 'Maximum ratio of letters to bold (0-1)')
    .option('-m, --min-length <length>', 'Minimum word length to process')
    .option('-x, --max-prefix <length>', 'Maximum prefix length')
    .option('-u, --process-uppercase', 'Process uppercase words');

  program.parse();

  const options = program.opts();

  (async () => {
    console.log(chalk.cyan('\n🔤 Bionic EPUB Converter 📚\n'));

    if (options.server) {
      console.log(chalk.yellow('Starting server mode...'));
      await startServer();
      return;
    }

    try {
      let filepath: string;
      let bionicOptions: BionicOptions = {};

      if (options.interactive || (!options.file && !options.server)) {
        const promptResult = await promptForOptions();
        filepath = promptResult.filepath;
        bionicOptions = promptResult.options;
      } else {
        if (!options.file) {
          console.error(chalk.red('Error: Please provide an input file path'));
          process.exit(1);
        }
        filepath = options.file;
        bionicOptions = {
          maxPrefixRatio: options.prefixRatio ? parseFloat(options.prefixRatio) : undefined,
          minWordLength: options.minLength ? parseInt(options.minLength) : undefined,
          maxPrefixLength: options.maxPrefix ? parseInt(options.maxPrefix) : undefined,
          skipUpperCase: !options.processUppercase
        };
      }

      const result = await convertToBionic(filepath, bionicOptions);
      
      if (result.success) {
        console.log(chalk.green(`\n✨ Success! Output saved to: ${result.outputPath}`));
      }
    } catch (error) {
      console.error(chalk.red('\n❌ Failed to convert EPUB:'), error);
      process.exit(1);
    }
  })();
}
