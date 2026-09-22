// Personal CRM — Advanced V7: PWA + snapshots + recovery + data health
(function(){
  const V7_VERSION=7;
  const LAST_GOOD_KEY="personal-crm-last-good-v7";
  const SNAPSHOT_LIMIT=5;
  let deferredInstallPrompt=null;

  function cloneV7(x){return JSON.parse(JSON.stringify(x))}
  function withoutSnapshots(source){
    const copy=cloneV7(source);
    copy.snapshots=[];
    return copy;
  }
  function requiredArrays(){
    return ["contacts","interactions","followUps","pipelineActivity","opportunities","importantDates","networkingGoals","earnedBadges","xpLog","analyticsSnapshots","snapshots"];
  }

  function validateStateObject(s){
    const issues=[];
    if(!s||typeof s!=="object")return ["State is not an object."];
    requiredArrays().forEach(function(k){
      if(!Array.isArray(s[k]))issues.push(k+" must be an array.");
    });
    if(typeof s.xp!=="number"||!Number.isFinite(s.xp))issues.push("xp must be a valid number.");
    const ids={};
    (Array.isArray(s.contacts)?s.contacts:[]).forEach(function(c,index){
      if(c==null||typeof c!=="object")issues.push("Contact #"+(index+1)+" is invalid.");
      else{
        if(!c.id)issues.push("A contact is missing an id.");
        if(!String(c.name||"").trim())issues.push("Contact "+(c.id||index+1)+" is missing a name.");
        if(c.id){
          const key="contact:"+c.id;
          if(ids[key])issues.push("Duplicate contact id: "+c.id);
          ids[key]=true;
        }
      }
    });
    const contactIds=new Set((Array.isArray(s.contacts)?s.contacts:[]).map(function(c){return c&&c.id}));
    ["interactions","followUps","opportunities"].forEach(function(k){
      (Array.isArray(s[k])?s[k]:[]).forEach(function(item){
        if(item&&item.contactId&&!contactIds.has(item.contactId))issues.push(k+" contains an orphaned contact reference.");
      });
    });
    return Array.from(new Set(issues));
  }

  function repairStateObject(input){
    const s=input&&typeof input==="object"?input:{};
    requiredArrays().forEach(function(k){if(!Array.isArray(s[k]))s[k]=[]});
    if(!s.profile||typeof s.profile!=="object")s.profile={name:"My Network",networkingGoal:"Build meaningful relationships consistently."};
    if(!s.settings||typeof s.settings!=="object")s.settings={theme:"midnight"};
    if(typeof s.xp!=="number"||!Number.isFinite(s.xp))s.xp=0;
    s.schemaVersion=V7_VERSION;
    return s;
  }

  function storeLastGood(){
    try{
      const clean=withoutSnapshots(state);
      if(validateStateObject(repairStateObject(clean)).length===0){
        localStorage.setItem(LAST_GOOD_KEY,JSON.stringify(clean));
      }
    }catch(e){}
  }

  function makeSnapshot(reason){
    try{
      state.snapshots=Array.isArray(state.snapshots)?state.snapshots:[];
      const clean=withoutSnapshots(state);
      state.snapshots.unshift({
        id:id(),
        createdAt:new Date().toISOString(),
        date:today(),
        reason:reason||"Automatic snapshot",
        data:JSON.stringify(clean)
      });
      state.snapshots=state.snapshots.slice(0,SNAPSHOT_LIMIT);
    }catch(e){}
  }

  function shouldDailySnapshot(){
    const latest=Array.isArray(state.snapshots)?state.snapshots[0]:null;
    return !latest||latest.date!==today();
  }

  const baseSaveV7=save;
  save=function(){
    state=repairStateObject(state);
    if(shouldDailySnapshot())makeSnapshot("Daily automatic snapshot");
    storeLastGood();
    baseSaveV7();
  };

  window.createManualSnapshot=function(){
    makeSnapshot("Manual snapshot");
    storeLastGood();baseSaveV7();render();toast("Recovery snapshot created");
  };

  window.restoreSnapshot=function(snapshotId){
    const snap=(state.snapshots||[]).find(function(x){return x.id===snapshotId});
    if(!snap||!confirm("Restore this snapshot? Current unsaved state will be replaced."))return;
    try{
      const restored=repairStateObject(JSON.parse(snap.data));
      restored.snapshots=cloneV7(state.snapshots||[]);
      state=restored;
      storeLastGood();baseSaveV7();render();toast("Snapshot restored");
    }catch(e){toast("Snapshot could not be restored")}
  };

  window.deleteSnapshot=function(snapshotId){
    state.snapshots=(state.snapshots||[]).filter(function(x){return x.id!==snapshotId);
    baseSaveV7();render();toast("Snapshot deleted");
  };

  window.restoreLastGood=function(){
    const raw=localStorage.getItem(LAST_GOOD_KEY);
    if(!raw){toast("No last-known-good copy exists yet");return}
    if(!confirm("Restore the last-known-good CRM copy?"))return;
    try{
      const restored=repairStateObject(JSON.parse(raw));
      restored.snapshots=cloneV7(state.snapshots||[]);
      state=restored;baseSaveV7();render();toast("Last-known-good copy restored");
    }catch(e){toast("Last-known-good copy is invalid")}
  };

  window.repairCRMData=function(){
    const before=validateStateObject(state).length;
    state=repairStateObject(state);
    storeLastGood();baseSaveV7();render();
    toast(before?("Repaired "+before+" structural issue(s)"):"Data structure is already healthy");
  };

  window.exportRecoveryBundle=function(){
    const bundle={
      exportedAt:new Date().toISOString(),
      schemaVersion:state.schemaVersion,
      currentState:state,
      lastKnownGood:(function(){try{return JSON.parse(localStorage.getItem(LAST_GOOD_KEY)||"null")}catch(e){return null}})()
    };
    const blob=new Blob([JSON.stringify(bundle,null,2)],{type:"application/json"});
    const a=document.createElement("a");
    a.href=URL.createObjectURL(blob);
    a.download="personal-crm-recovery-"+today()+".json";
    a.click();setTimeout(function(){URL.revokeObjectURL(a.href)},500);
  };

  function snapshotListHtml(){
    const rows=state.snapshots||[];
    if(!rows.length)return empty("No recovery snapshots yet.");
    return '<div class="snapshot-list">'+rows.map(function(s){
      return '<div class="snapshot-row"><div class="list-main"><strong>'+esc(s.reason||"Snapshot")+'</strong><small>'+esc(String(s.createdAt||"").replace("T"," ").slice(0,16))+'</small></div><div class="actions"><button class="btn ghost" onclick="restoreSnapshot('+s.id+')">Restore</button><button class="btn ghost danger" onclick="deleteSnapshot('+s.id+')">Delete</button></div></div>';
    }).join("")+'</div>';
  }

  function dataHealth(){
    const issues=validateStateObject(state);
    const size=(function(){try{return new Blob([JSON.stringify(state)]).size}catch(e){return 0}})();
    return {
      issues:issues,
      status:issues.length?"Needs Attention":"Healthy",
      size:size,
      contacts:state.contacts.length,
      records:state.interactions.length+state.followUps.length+state.opportunities.length+state.importantDates.length
    };
  }

  function bytesLabel(n){
    if(n<1024)return n+" B";
    if(n<1024*1024)return (n/1024).toFixed(1)+" KB";
    return (n/1024/1024).toFixed(2)+" MB";
  }

  function dataHealthHtml(){
    const h=dataHealth();
    return '<div class="health-panel">'+
      '<div class="health-status '+(h.issues.length?'bad':'good')+'"><span></span><div><strong>'+esc(h.status)+'</strong><small>'+h.issues.length+' structural issue(s)</small></div></div>'+
      '<div class="health-metrics"><div><b>'+h.contacts+'</b><span>Contacts</span></div><div><b>'+h.records+'</b><span>Linked records</span></div><div><b>'+bytesLabel(h.size)+'</b><span>Local data size</span></div></div>'+
      (h.issues.length?'<div class="health-issues">'+h.issues.slice(0,8).map(function(i){return '<p>'+esc(i)+'</p>'}).join("")+'</div>':'<p class="muted">Core data structure passes V7 validation.</p>')+
      '</div>';
  }

  window.installPersonalCRM=async function(){
    if(!deferredInstallPrompt){toast("Install option is controlled by this browser");return}
    deferredInstallPrompt.prompt();
    try{await deferredInstallPrompt.userChoice}catch(e){}
    deferredInstallPrompt=null;render();
  };

  window.addEventListener("beforeinstallprompt",function(e){
    e.preventDefault();deferredInstallPrompt=e;
    if(currentView==="settings")render();
  });
  window.addEventListener("appinstalled",function(){deferredInstallPrompt=null;toast("Personal CRM installed")});

  function pwaStatusHtml(){
    const standalone=window.matchMedia&&window.matchMedia("(display-mode: standalone)").matches;
    const secure=location.protocol==="https:"||location.hostname==="localhost";
    const sw=!!navigator.serviceWorker;
    return '<div class="pwa-status-grid">'+
      '<div class="pwa-status"><span class="'+(sw?'good':'bad')+'"></span><div><strong>Offline Engine</strong><small>'+(sw?'Service Worker supported':'Unsupported in this browser')+'</small></div></div>'+
      '<div class="pwa-status"><span class="'+(secure?'good':'bad')+'"></span><div><strong>Secure Context</strong><small>'+(secure?'Ready for PWA':'HTTPS required for deployment')+'</small></div></div>'+
      '<div class="pwa-status"><span class="'+(standalone?'good':'neutral')+'"></span><div><strong>Install State</strong><small>'+(standalone?'Installed app mode':'Running in browser')+'</small></div></div>'+
      '</div>';
  }

  const settingsV7Base=settingsView;
  settingsView=function(){
    const base=settingsV7Base();
    return sectionTitle("Settings & Recovery","Manage backups, offline installation and local data health.")+
      '<div class="grid grid-2">'+
        '<div class="card"><div class="card-head"><div><p class="eyebrow">Progressive Web App</p><h3>Install & Offline</h3></div><span class="tag">V7</span></div>'+pwaStatusHtml()+'<div class="actions" style="margin-top:14px"><button class="btn primary" onclick="installPersonalCRM()">Install App</button></div><p class="muted">After the site has loaded successfully once, cached app files can continue working offline. Browser support still decides whether an Install prompt appears.</p></div>'+
        '<div class="card"><div class="card-head"><div><p class="eyebrow">Data Health</p><h3>Validate local CRM</h3></div></div>'+dataHealthHtml()+'<div class="actions"><button class="btn primary" onclick="repairCRMData()">Validate & Repair</button><button class="btn ghost" onclick="exportRecoveryBundle()">Recovery Export</button></div></div>'+
      '</div>'+
      '<div class="grid grid-2" style="margin-top:18px">'+
        '<div class="card"><div class="card-head"><div><p class="eyebrow">Snapshots</p><h3>Recovery history</h3></div><button class="btn primary" onclick="createManualSnapshot()">＋ Snapshot</button></div>'+snapshotListHtml()+'</div>'+
        '<div class="card"><div class="card-head"><div><p class="eyebrow">Last Known Good</p><h3>Emergency restore</h3></div></div><p class="muted">A validated copy is stored separately from the main CRM state. Use this only if the current local data becomes damaged.</p><div class="actions"><button class="btn ghost" onclick="restoreLastGood()">Restore Last Good</button></div></div>'+
      '</div>'+
      '<div style="margin-top:18px">'+base+'</div>';
  };

  const dashboardV7Base=dashboardView;
  dashboardView=function(){
    const h=dataHealth();
    return dashboardV7Base()+
      '<div class="card recovery-strip" style="margin-top:18px"><div><p class="eyebrow">Reliability</p><h3>Local data: '+esc(h.status)+'</h3><p class="muted">'+(navigator.onLine?'Online now':'Offline mode')+' • '+(state.snapshots||[]).length+' recovery snapshot(s) • '+bytesLabel(h.size)+'</p></div><button class="btn ghost" onclick="navTo(\'settings\')">Recovery Center</button></div>';
  };

  if("serviceWorker" in navigator){
    window.addEventListener("load",function(){
      navigator.serviceWorker.register("./sw.js").catch(function(){});
    });
  }

  state=repairStateObject(state);
  if(shouldDailySnapshot())makeSnapshot("V7 migration snapshot");
  storeLastGood();
  baseSaveV7();
  render();
})();