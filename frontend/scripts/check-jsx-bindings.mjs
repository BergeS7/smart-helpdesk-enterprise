/**
 * Responsabilidade: Automação de check jsx bindings; executa uma tarefa operacional ou de geração do projeto.
 */
import fs from "node:fs";
import path from "node:path";
import { parse } from "@babel/parser";
import traverseModule from "@babel/traverse";

const traverse = traverseModule.default ?? traverseModule;
const sourceRoot = path.resolve("src/app");
const errors = [];
const allowedGlobals = new Set([
  "AbortController", "Array", "Blob", "Boolean", "clearInterval", "clearTimeout",
  "confirm", "console", "CSS", "CustomEvent", "Date", "document", "Error", "Event", "fetch", "File",
  "FileReader", "FormData", "Headers", "Intl", "JSON", "localStorage", "Map",
  "Math", "navigator", "Number", "Object", "Promise", "Record", "RequestInit",
  "sessionStorage", "Set", "setInterval", "setTimeout", "String", "URL",
  "URLSearchParams", "window",
]);

function visitDirectory(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) visitDirectory(target);
    else if (/\.[jt]sx$/.test(entry.name)) checkFile(target);
  }
}

function checkFile(file) {
  const source = fs.readFileSync(file, "utf8");
  const ast = parse(source, {
    sourceType: "module",
    plugins: ["jsx", "typescript"],
  });

  traverse(ast, {
    ReferencedIdentifier(identifierPath) {
      const name = identifierPath.node.name;
      if (identifierPath.findParent((parent) => parent.node.type.startsWith("TS"))) return;
      if (identifierPath.parentPath.isExportSpecifier() && identifierPath.parent.exportKind === "type") return;
      if (identifierPath.scope.hasBinding(name) || allowedGlobals.has(name)) return;
      errors.push(
        `${path.relative(process.cwd(), file)}:${identifierPath.node.loc?.start.line ?? "?"} — ${name} não foi importado ou declarado`,
      );
    },
    JSXOpeningElement(elementPath) {
      const tag = elementPath.node.name;
      if (tag.type !== "JSXIdentifier" || !/^[A-Z]/.test(tag.name)) return;
      if (elementPath.scope.hasBinding(tag.name)) return;
      errors.push(
        `${path.relative(process.cwd(), file)}:${tag.loc?.start.line ?? "?"} — ${tag.name} não foi importado ou declarado`,
      );
    },
  });
}

visitDirectory(sourceRoot);

if (errors.length) {
  console.error("Identificadores sem vínculo encontrados:\n" + [...new Set(errors)].join("\n"));
  process.exit(1);
}

console.log("Verificação estática concluída: todos os identificadores possuem vínculo local.");
