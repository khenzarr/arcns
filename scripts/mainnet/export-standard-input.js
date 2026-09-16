const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..", "..");
const outputDir = path.join(projectRoot, "deployments", "verification");
fs.mkdirSync(outputDir, { recursive: true });

const targets = [
  ["controller", "ArcNSController.sol", "ArcNSController"],
  ["registrar", "ArcNSBaseRegistrarV2.sol", "ArcNSBaseRegistrarV2"],
];

for (const [folder, source, contract] of targets) {
  const debugPath = path.join(
    projectRoot, "artifacts", "contracts", "v3", folder, source, `${contract}.dbg.json`
  );
  const debug = JSON.parse(fs.readFileSync(debugPath, "utf8"));
  const buildInfoPath = path.resolve(path.dirname(debugPath), debug.buildInfo);
  const buildInfo = JSON.parse(fs.readFileSync(buildInfoPath, "utf8"));
  const outputPath = path.join(outputDir, `${contract}.standard-input.json`);
  fs.writeFileSync(outputPath, `${JSON.stringify(buildInfo.input, null, 2)}\n`);
  console.log(outputPath);
}
