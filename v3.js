// Personal CRM — Advanced V3: networking pipeline
(function(){
  const V3_VERSION=3;
  const STAGES=["New Contact","Connected","Conversation Started","Relationship Building","Opportunity","Strong Connection"];

  function ensureV3(){
    state.schemaVersion=V3_VERSION;
    state.pipelineActivity=Array.isArray(state.pipelineActivity)?state.pipelineActivity:[];
    state.contacts=(state.contacts||[]).map(function(c){
      if(!STAGES.includes(c.stage))c.stage="New Contact";
      if(!("stageUpdatedAt" in c))c.stageUpdatedAt=c.updatedAt||c.createdAt||new Date().toISOString();
      return c;
    });
    save();
  }

  function logPipeline(contact,from,to){
    state.pipelineActivity.unshift({
      id:id(),
      contactId:contact.id,
      contactName:contact.name,
      from:from,
      to:to,
      date:today(),
      timestamp:new Date().toISOString()
    });
    state.pipelineActivity=state.pipelineActivity.slice(0,150);
  }

  function stageIndex(stage){return Math.max(0,STAGES.indexOf(stage))}
  function stageProgress(stage){return Math.round(stageIndex(stage)/(STAGES.length-1)*100)}
  function stageSelect(c){
    return '<select class="stage-select" aria-label="Relationship stage" onchange="moveContactStage('+c.id+',this.value)">'+
      STAGES.map(function(s){return '<option '+(s===c.stage?'selected':'')+'>'+esc(s)+'</option>'}).join("")+
      '</select>';
  }

  window.moveContactStage=function(cid,next){
    const c=contactById(cid);if(!c||!STAGES.includes(next)||c.stage===next)return;
    const prev=c.stage||"New Contact";
    c.stage=next;c.stageUpdatedAt=new Date().toISOString();
    logPipeline(c,prev,next);
    if(next==="Strong Connection"&&relationshipScore(c)<80){
      c.priority=c.priority==="Low"?"Medium":c.priority;
    }
    save();render();toast(c.name+" moved to "+next);
  };

  let draggedContactId=null;
  window.pipelineDragStart=function(event,cid){
    draggedContactId=cid;
    if(event.dataTransfer){event.dataTransfer.effectAllowed="move";event.dataTransfer.setData("text/plain",String(cid))}
    event.currentTarget.classList.add("dragging");
  };
  window.pipelineDragEnd=function(event){
    event.currentTarget.classList.remove("dragging");
    document.querySelectorAll(".pipeline-column").forEach(function(x){x.classList.remove("drag-over")});
  };
  window.pipelineDragOver=function(event){
    event.preventDefault();
    event.currentTarget.classList.add("drag-over");
  };
  window.pipelineDragLeave=function(event){event.currentTarget.classList.remove("drag-over")};
  window.pipelineDrop=function(event,stage){
    event.preventDefault();event.currentTarget.classList.remove("drag-over");
    let cid=draggedContactId;
    if(event.dataTransfer&&event.dataTransfer.getData("text/plain"))cid=Number(event.dataTransfer.getData("text/plain"));
    if(cid)moveContactStage(Number(cid),stage);
    draggedContactId=null;
  };

  function pipelineCard(c){
    const score=relationshipScore(c),meta=strengthMeta(score),last=lastInteractionDate(c);
    return '<article class="pipeline-card" draggable="true" ondragstart="pipelineDragStart(event,'+c.id+')" ondragend="pipelineDragEnd(event)">'+
      '<div class="pipeline-card-head"><div class="avatar">'+esc(initials(c.name))+'</div><div class="list-main"><strong>'+esc(c.name)+'</strong><small>'+esc(c.jobTitle||c.relationshipType)+(c.company?' • '+esc(c.company):'')+'</small></div><span class="score '+meta.cls+'">'+score+'</span></div>'+
      '<div class="contact-meta"><span class="tag">'+esc(c.relationshipType)+'</span><span class="tag">'+esc(c.priority)+'</span></div>'+
      '<div class="pipeline-progress"><span style="width:'+stageProgress(c.stage)+'%"></span></div>'+
      '<small class="muted">'+(last?'Last interaction: '+esc(last):'No interaction yet')+'</small>'+
      '<div class="pipeline-card-actions"><button class="btn ghost" onclick="openContactProfile('+c.id+')">Open</button>'+stageSelect(c)+'</div>'+
      '</article>';
  }

  function pipelineActivityHtml(){
    const rows=(state.pipelineActivity||[]).slice(0,10);
    if(!rows.length)return empty("Stage changes will appear here.");
    return '<div class="list">'+rows.map(function(a){
      return '<div class="list-item"><div class="list-main"><strong>'+esc(a.contactName)+'</strong><small>'+esc(a.from)+' → '+esc(a.to)+' • '+esc(a.date)+'</small></div></div>';
    }).join("")+'</div>';
  }

  function pipelineMetrics(){
    const advanced=state.contacts.filter(function(c){return stageIndex(c.stage)>=3}).length;
    const opportunity=state.contacts.filter(function(c){return c.stage==="Opportunity"}).length;
    const strong=state.contacts.filter(function(c){return c.stage==="Strong Connection"}).length;
    const untouched=state.contacts.filter(function(c){return c.stage==="New Contact"}).length;
    return '<div class="grid grid-4">'+
      stat("New Contacts",untouched,"Still at entry stage")+
      stat("Relationship Building+",advanced,"Reached deeper stages")+
      stat("Opportunities",opportunity,"Current opportunity stage")+
      stat("Strong Connections",strong,"Highest relationship stage")+
      '</div>';
  }

  window.pipelineView=function(){
    return sectionTitle("Networking Pipeline","Move relationships through clear stages. Drag on desktop or use the status dropdown on mobile.","＋ Add Contact","openContactModal()")+
      pipelineMetrics()+
      '<div class="pipeline-board" style="margin-top:18px">'+
      STAGES.map(function(stage){
        const rows=state.contacts.filter(function(c){return c.stage===stage});
        return '<section class="pipeline-column" ondragover="pipelineDragOver(event)" ondragleave="pipelineDragLeave(event)" ondrop="pipelineDrop(event,\''+stage+'\')">'+
          '<div class="pipeline-column-head"><div><strong>'+esc(stage)+'</strong><small>'+rows.length+' contact(s)</small></div><span class="tag">'+stageProgress(stage)+'%</span></div>'+
          '<div class="pipeline-stack">'+(rows.map(pipelineCard).join("")||'<div class="pipeline-empty">Drop contacts here</div>')+'</div>'+
          '</section>';
      }).join("")+
      '</div>'+
      '<div class="grid grid-2" style="margin-top:18px"><div class="card"><div class="card-head"><div><p class="eyebrow">Stage Distribution</p><h3>Relationship funnel</h3></div></div><div class="stage-distribution">'+
      STAGES.map(function(stage){
        const n=state.contacts.filter(function(c){return c.stage===stage}).length;
        const pct=state.contacts.length?Math.round(n/state.contacts.length*100):0;
        return '<div class="stage-row"><div class="split"><span>'+esc(stage)+'</span><b>'+n+'</b></div><div class="progress"><i style="width:'+pct+'%"></i></div></div>';
      }).join("")+
      '</div></div><div class="card"><div class="card-head"><div><p class="eyebrow">Recent Movement</p><h3>Pipeline activity</h3></div></div>'+pipelineActivityHtml()+'</div></div>';
  };

  const openContactModalV3Base=window.openContactModal;
  window.openContactModal=function(cid){
    const c=cid?contactById(cid):null;
    openContactModalV3Base(cid);
    setTimeout(function(){
      const body=document.getElementById("modalBody");
      if(!body)return;
      const current=c?.stage||"New Contact";
      const wrap=document.createElement("div");
      wrap.className="field";
      wrap.innerHTML='<label>Networking Stage</label><select name="stage">'+STAGES.map(function(s){return '<option '+(s===current?'selected':'')+'>'+esc(s)+'</option>'}).join("")+'</select>';
      body.appendChild(wrap);

      const form=document.getElementById("modalForm");
      const oldSubmit=form.onsubmit;
      form.onsubmit=function(e){
        const stageValue=new FormData(form).get("stage")||current;
        const before=cid?contactById(cid)?.stage:null;
        oldSubmit.call(form,e);
        const target=cid?contactById(cid):state.contacts[0];
        if(target&&STAGES.includes(stageValue)){
          const prior=before||target.stage||"New Contact";
          target.stage=stageValue;
          target.stageUpdatedAt=new Date().toISOString();
          if(prior!==stageValue)logPipeline(target,prior,stageValue);
          save();
        }
      };
    },0);
  };

  const contactCardV3Base=contactCard;
  contactCard=function(c){
    const base=contactCardV3Base(c);
    return base.replace('<div class="contact-meta">','<div class="contact-meta"><span class="tag">'+esc(c.stage||"New Contact")+'</span>');
  };

  const profileV3Base=profileView;
  profileView=function(){
    const html=profileV3Base();
    const c=contactById(activeContactId);
    if(!c)return html;
    return '<div class="pipeline-profile-strip"><div><span class="muted">Networking Stage</span><strong>'+esc(c.stage)+'</strong></div>'+stageSelect(c)+'</div>'+html;
  };

  const analyticsV3Base=analyticsView;
  analyticsView=function(){
    const base=analyticsV3Base();
    return base+'<div class="card" style="margin-top:18px"><div class="card-head"><div><p class="eyebrow">Networking Pipeline</p><h3>Stage distribution</h3></div><button class="btn ghost" onclick="navTo(\'pipeline\')">Open Pipeline</button></div><div class="stage-distribution">'+
      STAGES.map(function(stage){
        const n=state.contacts.filter(function(c){return c.stage===stage}).length,pct=state.contacts.length?Math.round(n/state.contacts.length*100):0;
        return '<div class="stage-row"><div class="split"><span>'+esc(stage)+'</span><b>'+n+'</b></div><div class="progress"><i style="width:'+pct+'%"></i></div></div>';
      }).join("")+'</div></div>';
  };

  const renderV3Base=render;
  render=function(){
    if(currentView==="pipeline"){
      document.getElementById("viewTitle").textContent="Networking Pipeline";
      document.getElementById("todayLabel").textContent=new Date().toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long"});
      document.getElementById("viewRoot").innerHTML=pipelineView();
      document.querySelectorAll("[data-view]").forEach(function(b){b.classList.toggle("active",b.dataset.view==="pipeline")});
      return;
    }
    renderV3Base();
  };

  ensureV3();
  render();
})();