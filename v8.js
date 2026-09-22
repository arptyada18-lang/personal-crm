// Personal CRM — Advanced V8: network map + reports + command palette + release hardening
(function(){
  const V8_VERSION=8;
  const STAGE_ORDER=["New Contact","Connected","Conversation Started","Relationship Building","Opportunity","Strong Connection"];
  const VIEW_COMMANDS=[
    ["dashboard","Dashboard","Alt+D"],
    ["contacts","Contacts","Alt+C"],
    ["followups","Follow-Ups","Alt+F"],
    ["pipeline","Networking Pipeline","Alt+P"],
    ["opportunities","Opportunities","Alt+O"],
    ["dates","Important Dates","Alt+I"],
    ["interactions","Interactions","Alt+N"],
    ["analytics","Analytics","Alt+A"],
    ["growth","Growth & Goals","Alt+G"],
    ["network","Network Map","Alt+M"],
    ["reports","Reports & Reviews","Alt+R"],
    ["settings","Settings","Alt+S"]
  ];
  let networkFilter="All";
  let reportPeriod="weekly";

  const baseSaveV8=save;
  save=function(){
    baseSaveV8();
    state.schemaVersion=V8_VERSION;
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state))}catch(e){}
  };

  const restoreSnapshotV8Base=window.restoreSnapshot;
  window.restoreSnapshot=function(snapshotId){
    restoreSnapshotV8Base(snapshotId);
    state.schemaVersion=V8_VERSION;
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state))}catch(e){}
  };
  const restoreLastGoodV8Base=window.restoreLastGood;
  window.restoreLastGood=function(){
    restoreLastGoodV8Base();
    state.schemaVersion=V8_VERSION;
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state))}catch(e){}
  };
  const repairCRMDataV8Base=window.repairCRMData;
  window.repairCRMData=function(){
    repairCRMDataV8Base();
    state.schemaVersion=V8_VERSION;
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state))}catch(e){}
  };

  function ensureV8(){
    state.schemaVersion=V8_VERSION;
    state.reviews=Array.isArray(state.reviews)?state.reviews:[];
    state.settings=state.settings&&typeof state.settings==="object"?state.settings:{theme:"midnight"};
    if(typeof state.settings.largeText!=="boolean")state.settings.largeText=false;
    if(typeof state.settings.reducedMotion!=="boolean")state.settings.reducedMotion=false;
    if(typeof state.settings.highContrast!=="boolean")state.settings.highContrast=false;
    save();
    applyAccessibilitySettings();
  }

  function dateOnly(value){return value?String(value).slice(0,10):""}
  function addDaysV8(base,delta){
    const d=new Date(base+"T00:00:00");
    d.setDate(d.getDate()+delta);
    return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
  }
  function monthStart(){
    const d=new Date();
    return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-01";
  }
  function periodBounds(period){
    return period==="monthly"?{start:monthStart(),end:today(),label:"Current Month"}:{start:addDaysV8(today(),-6),end:today(),label:"Last 7 Days"};
  }
  function inPeriod(value,bounds){
    const d=dateOnly(value);
    return !!d&&d>=bounds.start&&d<=bounds.end;
  }

  function recordedEvents(){
    const rows=[];
    state.contacts.forEach(function(c){if(c.createdAt)rows.push({date:dateOnly(c.createdAt),type:"Contact Added",contactId:c.id,label:c.name})});
    state.interactions.forEach(function(x){if(x.date)rows.push({date:dateOnly(x.date),type:"Interaction",contactId:x.contactId,label:x.type||"Interaction"})});
    state.followUps.forEach(function(f){if(f.completedAt)rows.push({date:dateOnly(f.completedAt),type:"Follow-Up Completed",contactId:f.contactId,label:f.title||"Follow-Up"})});
    (state.pipelineActivity||[]).forEach(function(a){if(a.date||a.timestamp)rows.push({date:dateOnly(a.date||a.timestamp),type:"Pipeline Movement",contactId:a.contactId,label:(a.from||"")+" → "+(a.to||"")})});
    state.opportunities.forEach(function(o){if(o.createdAt)rows.push({date:dateOnly(o.createdAt),type:"Opportunity Added",contactId:o.contactId,label:o.title||"Opportunity"})});
    return rows.filter(function(x){return x.date});
  }

  function networkTypes(){
    return Array.from(new Set(state.contacts.map(function(c){return c.relationshipType||"Other"}))).sort();
  }
  function networkContacts(){
    return state.contacts.filter(function(c){return networkFilter==="All"||(c.relationshipType||"Other")===networkFilter});
  }
  window.setNetworkFilter=function(value){networkFilter=value;render()};

  function networkMapSvg(){
    const contacts=networkContacts().slice(0,24);
    if(!contacts.length)return empty("No contacts match this network filter.");
    const w=900,h=540,cx=450,cy=270;
    const rings=[150,220];
    const nodes=contacts.map(function(c,index){
      const ring=index<12?0:1;
      const ringItems=ring===0?Math.min(12,contacts.length):Math.max(1,contacts.length-12);
      const localIndex=ring===0?index:index-12;
      const angle=(Math.PI*2*localIndex/ringItems)-Math.PI/2;
      const r=rings[ring];
      return {c:c,x:cx+Math.cos(angle)*r,y:cy+Math.sin(angle)*r};
    });
    const edges=nodes.map(function(n){
      return '<line x1="'+cx+'" y1="'+cy+'" x2="'+n.x.toFixed(1)+'" y2="'+n.y.toFixed(1)+'" class="network-edge"/>';
    }).join("");
    const nodeHtml=nodes.map(function(n){
      const score=relationshipScore(n.c);
      const radius=score>=80?32:score>=60?29:26;
      return '<g class="network-node" tabindex="0" role="button" aria-label="'+esc(n.c.name)+'" onclick="openContactProfile('+n.c.id+')" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();openContactProfile('+n.c.id+')}">'+
        '<circle cx="'+n.x.toFixed(1)+'" cy="'+n.y.toFixed(1)+'" r="'+radius+'" class="network-node-circle"/>'+
        '<text x="'+n.x.toFixed(1)+'" y="'+(n.y+4).toFixed(1)+'" text-anchor="middle" class="network-node-initials">'+esc(initials(n.c.name))+'</text>'+
        '<text x="'+n.x.toFixed(1)+'" y="'+(n.y+radius+17).toFixed(1)+'" text-anchor="middle" class="network-node-label">'+esc(String(n.c.name).slice(0,18))+'</text>'+
        '</g>';
    }).join("");
    return '<div class="network-map-scroll"><svg class="network-map-svg" viewBox="0 0 '+w+' '+h+'" role="img" aria-label="Relationship network map">'+
      edges+
      '<circle cx="'+cx+'" cy="'+cy+'" r="52" class="network-center-circle"/>'+
      '<text x="'+cx+'" y="'+(cy-3)+'" text-anchor="middle" class="network-center-title">YOU</text>'+
      '<text x="'+cx+'" y="'+(cy+18)+'" text-anchor="middle" class="network-center-sub">'+state.contacts.length+' contacts</text>'+
      nodeHtml+
      '</svg></div>';
  }

  function networkMapStats(){
    const rows=networkContacts();
    const strong=rows.filter(function(c){return relationshipScore(c)>=80}).length;
    const active=rows.filter(function(c){return relationshipScore(c)>=60}).length;
    const stages={};
    rows.forEach(function(c){stages[c.stage||"New Contact"]=(stages[c.stage||"New Contact"]||0)+1});
    const topStage=Object.entries(stages).sort(function(a,b){return b[1]-a[1]})[0];
    return '<div class="grid grid-4">'+
      stat("Visible Contacts",rows.length,networkFilter==="All"?"All relationship types":networkFilter)+
      stat("Active / Strong",active,"Relationship score 60+")+
      stat("Strong",strong,"Relationship score 80+")+
      stat("Largest Stage",topStage?topStage[0]:"—",topStage?topStage[1]+" contact(s)":"No contacts")+
      '</div>';
  }

  window.networkMapView=function(){
    const options=["All"].concat(networkTypes());
    return sectionTitle("Network Map","Visualize relationship clusters without sending private contact data anywhere.")+
      '<div class="toolbar"><select aria-label="Filter network by relationship type" onchange="setNetworkFilter(this.value)">'+
      options.map(function(x){return '<option '+(x===networkFilter?'selected':'')+'>'+esc(x)+'</option>'}).join("")+
      '</select><span class="tag">Local SVG • Max 24 visible nodes</span></div>'+
      networkMapStats()+
      '<div class="card network-map-card" style="margin-top:18px"><div class="card-head"><div><p class="eyebrow">Relationship Graph</p><h3>'+esc(networkFilter)+' Network</h3></div><span class="tag">Click a person to open profile</span></div>'+networkMapSvg()+'</div>';
  };

  function reportMetrics(period){
    const b=periodBounds(period);
    const events=recordedEvents().filter(function(e){return inPeriod(e.date,b)});
    const interactions=state.interactions.filter(function(x){return inPeriod(x.date,b)});
    const completed=state.followUps.filter(function(f){return f.completedAt&&inPeriod(f.completedAt,b)});
    const newContacts=state.contacts.filter(function(c){return c.createdAt&&inPeriod(c.createdAt,b)});
    const opportunities=state.opportunities.filter(function(o){return o.createdAt&&inPeriod(o.createdAt,b)});
    const won=state.opportunities.filter(function(o){return o.status==="Won"&&o.updatedAt&&inPeriod(o.updatedAt,b)});
    const uniqueContacts=new Set(interactions.map(function(x){return x.contactId})).size;
    return {bounds:b,events:events,interactions:interactions,completed:completed,newContacts:newContacts,opportunities:opportunities,won:won,uniqueContacts:uniqueContacts};
  }

  function reviewInsights(period){
    const m=reportMetrics(period),rows=[];
    if(m.interactions.length===0)rows.push("No interactions were logged in this period.");
    else rows.push(m.interactions.length+" interaction(s) reached "+m.uniqueContacts+" unique contact(s).");
    if(m.completed.length===0)rows.push("No follow-ups were completed in this period.");
    else rows.push(m.completed.length+" follow-up(s) were completed.");
    if(m.newContacts.length)rows.push(m.newContacts.length+" new contact(s) were added.");
    if(m.opportunities.length)rows.push(m.opportunities.length+" opportunity record(s) were created.");
    const overdue=state.followUps.filter(function(f){return f.status!=="Completed"&&f.date&&daysFromToday(f.date)<0}).length;
    if(overdue)rows.push(overdue+" overdue follow-up(s) remain open today.");
    const dormant=state.contacts.filter(function(c){return relationshipScore(c)<40}).length;
    if(dormant)rows.push(dormant+" contact(s) currently have dormant relationship health.");
    return rows.slice(0,6);
  }

  function latestReview(period){
    return state.reviews.filter(function(r){return r.period===period}).sort(function(a,b){return String(b.createdAt).localeCompare(String(a.createdAt))})[0]||null;
  }

  window.openReviewModal=function(period){
    const current=latestReview(period);
    const label=period==="monthly"?"Monthly":"Weekly";
    openModal(label+" Review",
      textArea("Wins","wins",current?.wins||"")+
      textArea("What needs attention","attention",current?.attention||"")+
      textArea("Next priorities","priorities",current?.priorities||""),
      function(fd){
        state.reviews.unshift({
          id:id(),period:period,
          wins:fd.get("wins").trim(),
          attention:fd.get("attention").trim(),
          priorities:fd.get("priorities").trim(),
          createdAt:new Date().toISOString()
        });
        state.reviews=state.reviews.slice(0,50);
        save();render();toast(label+" review saved");
      }
    );
  };

  function reviewCard(period){
    const latest=latestReview(period),label=period==="monthly"?"Monthly":"Weekly";
    return '<div class="card review-card"><div class="card-head"><div><p class="eyebrow">'+label+' Review</p><h3>'+periodBounds(period).label+'</h3></div><button class="btn primary" onclick="openReviewModal(\''+period+'\')">'+(latest?'Update':'Add')+' Review</button></div>'+
      '<div class="review-insights">'+reviewInsights(period).map(function(x){return '<p>'+esc(x)+'</p>'}).join("")+'</div>'+
      (latest?'<div class="review-note"><b>Wins</b><p>'+esc(latest.wins||"—")+'</p><b>Needs attention</b><p>'+esc(latest.attention||"—")+'</p><b>Next priorities</b><p>'+esc(latest.priorities||"—")+'</p><small>Saved '+esc(dateOnly(latest.createdAt))+'</small></div>':'<p class="muted">No written review saved yet.</p>')+
      '</div>';
  }

  window.setReportPeriod=function(period){reportPeriod=period==="monthly"?"monthly":"weekly";render()};

  function reportSummary(period){
    const m=reportMetrics(period);
    return '<div class="grid grid-4">'+
      stat("Recorded Activity",m.events.length,m.bounds.label)+
      stat("Interactions",m.interactions.length,m.uniqueContacts+" unique contact(s)")+
      stat("Completed Follow-Ups",m.completed.length,m.bounds.label)+
      stat("New Contacts",m.newContacts.length,m.bounds.label)+
      '</div>'+
      '<div class="grid grid-3" style="margin-top:18px">'+
      stat("New Opportunities",m.opportunities.length,m.bounds.label)+
      stat("Won Opportunities",m.won.length,m.bounds.label)+
      stat("Strong Relationships",state.contacts.filter(function(c){return relationshipScore(c)>=80}).length,"Current snapshot")+
      '</div>';
  }

  function reportTimeline(period){
    const m=reportMetrics(period);
    const events=m.events.slice().sort(function(a,b){return String(b.date).localeCompare(String(a.date))}).slice(0,30);
    if(!events.length)return empty("No recorded report activity for this period.");
    return '<div class="report-table-wrap"><table class="report-table"><thead><tr><th>Date</th><th>Type</th><th>Contact</th><th>Detail</th></tr></thead><tbody>'+
      events.map(function(e){
        const c=e.contactId?contactById(e.contactId):null;
        return '<tr><td>'+esc(e.date)+'</td><td>'+esc(e.type)+'</td><td>'+esc(c?.name||"—")+'</td><td>'+esc(e.label||"")+'</td></tr>';
      }).join("")+
      '</tbody></table></div>';
  }

  function csvCell(value){
    const s=String(value==null?"":value).replace(/"/g,'""');
    return '"'+s+'"';
  }
  function downloadText(filename,textValue,type){
    const blob=new Blob([textValue],{type:type||"text/plain"});
    const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=filename;a.click();
    setTimeout(function(){URL.revokeObjectURL(a.href)},500);
  }

  window.exportContactsCSV=function(){
    const head=["Name","Phone","Email","Company","Job Title","Location","Relationship Type","Priority","Stage","Relationship Score","Last Interaction","Tags"];
    const rows=state.contacts.map(function(c){return [c.name,c.phone,c.email,c.company,c.jobTitle,c.location,c.relationshipType,c.priority,c.stage,relationshipScore(c),lastInteractionDate(c),(c.tags||[]).join("; ")]});
    downloadText("personal-crm-contacts-"+today()+".csv",[head].concat(rows).map(function(r){return r.map(csvCell).join(",")}).join("\n"),"text/csv");
  };
  window.exportInteractionsCSV=function(){
    const head=["Date","Contact","Type","Summary","Outcome","Next Step"];
    const rows=state.interactions.map(function(x){return [x.date,contactById(x.contactId)?.name||"",x.type,x.summary,x.outcome,x.nextStep]});
    downloadText("personal-crm-interactions-"+today()+".csv",[head].concat(rows).map(function(r){return r.map(csvCell).join(",")}).join("\n"),"text/csv");
  };
  window.exportFollowupsCSV=function(){
    const head=["Contact","Title","Due Date","Priority","Status","Reason","Completed At"];
    const rows=state.followUps.map(function(f){return [contactById(f.contactId)?.name||"",f.title,f.date,f.priority,f.status,f.reason,f.completedAt]});
    downloadText("personal-crm-followups-"+today()+".csv",[head].concat(rows).map(function(r){return r.map(csvCell).join(",")}).join("\n"),"text/csv");
  };
  window.exportOpportunitiesCSV=function(){
    const head=["Contact","Title","Type","Status","Value","Deadline","Notes"];
    const rows=state.opportunities.map(function(o){return [contactById(o.contactId)?.name||"",o.title,o.type,o.status,o.value,o.deadline,o.notes]});
    downloadText("personal-crm-opportunities-"+today()+".csv",[head].concat(rows).map(function(r){return r.map(csvCell).join(",")}).join("\n"),"text/csv");
  };

  window.printCurrentReport=function(){
    document.body.classList.add("printing-report");
    window.print();
    setTimeout(function(){document.body.classList.remove("printing-report")},500);
  };

  window.reportsView=function(){
    const period=reportPeriod;
    return sectionTitle("Reports & Reviews","Generate useful summaries from recorded CRM data and keep a written reflection history.")+
      '<div class="toolbar report-toolbar"><button class="btn '+(period==="weekly"?"primary":"ghost")+'" onclick="setReportPeriod(\'weekly\')">Weekly</button><button class="btn '+(period==="monthly"?"primary":"ghost")+'" onclick="setReportPeriod(\'monthly\')">Monthly</button><button class="btn ghost" onclick="printCurrentReport()">Print Report</button></div>'+
      '<div class="report-print-area"><div class="report-heading"><div><p class="eyebrow">Personal CRM Report</p><h2>'+esc(periodBounds(period).label)+'</h2><p class="muted">'+esc(periodBounds(period).start)+' to '+esc(periodBounds(period).end)+'</p></div><span class="tag">Recorded data only</span></div>'+
      reportSummary(period)+
      '<div class="grid grid-2" style="margin-top:18px">'+reviewCard("weekly")+reviewCard("monthly")+'</div>'+
      '<div class="card" style="margin-top:18px"><div class="card-head"><div><p class="eyebrow">Activity Detail</p><h3>Report timeline</h3></div></div>'+reportTimeline(period)+'</div></div>'+
      '<div class="card" style="margin-top:18px"><div class="card-head"><div><p class="eyebrow">CSV Exports</p><h3>Take your data with you</h3></div></div><div class="actions"><button class="btn ghost" onclick="exportContactsCSV()">Contacts CSV</button><button class="btn ghost" onclick="exportInteractionsCSV()">Interactions CSV</button><button class="btn ghost" onclick="exportFollowupsCSV()">Follow-Ups CSV</button><button class="btn ghost" onclick="exportOpportunitiesCSV()">Opportunities CSV</button></div></div>';
  };

  function ensureCommandPalette(){
    if(document.getElementById("commandPalette"))return;
    const wrap=document.createElement("div");
    wrap.id="commandPalette";wrap.className="command-palette";wrap.hidden=true;
    wrap.innerHTML='<div class="command-backdrop" onclick="closeCommandPalette()"></div><div class="command-panel" role="dialog" aria-modal="true" aria-label="Command palette"><div class="command-input-wrap"><span>⌕</span><input id="commandInput" aria-label="Search commands" placeholder="Type a command..."><kbd>Esc</kbd></div><div id="commandResults" class="command-results"></div></div>';
    document.body.appendChild(wrap);
  }
  function commandItems(){
    const navs=VIEW_COMMANDS.map(function(v){return {label:"Open "+v[1],hint:v[2],run:function(){navTo(v[0])}}});
    return navs.concat([
      {label:"Add Contact",hint:"",run:function(){openContactModal()}},
      {label:"Log Interaction",hint:"",run:function(){openInteractionModal()}},
      {label:"Add Follow-Up",hint:"",run:function(){openFollowupModal()}},
      {label:"Add Networking Goal",hint:"",run:function(){openGoalModal()}},
      {label:"Create Recovery Snapshot",hint:"",run:function(){createManualSnapshot()}},
      {label:"Export JSON Backup",hint:"",run:function(){exportBackup()}}
    ]);
  }
  function renderCommands(query){
    const q=String(query||"").toLowerCase();
    const rows=commandItems().filter(function(x){return !q||x.label.toLowerCase().includes(q)}).slice(0,12);
    document.getElementById("commandResults").innerHTML=rows.map(function(x,index){
      return '<button class="command-row" data-command-index="'+index+'"><span>'+esc(x.label)+'</span><kbd>'+esc(x.hint||"")+'</kbd></button>';
    }).join("")||'<div class="empty">No matching command.</div>';
    document.querySelectorAll(".command-row").forEach(function(btn){
      btn.addEventListener("click",function(){
        const item=rows[Number(btn.dataset.commandIndex)];
        closeCommandPalette();if(item)item.run();
      });
    });
  }
  window.openCommandPalette=function(){
    ensureCommandPalette();
    const el=document.getElementById("commandPalette");
    el.hidden=false;renderCommands("");
    const input=document.getElementById("commandInput");input.value="";setTimeout(function(){input.focus()},0);
  };
  window.closeCommandPalette=function(){
    const el=document.getElementById("commandPalette");if(el)el.hidden=true;
  };

  function shortcutView(){
    return VIEW_COMMANDS.map(function(v){return '<div class="shortcut-row"><span>'+esc(v[1])+'</span><kbd>'+esc(v[2])+'</kbd></div>'}).join("")+
      '<div class="shortcut-row"><span>Command Palette</span><kbd>Ctrl/⌘ K</kbd></div>'+
      '<div class="shortcut-row"><span>Close Dialog / Palette</span><kbd>Esc</kbd></div>';
  }

  window.toggleAccessibility=function(key,checked){
    state.settings[key]=!!checked;save();applyAccessibilitySettings();render();toast("Accessibility preference updated");
  };
  function applyAccessibilitySettings(){
    document.documentElement.classList.toggle("large-text",!!state.settings.largeText);
    document.documentElement.classList.toggle("reduced-motion",!!state.settings.reducedMotion);
    document.documentElement.classList.toggle("high-contrast",!!state.settings.highContrast);
  }

  function releaseAudit(){
    const issues=[];
    const contactIds=new Set(state.contacts.map(function(c){return c.id}));
    state.contacts.forEach(function(c){if(!c.id||!String(c.name||"").trim())issues.push("Invalid contact record")});
    ["interactions","followUps","opportunities"].forEach(function(key){
      state[key].forEach(function(x){if(x.contactId&&!contactIds.has(x.contactId))issues.push("Orphaned "+key+" record")});
    });
    if(state.schemaVersion!==V8_VERSION)issues.push("Schema version mismatch");
    return Array.from(new Set(issues));
  }
  function releaseAuditHtml(){
    const issues=releaseAudit();
    return '<div class="release-audit '+(issues.length?'bad':'good')+'"><div><strong>'+(issues.length?"Needs Attention":"Release Healthy")+'</strong><small>'+issues.length+' issue(s) detected</small></div><span class="release-dot"></span></div>'+
      (issues.length?'<div class="health-issues">'+issues.map(function(x){return '<p>'+esc(x)+'</p>'}).join("")+'</div>':'<p class="muted">Core V8 release invariants pass on the current local state.</p>');
  }

  const settingsV8Base=settingsView;
  settingsView=function(){
    const base=settingsV8Base();
    return base+
      '<div class="grid grid-2" style="margin-top:18px">'+
        '<div class="card"><div class="card-head"><div><p class="eyebrow">Accessibility</p><h3>Comfort & readability</h3></div></div><div class="accessibility-list">'+
          '<label><input type="checkbox" '+(state.settings.largeText?'checked':'')+' onchange="toggleAccessibility(\'largeText\',this.checked)"> Large text</label>'+
          '<label><input type="checkbox" '+(state.settings.reducedMotion?'checked':'')+' onchange="toggleAccessibility(\'reducedMotion\',this.checked)"> Reduced motion</label>'+
          '<label><input type="checkbox" '+(state.settings.highContrast?'checked':'')+' onchange="toggleAccessibility(\'highContrast\',this.checked)"> High contrast</label>'+
        '</div></div>'+
        '<div class="card"><div class="card-head"><div><p class="eyebrow">Release Audit</p><h3>V8 local health</h3></div></div>'+releaseAuditHtml()+'</div>'+
      '</div>'+
      '<div class="card" style="margin-top:18px"><div class="card-head"><div><p class="eyebrow">Keyboard Shortcuts</p><h3>Navigate faster</h3></div><button class="btn ghost" onclick="openCommandPalette()">Open Palette</button></div><div class="shortcut-grid">'+shortcutView()+'</div></div>';
  };

  const renderV8Base=render;
  render=function(){
    if(currentView==="network"||currentView==="reports"){
      document.getElementById("viewTitle").textContent=currentView==="network"?"Network Map":"Reports & Reviews";
      document.getElementById("todayLabel").textContent=new Date().toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long"});
      document.getElementById("viewRoot").innerHTML=currentView==="network"?networkMapView():reportsView();
      document.querySelectorAll("[data-view]").forEach(function(b){b.classList.toggle("active",b.dataset.view===currentView)});
      return;
    }
    renderV8Base();
  };

  document.addEventListener("keydown",function(event){
    const tag=(event.target&&event.target.tagName||"").toLowerCase();
    const typing=tag==="input"||tag==="textarea"||tag==="select";
    if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==="k"){
      event.preventDefault();openCommandPalette();return;
    }
    if(event.key==="Escape"){closeCommandPalette();return}
    if(typing||!event.altKey)return;
    const map={d:"dashboard",c:"contacts",f:"followups",p:"pipeline",o:"opportunities",i:"dates",n:"interactions",a:"analytics",g:"growth",m:"network",r:"reports",s:"settings"};
    const target=map[event.key.toLowerCase()];
    if(target){event.preventDefault();navTo(target)}
  });

  document.addEventListener("input",function(event){
    if(event.target&&event.target.id==="commandInput")renderCommands(event.target.value);
  });

  ensureCommandPalette();
  ensureV8();
  render();
})();