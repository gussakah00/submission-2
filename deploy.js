const { execSync } = require("child_process");
const fs = require("fs");

// Build project
console.log("🛠 Building project...");
execSync("npm run build", { stdio: "inherit" });

// Check if build succeeded
if (!fs.existsSync("dist")) {
  console.error("❌ Build failed!");
  process.exit(1);
}

console.log("✅ Build successful!");

// Deployment instructions
console.log(`
📋 Deployment Instructions:

1. GitHub Pages:
   - Push dist folder to gh-pages branch
   - atau: npx gh-pages -d dist

2. Firebase Hosting:
   - firebase init hosting
   - firebase deploy

3. Netlify:
   - Drag dist folder to netlify.com
   - atau: netlify deploy --dir=dist --prod

Pastikan URL deployment dimasukkan ke STUDENT.txt!
`);
