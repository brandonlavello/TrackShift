declare module 'fit-file-parser' {
  type FitParserOptions = {
    force?: boolean;
    speedUnit?: string;
    lengthUnit?: string;
    temperatureUnit?: string;
    pressureUnit?: string;
    elapsedRecordField?: boolean;
    mode?: 'cascade' | 'list' | 'both';
  };

  export default class FitParser {
    constructor(options?: FitParserOptions);
    parse(buffer: ArrayBuffer | Uint8Array, callback: (error: string | null, data: unknown) => void): void;
    parseAsync(buffer: ArrayBuffer | Uint8Array): Promise<unknown>;
  }
}
