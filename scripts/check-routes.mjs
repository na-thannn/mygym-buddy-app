import fs from "fs";
import path from "path";

const routesDir = path.resolve("src", "routes");

function walk(dir) {
  const res = [];
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const stat = fs.statSync(p);
    if (stat.isDirectory()) res.push(...walk(p));
    else if (
      name.endsWith(".ts") ||
      name.endsWith(".tsx") ||
      name.endsWith(".js") ||
      name.endsWith(".jsx")
    )
      res.push(p);
  }
  return res;
}

(async () => {
  console.log("Checking route files for import-time errors...");
  const files = walk(routesDir);
  for (const file of files) {
    const rel = path.relative(process.cwd(), file).replace(/\\/g, "/");
    try {
      console.log(`\n-> importing ${rel}`);
      // dynamic import using file:// URL
      const url = `file://${file}`;
      await import(url);
      console.log(`   OK`);
    } catch (err) {
      console.error(`   ERROR importing ${rel}:`);
      console.error(err && err.stack ? err.stack : err);
    }
  }
  console.log("\nDone.");
})();
