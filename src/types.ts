export type BionicOptions = {
  /**
   * Maximum length of prefix to bold (as a percentage of word length)
   * Default: 0.6 (60%)
   */
  maxPrefixRatio?: number;

  /**
   * Minimum word length to apply bionic reading
   * Default: 3
   */
  minWordLength?: number;

  /**
   * Maximum prefix length in characters
   * Default: 8
   */
  maxPrefixLength?: number;

  /**
   * Whether to skip words in all caps (usually acronyms)
   * Default: true
   */
  skipUpperCase?: boolean;
};

export type ProcessedFile = {
  path: string;
  content: string;
};

export type ConversionResult = {
  success: boolean;
  error?: Error;
  outputPath?: string;
};
