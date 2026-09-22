// Personal CRM — Advanced V4: opportunities + important dates
(function(){
  const V4_VERSION=4;
  const OPPORTUNITY_TYPES=["Internship","Freelance Client","Job","Collaboration","Mentorship","Project","Sponsorship","Referral","Other"];
  const OPPORTUNITY_STATUSES=["New","Exploring","Applied / Proposed","In Progress","Won","Lost","On Hold"];
  const DATE_TYPES=["Meeting","Birthday","Anniversary","College Event","Networking Event","Deadline","Reminder","Custom"];

  function ensureV4(){
    state.schemaVersion=V4_VERSION;
    state.opportunities=Array.isArray(state.opportunities)?state.opportunities:[];
    state.importantDates=Array.isArray(state.importantDates)?state.importantDates:[];
    state.opportunities=state.opportunities.map(function(o){
      if(!OPPORTUNITY_TYPES.includes(o.type))o.type="Other";
      if(!OPPORTUNITY_STATUSES.includes(o.status))o.status="New";
      if(!("value" in o))o.value=0;
      if(!("deadline" in o))o.deadline="";
      if(!("notes" in o))o.notes="";
      return o;
    });
    state.importantDates=state.importantDates.map(function(x){
      if(!DATE_TYPES.includes(x.type))x.type="Custom";
      if(!("recurringYearly" in x))x.recurringYearly=false;
      if(!("contactId" in x))x.contactId=null;
      return x;
    });
    save();
  }

  function opportunityById(oid){return state.opportunities.find(function(o){return o.id===oid})}
  function importantDateById(did){return state.importantDates.find(function(x){return x.id===did})}
  function contactOpportunities(contactId){return state.opportunities.filter(function(o){return o.contactId===contactId})}
  function activeOpportunity(o){return !["Won","Lost"].includes(o.status)}

  function money(v){
    const n=Number(v||0);
    if(!n)return "—";
    try{return new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(n)}
    catch(e){return "₹"+Math.round(n)}
  }

  function opportunityRisk(o){
    if(["Won","Lost"].includes(o.status))return {label:o.status,cls:o.status==="Won"?"good":"bad"};
    if(!o.deadline)return {label:"No deadline",cls:"neutral"};
    const d=daysFromToday(o.deadline);
    if(d<0)return {label:"Overdue",cls:"bad"};
    if(d===0)return {label:"Due today",cls:"bad"};
    if(d<=3)return {label:d+"d left",cls:"warn"};
    if(d<=14)return {label:d+"d left",cls:"neutral"};
    return {label:d+"d left",cls:"good"};
  }

  function optionValues(values,current){
    return values.map(function(x){return '<option '+(x===current?'selected':'')+'>'+esc(x)+'</option>'}).join("");
  }

  window.openOpportunityModal=function(oid,contactId){
    if(!state.contacts.length){toast("Add a contact first");return}
    const o=oid?opportunityById(oid):{
      contactId:contactId||state.contacts[0].id,
      type:"Internship",title:"",status:"New",value:0,deadline:"",notes:""
    };
    if(!o)return;
    openModal(oid?"Edit Opportunity":"Add Opportunity",
      selectField("Contact","contactId",state.contacts.map(function(c){return String(c.id)+"|"+c.name}),String(o.contactId)+"|"+(contactById(o.contactId)?.name||""))+
      field("Opportunity Title","title","text",o.title,'required')+
      '<div class="form-grid">'+
      selectField("Type","type",OPPORTUNITY_TYPES,o.type)+
      selectField("Status","status",OPPORTUNITY_STATUSES,o.status)+
      field("Estimated Value (₹)","value","number",o.value||"", 'min="0" step="1"')+
      field("Deadline","deadline","date",o.deadline||"")+
      '</div>'+textArea("Notes","notes",o.notes||""),
      function(fd){
        const data={
          contactId:Number(String(fd.get("contactId")).split("|")[0]),
          title:fd.get("title").trim(),
          type:fd.get("type"),
          status:fd.get("status"),
          value:Number(fd.get("value")||0),
          deadline:fd.get("deadline"),
          notes:fd.get("notes").trim(),
          updatedAt:new Date().toISOString()
        };
        if(oid)Object.assign(o,data);
        else state.opportunities.unshift(Object.assign({id:id(),createdAt:new Date().toISOString()},data));
        save();render();toast(oid?"Opportunity updated":"Opportunity added");
      }
    );
  };

  window.deleteOpportunity=function(oid){
    const o=opportunityById(oid);if(!o||!confirm("Delete this opportunity?"))return;
    state.opportunities=state.opportunities.filter(function(x){return x.id!==oid});
    save();render();toast("Opportunity deleted");
  };

  window.setOpportunityStatus=function(oid,status){
    const o=opportunityById(oid);if(!o||!OPPORTUNITY_STATUSES.includes(status))return;
    o.status=status;o.updatedAt=new Date().toISOString();save();render();toast("Opportunity moved to "+status);
  };

  function opportunityCard(o,compact){
    const c=contactById(o.contactId),risk=opportunityRisk(o);
    return '<div class="opportunity-card">'+
      '<div class="opportunity-head"><div><p class="eyebrow">'+esc(o.type)+'</p><strong>'+esc(o.title)+'</strong><small>'+esc(c?.name||"Unknown contact")+'</small></div><span class="risk-pill '+risk.cls+'">'+esc(risk.label)+'</span></div>'+
      '<div class="opportunity-meta"><span class="tag">'+esc(o.status)+'</span><span class="tag">'+money(o.value)+'</span>'+(o.deadline?'<span class="tag">'+esc(o.deadline)+'</span>':'')+'</div>'+
      (!compact&&o.notes?'<p class="muted">'+esc(o.notes)+'</p>':'')+
      '<div class="opportunity-actions"><select class="stage-select" onchange="setOpportunityStatus('+o.id+',this.value)">'+optionValues(OPPORTUNITY_STATUSES,o.status)+'</select><button class="btn ghost" onclick="openOpportunityModal('+o.id+')">Edit</button><button class="btn ghost danger" onclick="deleteOpportunity('+o.id+')">Delete</button></div>'+
      '</div>';
  }

  function opportunityMetrics(){
    const active=state.opportunities.filter(activeOpportunity);
    const won=state.opportunities.filter(function(o){return o.status==="Won"});
    const dueSoon=active.filter(function(o){const d=daysFromToday(o.deadline);return o.deadline&&d>=0&&d<=7});
    const pipelineValue=active.reduce(function(sum,o){return sum+Number(o.value||0)},0);
    return '<div class="grid grid-4">'+
      stat("Active",active.length,"Open opportunities")+
      stat("Due in 7 Days",dueSoon.length,"Needs attention")+
      stat("Won",won.length,"Successful outcomes")+
      stat("Pipeline Value",money(pipelineValue),"Estimated value")+
      '</div>';
  }

  window.opportunitiesView=function(){
    const groups=OPPORTUNITY_STATUSES.map(function(status){return {status:status,rows:state.opportunities.filter(function(o){return o.status===status})}});
    return sectionTitle("Opportunities","Track internships, clients, jobs, collaborations and other relationship-driven outcomes.","＋ Opportunity","openOpportunityModal()")+
      opportunityMetrics()+
      '<div class="opportunity-board" style="margin-top:18px">'+groups.map(function(g){
        return '<section class="opportunity-column"><div class="pipeline-column-head"><div><strong>'+esc(g.status)+'</strong><small>'+g.rows.length+' item(s)</small></div></div><div class="pipeline-stack">'+
        (g.rows.map(function(o){return opportunityCard(o,true)}).join("")||'<div class="pipeline-empty">No opportunities</div>')+
        '</div></section>';
      }).join("")+'</div>';
  };

  function nextAnnualDate(date){
    if(!date)return null;
    const parts=date.split("-");if(parts.length!==3)return null;
    const now=new Date(),y=now.getFullYear(),m=Number(parts[1])-1,d=Number(parts[2]);
    let candidate=new Date(y,m,d);
    candidate.setHours(0,0,0,0);
    const start=new Date();start.setHours(0,0,0,0);
    if(candidate<start)candidate=new Date(y+1,m,d);
    return candidate;
  }

  function daysUntilDate(item){
    if(!item.date)return null;
    if(item.recurringYearly){
      const d=nextAnnualDate(item.date);if(!d)return null;
      const start=new Date();start.setHours(0,0,0,0);
      return Math.round((d-start)/86400000);
    }
    return daysFromToday(item.date);
  }

  function generatedBirthdayItems(){
    return state.contacts.filter(function(c){return c.birthday}).map(function(c){
      return {
        id:"birthday-"+c.id,
        contactId:c.id,
        type:"Birthday",
        title:c.name+"'s Birthday",
        date:c.birthday,
        recurringYearly:true,
        notes:"From contact profile",
        generated:true
      };
    });
  }

  function allDateItems(){
    return state.importantDates.concat(generatedBirthdayItems()).sort(function(a,b){
      const da=daysUntilDate(a),db=daysUntilDate(b);
      return (da==null?99999:da)-(db==null?99999:db);
    });
  }

  window.openImportantDateModal=function(did,contactId){
    const x=did?importantDateById(did):{
      contactId:contactId||null,type:"Meeting",title:"",date:today(),recurringYearly:false,notes:""
    };
    if(!x)return;
    const contactOptions=['|No contact'].concat(state.contacts.map(function(c){return String(c.id)+"|"+c.name}));
    openModal(did?"Edit Important Date":"Add Important Date",
      selectField("Contact (optional)","contactId",contactOptions,(x.contactId?String(x.contactId):"")+"|"+(x.contactId?(contactById(x.contactId)?.name||""):"No contact"))+
      field("Title","title","text",x.title,'required')+
      '<div class="form-grid">'+selectField("Type","type",DATE_TYPES,x.type)+field("Date","date","date",x.date,'required')+'</div>'+
      '<div class="field"><label><input name="recurringYearly" type="checkbox" '+(x.recurringYearly?'checked':'')+'> Repeat every year</label></div>'+
      textArea("Notes","notes",x.notes||""),
      function(fd){
        const raw=String(fd.get("contactId")||""),cid=Number(raw.split("|")[0])||null;
        const data={
          contactId:cid,
          title:fd.get("title").trim(),
          type:fd.get("type"),
          date:fd.get("date"),
          recurringYearly:fd.get("recurringYearly")==="on",
          notes:fd.get("notes").trim(),
          updatedAt:new Date().toISOString()
        };
        if(did)Object.assign(x,data);
        else state.importantDates.unshift(Object.assign({id:id(),createdAt:new Date().toISOString()},data));
        save();render();toast(did?"Important date updated":"Important date added");
      }
    );
  };

  window.deleteImportantDate=function(did){
    const x=importantDateById(did);if(!x||!confirm("Delete this important date?"))return;
    state.importantDates=state.importantDates.filter(function(i){return i.id!==did});
    save();render();toast("Important date deleted");
  };

  function dateBadge(item){
    const d=daysUntilDate(item);
    if(d==null)return {text:"No date",cls:"neutral"};
    if(d<0)return {text:"Past",cls:"bad"};
    if(d===0)return {text:"Today",cls:"bad"};
    if(d===1)return {text:"Tomorrow",cls:"warn"};
    if(d<=7)return {text:d+"d",cls:"warn"};
    if(d<=30)return {text:d+"d",cls:"neutral"};
    return {text:d+"d",cls:"good"};
  }

  function dateCard(item){
    const badge=dateBadge(item),c=item.contactId?contactById(item.contactId):null;
    return '<div class="date-card">'+
      '<div class="date-icon">'+esc(String(item.type||"Date").slice(0,1))+'</div>'+
      '<div class="list-main"><strong>'+esc(item.title)+'</strong><small>'+esc(item.type)+' • '+esc(item.date)+(item.recurringYearly?' • yearly':'')+(c?' • '+esc(c.name):'')+'</small>'+(item.notes?'<p>'+esc(item.notes)+'</p>':'')+'</div>'+
      '<span class="risk-pill '+badge.cls+'">'+esc(badge.text)+'</span>'+
      (!item.generated?'<div class="date-actions"><button class="btn ghost" onclick="openImportantDateModal('+item.id+')">Edit</button><button class="btn ghost danger" onclick="deleteImportantDate('+item.id+')">Delete</button></div>':'')+
      '</div>';
  }

  window.importantDatesView=function(){
    const rows=allDateItems(),upcoming=rows.filter(function(x){const d=daysUntilDate(x);return d!=null&&d>=0});
    const todayRows=upcoming.filter(function(x){return daysUntilDate(x)===0});
    const week=upcoming.filter(function(x){const d=daysUntilDate(x);return d>=0&&d<=7});
    const month=upcoming.filter(function(x){const d=daysUntilDate(x);return d>=0&&d<=30});
    return sectionTitle("Important Dates","Birthdays, meetings, events, reminders and recurring dates in one place.","＋ Important Date","openImportantDateModal()")+
      '<div class="grid grid-4">'+
      stat("Today",todayRows.length,"Happening now")+
      stat("Next 7 Days",week.length,"Upcoming soon")+
      stat("Next 30 Days",month.length,"Plan ahead")+
      stat("Recurring",rows.filter(function(x){return x.recurringYearly}).length,"Annual dates")+
      '</div>'+
      '<div class="card" style="margin-top:18px"><div class="card-head"><div><p class="eyebrow">Date Center</p><h3>Upcoming timeline</h3></div></div><div class="date-list">'+
      (upcoming.slice(0,40).map(dateCard).join("")||empty("No upcoming important dates."))+
      '</div></div>';
  };

  function opportunityAlerts(){
    return state.opportunities.filter(activeOpportunity).filter(function(o){
      const d=daysFromToday(o.deadline);return o.deadline&&d<=7;
    }).sort(function(a,b){return String(a.deadline).localeCompare(String(b.deadline))});
  }

  function dashboardV4Panels(){
    const opps=opportunityAlerts().slice(0,5);
    const dates=allDateItems().filter(function(x){const d=daysUntilDate(x);return d!=null&&d>=0&&d<=14}).slice(0,5);
    return '<div class="grid grid-2" style="margin-top:18px">'+
      '<div class="card"><div class="card-head"><div><p class="eyebrow">Opportunity Radar</p><h3>Deadlines & outcomes</h3></div><button class="btn ghost" onclick="navTo(\'opportunities\')">Open</button></div><div class="list">'+
      (opps.map(function(o){const c=contactById(o.contactId),risk=opportunityRisk(o);return '<div class="list-item"><div class="list-main"><strong>'+esc(o.title)+'</strong><small>'+esc(c?.name||"Unknown")+' • '+esc(o.status)+' • '+esc(o.deadline)+'</small></div><span class="risk-pill '+risk.cls+'">'+esc(risk.label)+'</span></div>'}).join("")||empty("No urgent opportunity deadlines."))+
      '</div></div>'+
      '<div class="card"><div class="card-head"><div><p class="eyebrow">Important Dates</p><h3>Next 14 days</h3></div><button class="btn ghost" onclick="navTo(\'dates\')">Open</button></div><div class="date-list compact">'+
      (dates.map(dateCard).join("")||empty("Nothing important in the next 14 days."))+
      '</div></div></div>';
  }

  const dashboardV4Base=dashboardView;
  dashboardView=function(){return dashboardV4Base()+dashboardV4Panels()};

  const profileV4Base=profileView;
  profileView=function(){
    const c=contactById(activeContactId),base=profileV4Base();
    if(!c)return base;
    const opps=contactOpportunities(c.id);
    const dates=allDateItems().filter(function(x){return x.contactId===c.id}).slice(0,8);
    return base+
      '<div class="profile-grid">'+
      '<div class="card"><div class="card-head"><div><p class="eyebrow">Outcomes</p><h3>Opportunities</h3></div><button class="btn ghost" onclick="openOpportunityModal(null,'+c.id+')">＋ Add</button></div><div class="opportunity-stack">'+
      (opps.map(function(o){return opportunityCard(o,true)}).join("")||empty("No opportunities linked to this contact."))+
      '</div></div>'+
      '<div class="card"><div class="card-head"><div><p class="eyebrow">Dates</p><h3>Important dates</h3></div><button class="btn ghost" onclick="openImportantDateModal(null,'+c.id+')">＋ Add</button></div><div class="date-list compact">'+
      (dates.map(dateCard).join("")||empty("No important dates linked."))+
      '</div></div></div>';
  };

  const analyticsV4Base=analyticsView;
  analyticsView=function(){
    const base=analyticsV4Base();
    const active=state.opportunities.filter(activeOpportunity).length,won=state.opportunities.filter(function(o){return o.status==="Won"}).length;
    const winRate=state.opportunities.length?Math.round(won/state.opportunities.length*100):0;
    return base+'<div class="grid grid-2" style="margin-top:18px"><div class="card"><div class="card-head"><div><p class="eyebrow">Opportunity Analytics</p><h3>Relationship outcomes</h3></div><button class="btn ghost" onclick="navTo(\'opportunities\')">Open</button></div><div class="grid grid-2">'+
      stat("Active",active,"Open outcomes")+stat("Win Rate",winRate+"%","Won / all opportunities")+
      '</div></div><div class="card"><div class="card-head"><div><p class="eyebrow">Date Readiness</p><h3>Upcoming commitments</h3></div><button class="btn ghost" onclick="navTo(\'dates\')">Open</button></div><div class="grid grid-2">'+
      stat("Next 7 Days",allDateItems().filter(function(x){const d=daysUntilDate(x);return d!=null&&d>=0&&d<=7}).length,"Dates approaching")+stat("Recurring",allDateItems().filter(function(x){return x.recurringYearly}).length,"Annual reminders")+
      '</div></div></div>';
  };

  const renderV4Base=render;
  render=function(){
    if(currentView==="opportunities"||currentView==="dates"){
      document.getElementById("viewTitle").textContent=currentView==="opportunities"?"Opportunities":"Important Dates";
      document.getElementById("todayLabel").textContent=new Date().toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long"});
      document.getElementById("viewRoot").innerHTML=currentView==="opportunities"?opportunitiesView():importantDatesView();
      document.querySelectorAll("[data-view]").forEach(function(b){b.classList.toggle("active",b.dataset.view===currentView)});
      return;
    }
    renderV4Base();
  };

  ensureV4();
  render();
})();