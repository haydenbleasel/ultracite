export interface Diagnostic {
  column: number;
  file: string;
  help?: string;
  line: number;
  message: string;
  /** The linter's original diagnostic object, preserved for the handoff file. */
  raw: unknown;
  rule: string;
  severity: string;
  url?: string;
}

export interface LinterAdapter {
  /**
   * Run the linter's autofix pass with piped output and return the
   * diagnostics that remain unfixed.
   */
  fixAndCollect: (files: string[], passthrough: string[]) => Diagnostic[];
  name: string;
  /** Re-run the fix pass on a single file and return what still remains. */
  verify: (file: string, passthrough: string[]) => Diagnostic[];
}
