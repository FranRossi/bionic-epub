# Bionic EPUB Converter

A TypeScript tool to convert EPUB files to bionic reading format by bolding the first part of each word to improve reading speed and comprehension.

## Features

- Convert EPUB files to bionic reading format
- Configurable options for word processing
- Preserves EPUB structure and formatting
- Simple command-line interface
- TypeScript implementation with full type safety

## Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

## Usage

### Command Line

```bash
npm start
```


## Configuration Options

| Option | Description | Default |
|--------|-------------|---------|
| `maxPrefixRatio` | Maximum length of prefix to bold (as a percentage of word length) | 0.6 (60%) |
| `minWordLength` | Minimum word length to apply bionic reading | 3 |
| `maxPrefixLength` | Maximum prefix length in characters | 8 |
| `skipUpperCase` | Whether to skip words in all caps (usually acronyms) | true |

## Development

Build the project:
```bash
npm run build
```

## License

MIT
