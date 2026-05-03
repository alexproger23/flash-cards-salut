const fs = require("fs");
const path = require("path");

const replacements = [
  {
    files: [
      path.join(__dirname, "..", "node_modules", "@salutejs", "client", "esm", "assistant-d559dcae.js"),
      path.join(__dirname, "..", "node_modules", "@salutejs", "client", "dist", "assistant-f5cc74c7.js"),
    ],
    search: [
      "                        if (status !== 'connecting') {",
      "                            throw e;",
      "                        }",
    ].join("\n"),
    replace: [
      "                        if (status !== 'connecting') {",
      "                            emit('error', e);",
      "                            return;",
      "                        }",
    ].join("\n"),
  },
  {
    files: [
      path.join(__dirname, "..", "node_modules", "@salutejs", "client", "esm", "createAssistantDevOrigin.js"),
      path.join(__dirname, "..", "node_modules", "@salutejs", "client", "dist", "createAssistantDevOrigin.js"),
    ],
    search:
      "            owner: event.appInfo.applicationId === (appInfo === null || appInfo === void 0 ? void 0 : appInfo.applicationId),",
    replace:
      "            owner: (event.appInfo === null || event.appInfo === void 0 ? void 0 : event.appInfo.applicationId) === (appInfo === null || appInfo === void 0 ? void 0 : appInfo.applicationId),",
  },
];

let patchedCount = 0;

for (const replacement of replacements) {
  for (const target of replacement.files) {
    if (!fs.existsSync(target)) {
      continue;
    }

    const source = fs.readFileSync(target, "utf8");

    if (source.includes(replacement.replace)) {
      patchedCount += 1;
      continue;
    }

    if (!source.includes(replacement.search)) {
      throw new Error(`Patch target not found in ${target}`);
    }

    fs.writeFileSync(target, source.replace(replacement.search, replacement.replace), "utf8");
    patchedCount += 1;
  }
}

if (patchedCount === 0) {
  throw new Error("No Salute client files were patched");
}

console.log(`Patched @salutejs/client in ${patchedCount} file(s).`);
