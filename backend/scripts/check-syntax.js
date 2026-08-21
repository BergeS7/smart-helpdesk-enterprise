const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const roots = [path.resolve("server.js"), path.resolve("src"), path.resolve("test")];
const files = [];

function collect(target) {
  const stat = fs.statSync(target);
  if (stat.isDirectory()) {
    for (const entry of fs.readdirSync(target)) collect(path.join(target, entry));
  } else if (target.endsWith(".js")) files.push(target);
}

for (const root of roots) collect(root);

const failures = [];
for (const file of files) {
  const result = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
  if (result.status !== 0) failures.push(`${path.relative(process.cwd(), file)}\n${result.stderr.trim()}`);
}

if (failures.length) {
  console.error(`Falhas de sintaxe encontradas:\n${failures.join("\n\n")}`);
  process.exit(1);
}

console.log(`Sintaxe validada em ${files.length} arquivo(s) do backend.`);
