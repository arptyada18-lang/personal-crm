// Personal CRM — Advanced V2: smart follow-ups + relationship intelligence
(function(){
  const V2_VERSION=2;

  function ensureV2(){
    state.schemaVersion=V2_VERSION;
    state.followUps=(state.followUps||[]).map(function(f){
      if(!f.status)f.status="Upcoming";
      if(typeof f.snoozeCount!=="number")f.snoozeCount=0;
      if(!("completedAt" in f))f.completedAt="";
      return f;
    });
    state.interactions=(state.interactions||[]).map(function(x){
      if(!("editedAt" in x))x.editedAt="";
      return x;
    });
    save();
  }

  function addDays(date,days){
    const d=new Date((date||today())+"T00:00:00");
    d.setDate(d.getDate()+days);
    return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
  }
  function syncLastInteraction(contactId){
    const c=contactById(contactId);if(!c)return;
    const rows=contactInteractions(contactId);
    c.lastInteraction=rows[0]?.date||"";
  }
  function interactionById(iid){return state.interactions.find(function(x){return x.id===iid})}
  function followupById(fid){return state.followUps.find(function(x){return x.id===fid})}

  window.editInteractionModal=function(iid){
    const x=interactionById(iid);if(!x)return;
    openModal("Edit Interaction",
      selectField("Contact","contactId",state.contacts.map(function(c){return String(c.id)+"|"+c.name}),String(x.contactId)+"|"+(contactById(x.contactId)?.name||""))+
      '<div class="form-grid">'+
      selectField("Type","type",["WhatsApp","Phone Call","Email","LinkedIn","Instagram","Meeting","Video Call","College Conversation","Client Conversation","Other"],x.type)+
      field("Date","date","date",x.date,'required')+
      '</div>'+textArea("Summary","summary",x.summary)+field("Outcome","outcome","text",x.outcome||"")+field("Next Step","nextStep","text",x.nextStep||""),
      function(fd){
        const oldContact=x.contactId;
        x.contactId=Number(String(fd.get("contactId")).split("|")[0]);
        x.type=fd.get("type");x.date=fd.get("date");
        x.summary=fd.get("summary").trim();x.outcome=fd.get("outcome").trim();x.nextStep=fd.get("nextStep").trim();
        x.editedAt=new Date().toISOString();
        syncLastInteraction(oldContact);syncLastInteraction(x.contactId);
        save();render();toast("Interaction updated");
      }
    );
  };
  window.deleteInteraction=function(iid){
    const x=interactionById(iid);if(!x||!confirm("Delete this interaction?"))return;
    const contactId=x.contactId;
    state.interactions=state.interactions.filter(function(i){return i.id!==iid});
    syncLastInteraction(contactId);save();render();toast("Interaction deleted");
  };

  window.editFollowupModal=function(fid){
    const f=followupById(fid);if(!f)return;
    openModal("Edit Follow-Up",
      selectField("Contact","contactId",state.contacts.map(function(c){return String(c.id)+"|"+c.name}),String(f.contactId)+"|"+(contactById(f.contactId)?.name||""))+
      field("Title","title","text",f.title,'required')+
      '<div class="form-grid">'+field("Date","date","date",f.date,'required')+selectField("Priority","priority",["High","Medium","Low"],f.priority)+'</div>'+
      textArea("Reason","reason",f.reason||""),
      function(fd){
        f.contactId=Number(String(fd.get("contactId")).split("|")[0]);
        f.title=fd.get("title").trim();f.date=fd.get("date");f.priority=fd.get("priority");f.reason=fd.get("reason").trim();
        if(f.status==="Completed"){f.status="Upcoming";f.completedAt=""}
        save();render();toast("Follow-up updated");
      }
    );
  };
  window.snoozeFollowup=function(fid,days){
    const f=followupById(fid);if(!f)return;
    f.date=addDays(today(),days);f.status="Snoozed";f.snoozeCount=(f.snoozeCount||0)+1;
    save();render();toast("Follow-up snoozed "+days+" day(s)");
  };
  window.rescheduleFollowup=function(fid){
    const f=followupById(fid);if(!f)return;
    openModal("Reschedule Follow-Up",field("New date","date","date",f.date,'required'),function(fd){
      f.date=fd.get("date");f.status="Upcoming";save();render();toast("Follow-up rescheduled");
    });
  };
  window.deleteFollowup=function(fid){
    if(!followupById(fid)||!confirm("Delete this follow-up?"))return;
    state.followUps=state.followUps.filter(function(f){return f.id!==fid});
    save();render();toast("Follow-up deleted");
  };

  function followupStatus(f){
    if(f.status==="Completed")return "Completed";
    const d=daysFromToday(f.date);
    if(d<0)return "Overdue";
    if(d===0)return "Today";
    if(f.status==="Snoozed")return "Snoozed";
    return "Upcoming";
  }
  followupList=function(rows){
    if(!rows.length)return empty("No follow-ups here.");
    return '<div class="list">'+rows.map(function(f){
      const c=contactById(f.contactId),status=followupStatus(f);
      return '<div class="list-item followup-v2"><div class="list-main"><strong>'+esc(f.title)+'</strong><small>'+esc(c?.name||"Unknown")+' • '+esc(f.date)+' • '+esc(f.priority)+(f.reason?' • '+esc(f.reason):'')+'</small></div><span class="tag">'+esc(status)+'</span><div class="followup-actions">'+
        (f.status!=="Completed"?'<button class="btn ghost" onclick="completeFollowup('+f.id+')">✓</button><button class="btn ghost" onclick="snoozeFollowup('+f.id+',1)">+1d</button><button class="btn ghost" onclick="snoozeFollowup('+f.id+',7)">+7d</button><button class="btn ghost" onclick="rescheduleFollowup('+f.id+')">Date</button><button class="btn ghost" onclick="editFollowupModal('+f.id+')">Edit</button>':'')+
        '<button class="btn ghost danger" onclick="deleteFollowup('+f.id+')">×</button></div></div>';
    }).join("")+'</div>';
  };

  function interactionCard(x,compact){
    const c=contactById(x.contactId);
    return '<div class="timeline-item interaction-v2"><div class="timeline-head"><div><strong>'+esc(x.type)+' • '+esc(c?.name||"Unknown")+'</strong><small>'+esc(x.date)+(x.editedAt?' • edited':'')+'</small></div><div class="timeline-actions"><button class="btn ghost" onclick="editInteractionModal('+x.id+')">Edit</button><button class="btn ghost danger" onclick="deleteInteraction('+x.id+')">Delete</button></div></div>'+
      '<p>'+esc(x.summary||"No summary")+'</p>'+
      (!compact&&x.outcome?'<div class="timeline-detail"><b>Outcome</b><span>'+esc(x.outcome)+'</span></div>':'')+
      (!compact&&x.nextStep?'<div class="timeline-detail"><b>Next step</b><span>'+esc(x.nextStep)+'</span></div>':'')+
      '</div>';
  }

  interactionsView=function(){
    const rows=state.interactions.slice().sort(function(a,b){return String(b.date).localeCompare(String(a.date))});
    return sectionTitle("Interactions","Edit, review and learn from every meaningful conversation.","＋ Log Interaction","openInteractionModal()")+
      '<div class="grid grid-4">'+
      stat("Total Interactions",rows.length,"Logged conversations")+
      stat("This Month",rows.filter(function(x){return x.date&&x.date.slice(0,7)===today().slice(0,7)}).length,"Current month")+
      stat("With Next Step",rows.filter(function(x){return x.nextStep}).length,"Actionable conversations")+
      stat("Contacts Reached",new Set(rows.map(function(x){return x.contactId})).size,"Unique people")+
      '</div><div class="card" style="margin-top:18px"><div class="timeline">'+(rows.map(function(x){return interactionCard(x,false)}).join("")||empty("No interactions logged yet."))+'</div></div>';
  };

  function relationshipIntelligence(c){
    const score=relationshipScore(c),last=lastInteractionDate(c),age=last?Math.abs(daysFromToday(last)):999;
    const open=contactFollowups(c.id).filter(function(f){return f.status!=="Completed"});
    const ints=contactInteractions(c.id);
    const suggestions=[];
    if(!ints.length)suggestions.push("Start the relationship history with a first interaction.");
    if(age>60)suggestions.push("Reconnect soon. No recent interaction for more than 60 days.");
    else if(age>30)suggestions.push("Relationship is cooling. A lightweight check-in would help.");
    if(open.some(function(f){return daysFromToday(f.date)<0}))suggestions.push("An overdue follow-up needs attention.");
    if(c.priority==="High"&&score<60)suggestions.push("High-priority contact has weak relationship health.");
    if(ints.length>=3&&!open.length)suggestions.push("Add a next follow-up so momentum does not disappear.");
    if(score>=80)suggestions.push("Strong relationship. Maintain quality, not just frequency.");
    return suggestions.slice(0,3);
  }

  function smartNetworkSuggestions(){
    const suggestions=[];
    state.contacts.forEach(function(c){
      relationshipIntelligence(c).slice(0,1).forEach(function(msg){
        suggestions.push({contact:c,msg:msg,score:relationshipScore(c)});
      });
    });
    return suggestions.sort(function(a,b){return a.score-b.score}).slice(0,6);
  }

  function intelligenceList(){
    const rows=smartNetworkSuggestions();
    if(!rows.length)return empty("Add contacts and interactions to generate relationship intelligence.");
    return '<div class="intelligence-list">'+rows.map(function(x){
      return '<div class="intelligence-item"><div class="avatar">'+esc(initials(x.contact.name))+'</div><div class="list-main"><strong>'+esc(x.contact.name)+'</strong><small>'+esc(x.msg)+'</small></div><button class="btn ghost" onclick="openContactProfile('+x.contact.id+')">Open</button></div>';
    }).join("")+'</div>';
  }

  const dashboardV2Base=dashboardView;
  dashboardView=function(){
    const base=dashboardV2Base();
    return base+'<div class="card intelligence-card" style="margin-top:18px"><div class="card-head"><div><p class="eyebrow">Relationship Intelligence</p><h3>Who needs attention</h3></div><span class="tag">Rule-based</span></div>'+intelligenceList()+'</div>';
  };

  function combinedTimeline(c){
    const rows=[];
    contactInteractions(c.id).forEach(function(x){rows.push({date:x.date,type:"interaction",item:x})});
    contactFollowups(c.id).forEach(function(f){
      rows.push({date:f.completedAt?String(f.completedAt).slice(0,10):f.date,type:"followup",item:f});
    });
    if(c.createdAt)rows.push({date:String(c.createdAt).slice(0,10),type:"created",item:c});
    rows.sort(function(a,b){return String(b.date).localeCompare(String(a.date))});
    if(!rows.length)return empty("No timeline history.");
    return '<div class="timeline">'+rows.map(function(r){
      if(r.type==="interaction")return interactionCard(r.item,false);
      if(r.type==="created")return '<div class="timeline-item system-event"><strong>Contact added</strong><small>'+esc(r.date)+'</small></div>';
      const f=r.item;return '<div class="timeline-item followup-event"><div class="timeline-head"><div><strong>Follow-Up • '+esc(f.title)+'</strong><small>'+esc(r.date)+' • '+esc(followupStatus(f))+'</small></div><button class="btn ghost" onclick="editFollowupModal('+f.id+')">Edit</button></div>'+(f.reason?'<p>'+esc(f.reason)+'</p>':'')+'</div>';
    }).join("")+'</div>';
  }

  profileView=function(){
    const c=contactById(activeContactId);if(!c)return empty("Contact not found.");
    const s=relationshipScore(c),m=strengthMeta(s),fus=contactFollowups(c.id).filter(function(x){return x.status!=="Completed"}),intel=relationshipIntelligence(c);
    return '<div class="card profile-hero"><div class="avatar">'+esc(initials(c.name))+'</div><div><p class="eyebrow">'+esc(c.relationshipType)+'</p><h2>'+esc(c.name)+'</h2><p class="muted">'+esc(c.jobTitle||"")+(c.company?' • '+esc(c.company):'')+(c.location?' • '+esc(c.location):'')+'</p></div><div class="actions"><button class="btn ghost" onclick="openContactModal('+c.id+')">Edit</button><button class="btn primary" onclick="openInteractionModal('+c.id+')">＋ Interaction</button><button class="btn ghost" onclick="openFollowupModal('+c.id+')">＋ Follow-Up</button></div></div>'+
      '<div class="profile-grid"><div class="card"><div class="card-head"><h3>Relationship Health</h3><span class="score '+m.cls+'">'+s+'/100</span></div><div class="progress"><i style="width:'+s+'%"></i></div><p class="muted">'+m.label+' • Priority: '+esc(c.priority)+'</p><div class="contact-meta">'+(c.tags||[]).map(function(t){return '<span class="tag">'+esc(t)+'</span>'}).join("")+'</div></div>'+
      '<div class="card"><div class="card-head"><h3>Relationship Intelligence</h3><span class="tag">V2</span></div><div class="intelligence-list">'+(intel.map(function(msg){return '<div class="intelligence-item"><div class="list-main"><small>'+esc(msg)+'</small></div></div>'}).join("")||'<div class="muted">No recommendation right now.</div>')+'</div></div></div>'+
      '<div class="profile-grid"><div class="card"><div class="card-head"><h3>Contact Details</h3></div><div class="list"><div class="list-item"><div class="list-main"><small>Email</small><strong>'+esc(c.email||"—")+'</strong></div></div><div class="list-item"><div class="list-main"><small>Phone</small><strong>'+esc(c.phone||"—")+'</strong></div></div><div class="list-item"><div class="list-main"><small>Where met</small><strong>'+esc(c.whereMet||"—")+'</strong></div></div></div></div><div class="card"><div class="card-head"><h3>Open Follow-Ups</h3></div>'+followupList(fus)+'</div></div>'+
      '<div class="card" style="margin-top:18px"><div class="card-head"><div><p class="eyebrow">Unified History</p><h3>Relationship Timeline</h3></div></div>'+combinedTimeline(c)+'</div>'+
      '<div class="card" style="margin-top:18px"><div class="card-head"><h3>Notes</h3></div><p class="muted">'+esc(c.notes||"No notes yet.")+'</p><div class="actions"><button class="btn danger" onclick="deleteContact('+c.id+')">Delete Contact</button></div></div>';
  };

  followupsView=function(){
    const rows=dueFollowups();
    const completed=state.followUps.filter(function(x){return x.status==="Completed"}).sort(function(a,b){return String(b.completedAt).localeCompare(String(a.completedAt))}).slice(0,12);
    return sectionTitle("Smart Follow-Ups","Complete, snooze, reschedule or edit without losing relationship context.","＋ Follow-Up","openFollowupModal()")+
      '<div class="grid grid-4">'+
      stat("Overdue",rows.filter(function(x){return daysFromToday(x.date)<0}).length,"Needs attention")+
      stat("Today",rows.filter(function(x){return daysFromToday(x.date)===0}).length,"Due now")+
      stat("Upcoming",rows.filter(function(x){return daysFromToday(x.date)>0}).length,"Scheduled")+
      stat("Completed",state.followUps.filter(function(x){return x.status==="Completed"}).length,"All time")+
      '</div><div class="grid grid-3" style="margin-top:18px">'+
      '<div class="card"><div class="card-head"><h3>Overdue</h3></div>'+followupList(rows.filter(function(x){return daysFromToday(x.date)<0}))+'</div>'+
      '<div class="card"><div class="card-head"><h3>Today</h3></div>'+followupList(rows.filter(function(x){return daysFromToday(x.date)===0}))+'</div>'+
      '<div class="card"><div class="card-head"><h3>Upcoming</h3></div>'+followupList(rows.filter(function(x){return daysFromToday(x.date)>0}).slice(0,12))+'</div></div>'+
      '<div class="card" style="margin-top:18px"><div class="card-head"><h3>Recently Completed</h3></div>'+followupList(completed)+'</div>';
  };

  ensureV2();
  render();
})();