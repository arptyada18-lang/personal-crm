const STORAGE_KEY="personal-crm-v1";

const defaultState={
  profile:{name:"My Network",networkingGoal:"Build meaningful relationships consistently."},
  contacts:[],
  interactions:[],
  followUps:[],
  xp:0,
  settings:{theme:"midnight"},
  schemaVersion:1
};

let state=loadState(),currentView="dashboard",activeContactId=null,toastTimer=null;

function clone(x){return JSON.parse(JSON.stringify(x))}
function loadState(){
  try{
    const raw=localStorage.getItem(STORAGE_KEY);
    if(!raw)return clone(defaultState);
    const s=Object.assign(clone(defaultState),JSON.parse(raw));
    ["contacts","interactions","followUps"].forEach(k=>s[k]=Array.isArray(s[k])?s[k]:[]);
    return s;
  }catch(e){return clone(defaultState)}
}
function save(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state))}
function id(){return Date.now()+Math.floor(Math.random()*999)}
function esc(v){return String(v==null?"":v).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
function today(){const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")}
function daysFromToday(date){if(!date)return null;const a=new Date(today()+"T00:00:00"),b=new Date(date+"T00:00:00");return Math.round((b-a)/86400000)}
function initials(name){return String(name||"?").split(/\s+/).map(x=>x[0]).join("").slice(0,2).toUpperCase()}
function toast(msg){const el=document.getElementById("toast");el.textContent=msg;el.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove("show"),1800)}
function field(label,name,type,value,extra=""){return '<div class="field"><label>'+esc(label)+'</label><input name="'+name+'" type="'+type+'" value="'+esc(value||"")+'" '+extra+'></div>'}
function selectField(label,name,options,value){return '<div class="field"><label>'+esc(label)+'</label><select name="'+name+'">'+options.map(o=>'<option '+(o===value?'selected':'')+'>'+esc(o)+'</option>').join("")+'</select></div>'}
function textArea(label,name,value){return '<div class="field"><label>'+esc(label)+'</label><textarea name="'+name+'">'+esc(value||"")+'</textarea></div>'}
function sectionTitle(title,sub,action="",onclick=""){return '<div class="section-title"><div><h2>'+esc(title)+'</h2><p>'+esc(sub)+'</p></div>'+(action?'<button class="btn primary" onclick="'+onclick+'">'+esc(action)+'</button>':'')+'</div>'}
function stat(label,value,note){return '<div class="card"><div class="stat-label">'+esc(label)+'</div><div class="stat-value">'+esc(value)+'</div><div class="stat-note">'+esc(note)+'</div></div>'}
function empty(msg){return '<div class="empty">'+esc(msg)+'</div>'}

function contactInteractions(contactId){return state.interactions.filter(x=>x.contactId===contactId).sort((a,b)=>String(b.date).localeCompare(String(a.date)))}
function contactFollowups(contactId){return state.followUps.filter(x=>x.contactId===contactId)}
function lastInteractionDate(c){
  const list=contactInteractions(c.id);
  return list[0]?.date||c.lastInteraction||"";
}
function relationshipScore(c){
  let score=10;
  const ints=contactInteractions(c.id);
  const follow=contactFollowups(c.id);
  const last=lastInteractionDate(c);
  if(last){
    const d=daysFromToday(last);
    const age=Math.abs(d||0);
    score+=age<=7?30:age<=30?22:age<=60?12:4;
  }
  score+=Math.min(25,ints.length*5);
  const done=follow.filter(x=>x.status==="Completed").length;
  score+=Math.min(20,done*5);
  score+=c.priority==="High"?10:c.priority==="Medium"?6:3;
  score+=Math.min(5,ints.filter(x=>x.outcome).length);
  return Math.max(0,Math.min(100,score));
}
function strengthMeta(score){
  if(score>=80)return {label:"Strong",cls:"strong"};
  if(score>=60)return {label:"Active",cls:"active"};
  if(score>=40)return {label:"Needs Attention",cls:"attention"};
  return {label:"Dormant",cls:"dormant"};
}
function dueFollowups(){
  return state.followUps.filter(x=>x.status!=="Completed").sort((a,b)=>String(a.date).localeCompare(String(b.date)));
}
function contactById(cid){return state.contacts.find(x=>x.id===cid)}
function upcomingBirthdays(){
  const y=new Date().getFullYear();
  return state.contacts.filter(c=>c.birthday).map(c=>{
    const [,m,d]=c.birthday.split("-");let next=new Date(y,+m-1,+d);if(next<new Date())next=new Date(y+1,+m-1,+d);
    return {c,days:Math.ceil((next-new Date())/86400000)}
  }).filter(x=>x.days<=30).sort((a,b)=>a.days-b.days);
}

function dashboardView(){
  const due=dueFollowups(),todayDue=due.filter(x=>x.date===today()),overdue=due.filter(x=>daysFromToday(x.date)<0);
  const strong=state.contacts.filter(c=>relationshipScore(c)>=80).length;
  const dormant=state.contacts.filter(c=>relationshipScore(c)<40).length;
  return '<div class="hero"><div class="card hero-main"><p class="eyebrow">Personal relationship operating system</p><h2>Build relationships before you need them.</h2><p>Track people, interactions and follow-ups without turning your brain into a badly indexed spreadsheet.</p><div class="hero-actions"><button class="btn primary" onclick="openContactModal()">＋ Add Contact</button><button class="btn ghost" onclick="openInteractionModal()">＋ Log Interaction</button><button class="btn ghost" onclick="openFollowupModal()">＋ Follow-Up</button></div></div><div class="card"><p class="eyebrow">Today\'s Mission</p><h3>'+todayDue.length+' follow-up(s) due</h3><p class="muted">'+(overdue.length?overdue.length+' overdue relationship task(s) need attention.':'No overdue follow-ups. Keep the system boringly healthy.')+'</p></div></div>'+
  '<div class="grid grid-4">'+stat("Total Contacts",state.contacts.length,"People in your network")+stat("Strong Relationships",strong,"Score 80+")+stat("Follow-Ups Due",due.filter(x=>daysFromToday(x.date)<=0).length,"Today + overdue")+stat("Dormant",dormant,"Needs reconnection")+'</div>'+
  '<div class="grid grid-2" style="margin-top:18px"><div class="card"><div class="card-head"><h3>Priority Follow-Ups</h3><button class="btn ghost" onclick="navTo(\'followups\')">Open</button></div>'+followupList(due.slice(0,5))+'</div><div class="card"><div class="card-head"><h3>Upcoming Birthdays</h3></div>'+birthdayList(upcomingBirthdays().slice(0,5))+'</div></div>';
}

function contactCard(c){
  const s=relationshipScore(c),m=strengthMeta(s);
  return '<div class="card contact-card"><div class="contact-top"><div class="avatar">'+esc(initials(c.name))+'</div><div class="list-main"><strong>'+esc(c.name)+'</strong><small>'+esc(c.jobTitle||c.relationshipType)+(c.company?' • '+esc(c.company):'')+'</small></div><span class="score '+m.cls+'">'+s+'</span></div><div class="contact-meta"><span class="tag">'+esc(c.relationshipType)+'</span><span class="tag">'+esc(c.priority)+' priority</span>'+(c.tags||[]).slice(0,3).map(t=>'<span class="tag">'+esc(t)+'</span>').join("")+'</div><div><div class="split"><small class="muted">'+m.label+'</small><small class="muted">'+(lastInteractionDate(c)?'Last: '+esc(lastInteractionDate(c)):'No interactions')+'</small></div><div class="progress"><i style="width:'+s+'%"></i></div></div><div class="actions"><button class="btn ghost" onclick="openContactProfile('+c.id+')">Open</button><button class="btn ghost" onclick="openInteractionModal('+c.id+')">＋ Interaction</button><button class="btn ghost" onclick="openFollowupModal('+c.id+')">＋ Follow-Up</button></div></div>';
}
function contactsView(){
  return sectionTitle("Contacts","Search and manage the people in your network.","＋ Add Contact","openContactModal()")+
  '<div class="toolbar"><input id="contactSearch" placeholder="Search name, company, tags..." oninput="renderContactsFiltered()"><select id="typeFilter" onchange="renderContactsFiltered()"><option value="">All types</option>'+["Friend","Classmate","Teacher","Mentor","Client","Recruiter","Creator","Business Contact","Freelancer","Family","Other"].map(x=>'<option>'+x+'</option>').join("")+'</select><select id="priorityFilter" onchange="renderContactsFiltered()"><option value="">All priorities</option><option>High</option><option>Medium</option><option>Low</option></select></div><div id="contactsGrid" class="grid grid-3">'+(state.contacts.map(contactCard).join("")||empty("No contacts yet. Add the first meaningful connection."))+'</div>';
}
window.renderContactsFiltered=function(){
  const q=(document.getElementById("contactSearch")?.value||"").toLowerCase(),type=document.getElementById("typeFilter")?.value||"",priority=document.getElementById("priorityFilter")?.value||"";
  const rows=state.contacts.filter(c=>{
    const hay=[c.name,c.company,c.jobTitle,c.location,c.relationshipType,(c.tags||[]).join(" "),c.notes].join(" ").toLowerCase();
    return (!q||hay.includes(q))&&(!type||c.relationshipType===type)&&(!priority||c.priority===priority);
  });
  document.getElementById("contactsGrid").innerHTML=rows.map(contactCard).join("")||empty("No contacts match these filters.");
};

function followupList(rows){
  if(!rows.length)return empty("No follow-ups here.");
  return '<div class="list">'+rows.map(f=>{
    const c=contactById(f.contactId),d=daysFromToday(f.date);
    return '<div class="list-item"><div class="list-main"><strong>'+esc(f.title)+'</strong><small>'+esc(c?.name||"Unknown")+' • '+esc(f.date)+' • '+esc(f.priority)+'</small></div><span class="tag">'+(d<0?'Overdue':d===0?'Today':'Upcoming')+'</span><button class="btn ghost" onclick="completeFollowup('+f.id+')">✓</button></div>';
  }).join("")+'</div>';
}
function followupsView(){
  const rows=dueFollowups();
  return sectionTitle("Follow-Ups","Stay consistent without pretending memory is a CRM.","＋ Follow-Up","openFollowupModal()")+
  '<div class="grid grid-3">'+
  '<div class="card"><div class="card-head"><h3>Overdue</h3></div>'+followupList(rows.filter(x=>daysFromToday(x.date)<0))+'</div>'+
  '<div class="card"><div class="card-head"><h3>Today</h3></div>'+followupList(rows.filter(x=>daysFromToday(x.date)===0))+'</div>'+
  '<div class="card"><div class="card-head"><h3>Upcoming</h3></div>'+followupList(rows.filter(x=>daysFromToday(x.date)>0).slice(0,10))+'</div></div>';
}
function interactionsView(){
  const rows=state.interactions.slice().sort((a,b)=>String(b.date).localeCompare(String(a.date)));
  return sectionTitle("Interactions","A searchable memory of conversations and relationship activity.","＋ Log Interaction","openInteractionModal()")+
  '<div class="card"><div class="timeline">'+(rows.map(x=>{const c=contactById(x.contactId);return '<div class="timeline-item"><strong>'+esc(x.type)+' • '+esc(c?.name||"Unknown")+'</strong><p>'+esc(x.summary)+'</p><small>'+esc(x.date)+(x.outcome?' • '+esc(x.outcome):'')+'</small></div>'}).join("")||empty("No interactions logged yet."))+'</div></div>';
}
function analyticsView(){
  const total=state.contacts.length,strong=state.contacts.filter(c=>relationshipScore(c)>=80).length,active=state.contacts.filter(c=>relationshipScore(c)>=60).length;
  const done=state.followUps.filter(x=>x.status==="Completed").length,rate=state.followUps.length?Math.round(done/state.followUps.length*100):0;
  const types={};state.contacts.forEach(c=>types[c.relationshipType]=(types[c.relationshipType]||0)+1);
  return sectionTitle("Network Analytics","Understand whether your network is actually alive.")+
  '<div class="grid grid-4">'+stat("Network Size",total,"Tracked contacts")+stat("Active / Strong",active,"Score 60+")+stat("Follow-Up Rate",rate+"%","Completed follow-ups")+stat("Interactions",state.interactions.length,"Logged conversations")+'</div>'+
  '<div class="grid grid-2" style="margin-top:18px"><div class="card"><div class="card-head"><h3>Relationship Mix</h3></div><div class="list">'+(Object.entries(types).sort((a,b)=>b[1]-a[1]).map(([k,v])=>'<div class="list-item"><div class="list-main"><strong>'+esc(k)+'</strong></div><span class="tag">'+v+'</span></div>').join("")||empty("Add contacts to see analytics."))+'</div></div><div class="card"><div class="card-head"><h3>Health Snapshot</h3></div><div class="list"><div class="list-item"><div class="list-main"><strong>Strong</strong></div><span class="score strong">'+strong+'</span></div><div class="list-item"><div class="list-main"><strong>Needs attention / Dormant</strong></div><span class="score dormant">'+state.contacts.filter(c=>relationshipScore(c)<60).length+'</span></div></div></div></div>';
}
function settingsView(){
  return sectionTitle("Settings","Backup, restore and privacy controls.")+
  '<div class="grid grid-2"><div class="card"><div class="card-head"><h3>Privacy</h3></div><p class="muted">All CRM data is stored in this browser via LocalStorage. The public GitHub repository contains code only, not your contacts.</p></div><div class="card"><div class="card-head"><h3>Backup</h3></div><div class="actions"><button class="btn primary" onclick="exportBackup()">Export JSON</button><label class="btn ghost" style="cursor:pointer">Import JSON<input type="file" accept="application/json" onchange="importBackup(event)" hidden></label><button class="btn danger" onclick="resetData()">Reset Data</button></div></div></div>';
}
function birthdayList(rows){
  if(!rows.length)return empty("No birthdays in the next 30 days.");
  return '<div class="list">'+rows.map(x=>'<div class="list-item"><div class="avatar">'+esc(initials(x.c.name))+'</div><div class="list-main"><strong>'+esc(x.c.name)+'</strong><small>'+x.days+' day(s) away</small></div></div>').join("")+'</div>';
}

window.openContactProfile=function(cid){
  activeContactId=cid;currentView="profile";render();
};
function profileView(){
  const c=contactById(activeContactId);if(!c)return empty("Contact not found.");
  const s=relationshipScore(c),m=strengthMeta(s),ints=contactInteractions(c.id),fus=contactFollowups(c.id).filter(x=>x.status!=="Completed");
  return '<div class="card profile-hero"><div class="avatar">'+esc(initials(c.name))+'</div><div><p class="eyebrow">'+esc(c.relationshipType)+'</p><h2>'+esc(c.name)+'</h2><p class="muted">'+esc(c.jobTitle||"")+(c.company?' • '+esc(c.company):'')+(c.location?' • '+esc(c.location):'')+'</p></div><div class="actions"><button class="btn ghost" onclick="openContactModal('+c.id+')">Edit</button><button class="btn primary" onclick="openInteractionModal('+c.id+')">＋ Interaction</button><button class="btn ghost" onclick="openFollowupModal('+c.id+')">＋ Follow-Up</button></div></div>'+
  '<div class="profile-grid"><div class="card"><div class="card-head"><h3>Relationship Health</h3><span class="score '+m.cls+'">'+s+'/100</span></div><div class="progress"><i style="width:'+s+'%"></i></div><p class="muted">'+m.label+' • Priority: '+esc(c.priority)+'</p><div class="contact-meta">'+(c.tags||[]).map(t=>'<span class="tag">'+esc(t)+'</span>').join("")+'</div></div><div class="card"><div class="card-head"><h3>Contact Details</h3></div><div class="list"><div class="list-item"><div class="list-main"><small>Email</small><strong>'+esc(c.email||"—")+'</strong></div></div><div class="list-item"><div class="list-main"><small>Phone</small><strong>'+esc(c.phone||"—")+'</strong></div></div><div class="list-item"><div class="list-main"><small>Where met</small><strong>'+esc(c.whereMet||"—")+'</strong></div></div></div></div></div>'+
  '<div class="profile-grid"><div class="card"><div class="card-head"><h3>Interaction Timeline</h3></div><div class="timeline">'+(ints.map(x=>'<div class="timeline-item"><strong>'+esc(x.type)+'</strong><p>'+esc(x.summary)+'</p><small>'+esc(x.date)+(x.outcome?' • '+esc(x.outcome):'')+'</small></div>').join("")||empty("No interaction history."))+'</div></div><div class="card"><div class="card-head"><h3>Open Follow-Ups</h3></div>'+followupList(fus)+'</div></div>'+
  '<div class="card" style="margin-top:18px"><div class="card-head"><h3>Notes</h3></div><p class="muted">'+esc(c.notes||"No notes yet.")+'</p><div class="actions"><button class="btn danger" onclick="deleteContact('+c.id+')">Delete Contact</button></div></div>';
}

function openModal(title,body,onSave){
  const modal=document.getElementById("modal"),form=document.getElementById("modalForm");
  document.getElementById("modalTitle").textContent=title;document.getElementById("modalBody").innerHTML=body;
  form.onsubmit=e=>{e.preventDefault();const fd=new FormData(form);onSave(fd);modal.close()};
  modal.showModal();
}

window.openContactModal=function(cid){
  const c=cid?contactById(cid):{name:"",phone:"",email:"",company:"",jobTitle:"",location:"",relationshipType:"Friend",priority:"Medium",birthday:"",whereMet:"",firstMetDate:"",tags:[],notes:""};
  openModal(cid?"Edit Contact":"Add Contact",
    '<div class="form-grid">'+field("Full Name","name","text",c.name,'required')+field("Phone","phone","tel",c.phone)+field("Email","email","email",c.email)+field("Company / Organization","company","text",c.company)+field("Job Title / Role","jobTitle","text",c.jobTitle)+field("Location","location","text",c.location)+selectField("Relationship Type","relationshipType",["Friend","Classmate","Teacher","Mentor","Client","Recruiter","Creator","Business Contact","Freelancer","Family","Other"],c.relationshipType)+selectField("Priority","priority",["High","Medium","Low"],c.priority)+field("Birthday","birthday","date",c.birthday)+field("First Met","firstMetDate","date",c.firstMetDate)+field("Where We Met","whereMet","text",c.whereMet)+field("Tags (comma separated)","tags","text",(c.tags||[]).join(", "))+'</div>'+textArea("Notes","notes",c.notes),
    fd=>{
      const data={name:fd.get("name").trim(),phone:fd.get("phone").trim(),email:fd.get("email").trim(),company:fd.get("company").trim(),jobTitle:fd.get("jobTitle").trim(),location:fd.get("location").trim(),relationshipType:fd.get("relationshipType"),priority:fd.get("priority"),birthday:fd.get("birthday"),firstMetDate:fd.get("firstMetDate"),whereMet:fd.get("whereMet").trim(),tags:fd.get("tags").split(",").map(x=>x.trim()).filter(Boolean),notes:fd.get("notes").trim(),updatedAt:new Date().toISOString()};
      if(cid){Object.assign(c,data)}else{state.contacts.unshift(Object.assign({id:id(),createdAt:new Date().toISOString()},data));state.xp+=5}
      save();render();toast(cid?"Contact updated":"Contact added");
    }
  )
};

window.openInteractionModal=function(cid){
  if(!state.contacts.length){toast("Add a contact first");return}
  const contactId=cid||state.contacts[0].id;
  openModal("Log Interaction",
    selectField("Contact","contactId",state.contacts.map(c=>String(c.id)+"|"+c.name),String(contactId)+"|"+contactById(contactId)?.name)+
    '<div class="form-grid">'+selectField("Type","type",["WhatsApp","Phone Call","Email","LinkedIn","Instagram","Meeting","Video Call","College Conversation","Client Conversation","Other"],"WhatsApp")+field("Date","date","date",today(),'required')+'</div>'+textArea("Summary","summary","")+field("Outcome","outcome","text","")+field("Next Step","nextStep","text",""),
    fd=>{
      const raw=String(fd.get("contactId")),selectedId=Number(raw.split("|")[0]);
      state.interactions.unshift({id:id(),contactId:selectedId,type:fd.get("type"),date:fd.get("date"),summary:fd.get("summary").trim(),outcome:fd.get("outcome").trim(),nextStep:fd.get("nextStep").trim(),createdAt:new Date().toISOString()});
      const c=contactById(selectedId);if(c)c.lastInteraction=fd.get("date");
      state.xp+=5;save();render();toast("Interaction logged");
    }
  )
};

window.openFollowupModal=function(cid){
  if(!state.contacts.length){toast("Add a contact first");return}
  const contactId=cid||state.contacts[0].id;
  openModal("Add Follow-Up",
    selectField("Contact","contactId",state.contacts.map(c=>String(c.id)+"|"+c.name),String(contactId)+"|"+contactById(contactId)?.name)+
    field("Title","title","text","Follow up",'required')+'<div class="form-grid">'+field("Date","date","date",today(),'required')+selectField("Priority","priority",["High","Medium","Low"],"Medium")+'</div>'+textArea("Reason","reason",""),
    fd=>{
      const selectedId=Number(String(fd.get("contactId")).split("|")[0]);
      state.followUps.unshift({id:id(),contactId:selectedId,title:fd.get("title").trim(),date:fd.get("date"),priority:fd.get("priority"),reason:fd.get("reason").trim(),status:"Upcoming",createdAt:new Date().toISOString()});
      save();render();toast("Follow-up added");
    }
  )
};

window.completeFollowup=function(fid){
  const f=state.followUps.find(x=>x.id===fid);if(!f)return;
  f.status="Completed";f.completedAt=new Date().toISOString();state.xp+=10;save();render();toast("Follow-up completed");
};
window.deleteContact=function(cid){
  const c=contactById(cid);if(!c||!confirm("Delete "+c.name+" and related CRM records?"))return;
  state.contacts=state.contacts.filter(x=>x.id!==cid);state.interactions=state.interactions.filter(x=>x.contactId!==cid);state.followUps=state.followUps.filter(x=>x.contactId!==cid);activeContactId=null;currentView="contacts";save();render();toast("Contact deleted");
};

window.exportBackup=function(){
  const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="personal-crm-backup-"+today()+".json";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500);
};
window.importBackup=function(e){
  const file=e.target.files?.[0];if(!file)return;
  const r=new FileReader();r.onload=()=>{try{const incoming=JSON.parse(r.result);if(!incoming||!Array.isArray(incoming.contacts))throw new Error();state=Object.assign(clone(defaultState),incoming);save();render();toast("Backup imported")}catch(err){toast("Invalid backup file")}};r.readAsText(file);
};
window.resetData=function(){if(!confirm("Reset all Personal CRM data?"))return;state=clone(defaultState);save();render();toast("CRM reset")};

window.navTo=function(v){currentView=v;activeContactId=null;render();document.getElementById("sidebar").classList.remove("open")};
function render(){
  const titles={dashboard:"Command Center",contacts:"Contacts",followups:"Follow-Ups",interactions:"Interactions",analytics:"Analytics",settings:"Settings",profile:"Contact Profile"};
  document.getElementById("viewTitle").textContent=titles[currentView]||"Personal CRM";
  document.getElementById("todayLabel").textContent=new Date().toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long"});
  let html="";
  if(currentView==="dashboard")html=dashboardView();
  else if(currentView==="contacts")html=contactsView();
  else if(currentView==="followups")html=followupsView();
  else if(currentView==="interactions")html=interactionsView();
  else if(currentView==="analytics")html=analyticsView();
  else if(currentView==="settings")html=settingsView();
  else if(currentView==="profile")html=profileView();
  document.getElementById("viewRoot").innerHTML=html;
  document.querySelectorAll("[data-view]").forEach(b=>b.classList.toggle("active",b.dataset.view===currentView));
}
document.querySelectorAll("[data-view]").forEach(b=>b.addEventListener("click",()=>navTo(b.dataset.view)));
document.getElementById("menuBtn").addEventListener("click",()=>document.getElementById("sidebar").classList.toggle("open"));
document.getElementById("addContactBtn").addEventListener("click",()=>openContactModal());
document.getElementById("quickInteractionBtn").addEventListener("click",()=>openInteractionModal());
document.getElementById("globalSearch").addEventListener("input",e=>{if(currentView!=="contacts")navTo("contacts");setTimeout(()=>{const el=document.getElementById("contactSearch");if(el){el.value=e.target.value;renderContactsFiltered()}},0)});
render();
