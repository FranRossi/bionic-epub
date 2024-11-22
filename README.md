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

You can run this tool in two different ways: through the CLI or as a web server.

### CLI Mode

```bash
# Interactive mode (recommended)
npm start

# This will prompt you to:
# 1. Choose between Basic or Custom configuration
# 2. Enter the path to your EPUB file
# 3. If Custom mode is selected, configure additional options
```

### Web Server Mode

```bash
# Start the web server
npm run server

# The server will start at http://localhost:3000 with the following endpoints:
# - POST /convert: Upload an EPUB file for conversion
# - GET /health: Check server status
```

#### API Endpoints

`POST /convert`
- Upload an EPUB file using multipart/form-data
- The file should be sent with the key 'epub'
- Optional configuration can be sent in the request body:
  ```json
  {
    "maxPrefixRatio": 0.6,
    "minWordLength": 3,
    "maxPrefixLength": 8,
    "skipUpperCase": true
  }
  ```

### Configuration Options

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
