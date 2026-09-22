const fs=require("fs");
function read(p){return fs.readFileSync(p,"utf8")}
function assert(c,m){if(!c)throw new Error(m)}
for(const f of ["app.js","v2.js","v3.js","v4.js","v5.js","v6.js"])new Function(read(f));
const html=read("index.html"),css=read("style.css"),app=read("app.js"),v2=read("v2.js"),v3=read("v3.js"),v4=read("v4.js"),v5=read("v5.js"),v6=read("v6.js");
["app.js","v2.js","v3.js","v4.js","v5.js","v6.js"].forEach(f=>assert(html.includes('src="'+f+'"'),f+" not loaded"));
assert(html.includes('data-view="growth"'),"Growth navigation missing");
["openContactModal","openInteractionModal","openFollowupModal","relationshipScore","exportBackup","importBackup"].forEach(k=>assert(app.includes(k),"V1 missing "+k));
["editInteractionModal","deleteInteraction","snoozeFollowup","rescheduleFollowup","editFollowupModal","relationshipIntelligence","combinedTimeline"].forEach(k=>assert(v2.includes(k),"V2 missing "+k));
["STAGES","moveContactStage","pipelineDragStart","pipelineDrop","pipelineView","pipelineActivity","stageSelect"].forEach(k=>assert(v3.includes(k),"V3 missing "+k));
["openOpportunityModal","deleteOpportunity","setOpportunityStatus","opportunitiesView","openImportantDateModal","deleteImportantDate","importantDatesView","generatedBirthdayItems","dashboardV4Panels"].forEach(k=>assert(v4.includes(k),"V4 missing "+k));
["activityEvents","heatmapHtml","weeklyBuckets","healthDistribution","followupPerformance","networkGrowthRows","topContacts","networkingMomentum","advancedAnalyticsView"].forEach(k=>assert(v5.includes(k),"V5 missing "+k));
["BADGES","awardXP","levelInfo","evaluateBadges","evaluateGoals","openGoalModal","smartActions","dailyMission","growthView","earnedBadges","xpLog"].forEach(k=>assert(v6.includes(k),"V6 missing "+k));
assert(css.includes("xp-progress"),"V6 XP styles missing");
assert(css.includes("goal-grid"),"V6 goal styles missing");
assert(css.includes("badge-grid"),"V6 badge styles missing");
assert(css.includes("smart-action-list"),"V6 smart action styles missing");
assert(css.includes("@media(max-width:820px)"),"Responsive CSS missing");
console.log("Personal CRM V1-V6 smoke checks passed.");
