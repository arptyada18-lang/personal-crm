const fs=require("fs");
function read(p){return fs.readFileSync(p,"utf8")}
function assert(c,m){if(!c)throw new Error(m)}
new Function(read("app.js"));
const html=read("index.html"),css=read("style.css"),js=read("app.js");
assert(html.includes('src="app.js"'),"app.js not loaded");
assert(html.includes('href="style.css"'),"style.css not loaded");
["openContactModal","openInteractionModal","openFollowupModal","relationshipScore","exportBackup","importBackup"].forEach(k=>assert(js.includes(k),"Missing "+k));
assert(css.includes("@media(max-width:820px)"),"Responsive CSS missing");
console.log("Personal CRM V1 smoke checks passed.");
