import * as cheerio from 'cheerio';
import type { BionicOptions } from '../types.js';

const DEFAULT_OPTIONS: Required<BionicOptions> = {
  maxPrefixRatio: 0.6,
  minWordLength: 3,
  maxPrefixLength: 8,
  skipUpperCase: true,
};

// Elements to skip during bionic transformation
const SKIP_ELEMENTS = new Set([
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',  // Headings
  'title',                              // Document title
  'header',                             // Header sections
  '.chapter-title',                     // Common chapter title class
  '.title',                             // Common title class
]);

export class HtmlProcessor {
  private options: Required<BionicOptions>;

  constructor(options: BionicOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Process HTML content to apply bionic reading format
   */
  public process(html: string): string {
    const $ = cheerio.load(html, {
      decodeEntities: false,
      xmlMode: true,
    });

    this.processTextNodes($);
    this.cleanHtml($);

    return $.html();
  }

  /**
   * Check if an element should be skipped for bionic transformation
   */
  private shouldSkipElement($: ReturnType<typeof cheerio.load>, element: any): boolean {
    if (!element || !element.name) {
      return false;
    }

    const tagName = element.name.toLowerCase();
    if (SKIP_ELEMENTS.has(tagName)) {
      return true;
    }

    // Check if any parent elements should be skipped
    let parent = $(element).parent();
    while (parent.length) {
      const parentTag = parent.prop('tagName')?.toLowerCase();
      if (SKIP_ELEMENTS.has(parentTag)) {
        return true;
      }
      // Check for title classes
      if (parent.hasClass('chapter-title') || parent.hasClass('title')) {
        return true;
      }
      parent = parent.parent();
    }

    return false;
  }

  /**
   * Check if the node is a whitespace-only text node
   */
  private isWhitespaceNode(node: any): boolean {
    return node.type === 'text' && /^\s*$/.test(node.data);
  }

  /**
   * Process text nodes to apply bionic reading format
   */
  private processTextNodes($: ReturnType<typeof cheerio.load>): void {
    // Using arrow function to preserve 'this' context
    $('*').contents().each((_: number, node: any) => {
      // Preserve pure whitespace nodes
      if (this.isWhitespaceNode(node)) {
        return;
      }

      if (node.type === 'text' && node.parent) {
        // Skip processing if the element or its parents should be skipped
        if (this.shouldSkipElement($, node.parent)) {
          // For skipped elements, preserve original spaces
          const text = $(node).text();
          $(node).replaceWith(text);
          return;
        }

        // Get the original text with all its spaces
        const originalText = $(node).text();
        
        // Find leading and trailing spaces
        const leadingSpace = originalText.match(/^\s+/)?.[0] || '';
        const trailingSpace = originalText.match(/\s+$/)?.[0] || '';
        
        // Process the main text content
        const mainText = originalText
          .replace(/&nbsp;/g, ' ')  // Replace &nbsp; with regular space
          .trim();                  // Remove leading/trailing spaces temporarily
        
        // Skip empty text nodes
        if (!mainText) return;

        // Process the main text while preserving internal spaces
        const processedText = mainText.replace(/\b([a-zA-Z'-]+)\b/g, (word: string) => {
          // Skip short words
          if (word.length < this.options.minWordLength) return word;
          
          // Skip uppercase words if configured
          if (this.options.skipUpperCase && word === word.toUpperCase()) return word;
          
          // Calculate prefix length
          const prefixLength = Math.min(
            Math.ceil(word.length * this.options.maxPrefixRatio),
            this.options.maxPrefixLength
          );

          // Bold the prefix
          return `<b>${word.slice(0, prefixLength)}</b>${word.slice(prefixLength)}`;
        });

        // Reattach the original leading and trailing spaces
        const finalText = leadingSpace + processedText + trailingSpace;
        
        // Replace the text node with the processed text
        $(node).replaceWith(finalText);
      }
    });
  }

  /**
   * Clean up HTML by removing unnecessary elements and attributes
   */
  private cleanHtml($: ReturnType<typeof cheerio.load>): void {
    // Remove empty elements, but keep spacing elements
    $('*:empty').not('img, br, hr, input, meta, link').remove();
  }
}
