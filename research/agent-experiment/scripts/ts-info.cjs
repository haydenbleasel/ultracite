// Exported names and their types (as the checker prints them), plus type errors, for one file.
// Uses the TypeScript that @typescript-eslint/parser resolves (6.0.3) from the Ultracite repo.
"use strict";

const { join } = require("node:path");
const { tools } = require("./lib.cjs");

const ts = require(join(tools.dirs.typescript, "lib/typescript.js"));

function tsInfo(file) {
  const program = ts.createProgram([file], {
    strict: true,
    noEmit: true,
    skipLibCheck: true,
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    lib: ["lib.es2023.d.ts", "lib.dom.d.ts"],
    types: [],
  });
  const checker = program.getTypeChecker();
  const source = program.getSourceFile(file);
  const diagnostics = [
    ...program.getSyntacticDiagnostics(source),
    ...program.getSemanticDiagnostics(source),
  ].map((d) => {
    const pos =
      d.start === undefined
        ? null
        : source.getLineAndCharacterOfPosition(d.start);
    return `${pos ? `${pos.line + 1}:${pos.character + 1} ` : ""}TS${d.code} ${ts.flattenDiagnosticMessageText(d.messageText, " ")}`;
  });
  const moduleSymbol = checker.getSymbolAtLocation(source);
  const exports = {};
  for (const sym of moduleSymbol
    ? checker.getExportsOfModule(moduleSymbol)
    : []) {
    const target =
      sym.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(sym) : sym;
    const type = checker.getTypeOfSymbolAtLocation(target, source);
    exports[sym.getName()] = checker.typeToString(
      type,
      undefined,
      ts.TypeFormatFlags.NoTruncation
    );
  }
  return { exports, typeErrors: diagnostics };
}

module.exports = { tsInfo };

if (require.main === module)
  console.log(JSON.stringify(tsInfo(process.argv[2]), null, 2));
