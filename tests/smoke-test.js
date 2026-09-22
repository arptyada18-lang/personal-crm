const fs=require("fs");
function read(p){return fs.readFileSync(p,"utf8")}
function assert(c,m){if(!c)throw new Error(m)}
for(const f of ["app.js","v2.js","v3.js","v4.js"])new Function(read(f));
const html=read("index.html"),css=read("style.css"),app=read("app.js"),v2=read("v2.js"),v3=read("v3.js"),v4=read("v4.js");
assert(html.includes('src="app.js"'),"app.js not loaded");
assert(html.includes('src="v2.js"'),"v2.js not loaded");
assert(html.includes('src="v3.js"'),"v3.js not loaded");
assert(html.includes('src="v4.js"'),"v4.js not loaded");
assert(html.includes('data-view="pipeline"'),"Pipeline navigation missing");
assert(html.includes('data-view="opportunities"'),"Opportunities navigation missing");
assert(html.includes('data-view="dates"'),"Important dates navigation missing");
["openContactModal","openInteractionModal","openFollowupModal","relationshipScore","exportBackup","importBackup"].forEach(k=>assert(app.includes(k),"V1 missing "+k));
["editInteractionModal","deleteInteraction","snoozeFollowup","rescheduleFollowup","editFollowupModal","relationshipIntelligence","combinedTimeline"].forEach(k=>assert(v2.includes(k),"V2 missing "+k));
["STAGES","moveContactStage","pipelineDragStart","pipelineDrop","pipelineView","pipelineActivity","stageSelect"].forEach(k=>assert(v3.includes(k),"V3 missing "+k));
["openOpportunityModal","deleteOpportunity","setOpportunityStatus","opportunitiesView","openImportantDateModal","deleteImportantDate","importantDatesView","generatedBirthdayItems","dashboardV4Panels"].forEach(k=>assert(v4.includes(k),"V4 missing "+k));
assert(css.includes("opportunity-board"),"V4 opportunity styles missing");
assert(css.includes("date-card"),"V4 date styles missing");
assert(css.includes("risk-pill"),"V4 deadline risk styles missing");
assert(css.includes("@media(max-width:820px)"),"Responsive CSS missing");
console.log("Personal CRM V1-V4 smoke checks passed.");
