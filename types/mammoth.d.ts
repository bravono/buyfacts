// Type definitions for mammoth
declare module "mammoth" {
  export interface ConversionResult {
    value: string;
    messages: Array<{
      type: string;
      message: string;
    }>;
  }

  export interface Options {
    styleMap?: string | string[];
    includeDefaultStyleMap?: boolean;
    includeEmbeddedStyleMap?: boolean;
    convertImage?: unknown;
    ignoreEmptyParagraphs?: boolean;
    idPrefix?: string;
  }

  export function convertToHtml(
    input: { arrayBuffer: ArrayBuffer } | { buffer: Buffer } | { path: string },
    options?: Options
  ): Promise<ConversionResult>;

  export function extractRawText(
    input: { arrayBuffer: ArrayBuffer } | { buffer: Buffer } | { path: string }
  ): Promise<ConversionResult>;
}
