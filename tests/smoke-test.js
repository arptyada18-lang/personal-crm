const fs=require("fs");
function read(p){return fs.readFileSync(p,"utf8")}
function assert(c,m){if(!c)throw new Error(m)}
for(const f of ["app.js","v2.js","v3.js","v4.js","v5.js","v6.js","v7.js","v8.js","sw.js"])new Function(read(f));
JSON.parse(read("manifest.json"));
const html=read("index.html"),css=read("style.css"),app=read("app.js"),v2=read("v2.js"),v3=read("v3.js"),v4=read("v4.js"),v5=read("v5.js"),v6=read("v6.js"),v7=read("v7.js"),v8=read("v8.js"),sw=read("sw.js"),manifest=read("manifest.json");
["app.js","v2.js","v3.js","v4.js","v5.js","v6.js","v7.js","v8.js"].forEach(f=>assert(html.includes('src="'+f+'"'),f+" not loaded"));
assert(html.includes('data-view="network"'),"Network Map navigation missing");
assert(html.includes('data-view="reports"'),"Reports navigation missing");
assert(html.includes('class="skip-link"'),"Skip link missing");
assert(html.includes('id="mainContent"'),"Main content target missing");
["openContactModal","openInteractionModal","openFollowupModal","relationshipScore","exportBackup","importBackup"].forEach(k=>assert(app.includes(k),"V1 missing "+k));
["editInteractionModal","deleteInteraction","snoozeFollowup","rescheduleFollowup","editFollowupModal","relationshipIntelligence","combinedTimeline"].forEach(k=>assert(v2.includes(k),"V2 missing "+k));
["STAGES","moveContactStage","pipelineDragStart","pipelineDrop","pipelineView","pipelineActivity","stageSelect"].forEach(k=>assert(v3.includes(k),"V3 missing "+k));
["openOpportunityModal","deleteOpportunity","setOpportunityStatus","opportunitiesView","openImportantDateModal","deleteImportantDate","importantDatesView","generatedBirthdayItems","dashboardV4Panels"].forEach(k=>assert(v4.includes(k),"V4 missing "+k));
["activityEvents","heatmapHtml","weeklyBuckets","healthDistribution","followupPerformance","networkGrowthRows","topContacts","networkingMomentum","advancedAnalyticsView"].forEach(k=>assert(v5.includes(k),"V5 missing "+k));
["BADGES","awardXP","levelInfo","evaluateBadges","evaluateGoals","openGoalModal","smartActions","dailyMission","growthView","earnedBadges","xpLog"].forEach(k=>assert(v6.includes(k),"V6 missing "+k));
["validateStateObject","repairStateObject","makeSnapshot","createManualSnapshot","restoreSnapshot","restoreLastGood","exportRecoveryBundle","dataHealth","installPersonalCRM"].forEach(k=>assert(v7.includes(k),"V7 missing "+k));
["networkMapSvg","networkMapView","reportMetrics","reportsView","openReviewModal","exportContactsCSV","exportInteractionsCSV","exportFollowupsCSV","exportOpportunitiesCSV","openCommandPalette","toggleAccessibility","releaseAudit"].forEach(k=>assert(v8.includes(k),"V8 missing "+k));
assert(sw.includes('personal-crm-v8'),"V8 cache name missing");
assert(sw.includes('"./v8.js"'),"v8.js missing from offline cache");
assert(manifest.includes('"display": "standalone"'),"Standalone PWA display missing");
["network-map-svg","report-table","command-palette","shortcut-grid","accessibility-list","release-audit"].forEach(k=>assert(css.includes(k),"V8 styles missing "+k));
assert(css.includes("@media print"),"V8 print styles missing");
assert(css.includes("@media(max-width:820px)"),"Responsive CSS missing");
console.log("Personal CRM V1-V8 smoke checks passed.");
