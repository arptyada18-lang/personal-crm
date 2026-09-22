const fs=require("fs");
function read(p){return fs.readFileSync(p,"utf8")}
function assert(c,m){if(!c)throw new Error(m)}
for(const f of ["app.js","v2.js"])new Function(read(f));
const html=read("index.html"),css=read("style.css"),app=read("app.js"),v2=read("v2.js");
assert(html.includes('src="app.js"'),"app.js not loaded");
assert(html.includes('src="v2.js"'),"v2.js not loaded");
assert(html.includes('href="style.css"'),"style.css not loaded");
["openContactModal","openInteractionModal","openFollowupModal","relationshipScore","exportBackup","importBackup"].forEach(k=>assert(app.includes(k),"V1 missing "+k));
["editInteractionModal","deleteInteraction","snoozeFollowup","rescheduleFollowup","editFollowupModal","relationshipIntelligence","combinedTimeline"].forEach(k=>assert(v2.includes(k),"V2 missing "+k));
assert(css.includes("intelligence-card"),"V2 intelligence styles missing");
assert(css.includes("@media(max-width:820px)"),"Responsive CSS missing");
console.log("Personal CRM V1-V2 smoke checks passed.");
