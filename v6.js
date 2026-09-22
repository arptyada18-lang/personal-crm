// Personal CRM — Advanced V6: smart actions + goals + gamification
(function(){
  const V6_VERSION=6;
  const GOAL_METRICS=[
    "Total Contacts",
    "Total Interactions",
    "Completed Follow-Ups",
    "Strong Relationships",
    "Strong Connections",
    "Won Opportunities"
  ];
  const BADGES=[
    {id:"first-connection",name:"First Connection",icon:"01",desc:"Add the first contact.",test:function(){return state.contacts.length>=1}},
    {id:"network-builder",name:"Network Builder",icon:"25",desc:"Build a network of 25 contacts.",test:function(){return state.contacts.length>=25}},
    {id:"fifty-connections",name:"50 Connections",icon:"50",desc:"Reach 50 contacts.",test:function(){return state.contacts.length>=50}},
    {id:"conversation-starter",name:"Conversation Starter",icon:"10",desc:"Log 10 interactions.",test:function(){return state.interactions.length>=10}},
    {id:"hundred-interactions",name:"100 Interactions",icon:"100",desc:"Log 100 interactions.",test:function(){return state.interactions.length>=100}},
    {id:"relationship-keeper",name:"Relationship Keeper",icon:"10F",desc:"Complete 10 follow-ups.",test:function(){return completedFollowups()>=10}},
    {id:"followup-master",name:"Follow-Up Master",icon:"25F",desc:"Complete 25 follow-ups.",test:function(){return completedFollowups()>=25}},
    {id:"super-connector",name:"Super Connector",icon:"SC",desc:"Maintain 5 strong relationships.",test:function(){return strongRelationships()>=5}},
    {id:"opportunity-maker",name:"Opportunity Maker",icon:"OP",desc:"Create 5 opportunities.",test:function(){return state.opportunities.length>=5}},
    {id:"closer",name:"Closer",icon:"W",desc:"Win the first opportunity.",test:function(){return wonOpportunities()>=1}}
  ];

  function dateKeyV6(value){
    return value?String(value).slice(0,10):"";
  }

  function ensureV6(){
    state.schemaVersion=V6_VERSION;
    state.networkingGoals=Array.isArray(state.networkingGoals)?state.networkingGoals:[];
    state.earnedBadges=Array.isArray(state.earnedBadges)?state.earnedBadges:[];
    state.xpLog=Array.isArray(state.xpLog)?state.xpLog:[];
    if(typeof state.xp!=="number")state.xp=0;
    evaluateGoals(false);
    evaluateBadges(false);
    save();
  }

  function completedFollowups(){
    return state.followUps.filter(function(f){return f.status==="Completed"}).length;
  }
  function strongRelationships(){
    return state.contacts.filter(function(c){return relationshipScore(c)>=80}).length;
  }
  function strongConnections(){
    return state.contacts.filter(function(c){return c.stage==="Strong Connection"}).length;
  }
  function wonOpportunities(){
    return state.opportunities.filter(function(o){return o.status==="Won"}).length;
  }
  function metricValue(metric){
    if(metric==="Total Contacts")return state.contacts.length;
    if(metric==="Total Interactions")return state.interactions.length;
    if(metric==="Completed Follow-Ups")return completedFollowups();
    if(metric==="Strong Relationships")return strongRelationships();
    if(metric==="Strong Connections")return strongConnections();
    if(metric==="Won Opportunities")return wonOpportunities();
    return 0;
  }
  function goalById(gid){return state.networkingGoals.find(function(g){return g.id===gid})}

  function awardXP(amount,reason,key){
    if(!amount)return false;
    if(key&&state.xpLog.some(function(x){return x.key===key}))return false;
    state.xp+=amount;
    state.xpLog.unshift({id:id(),key:key||"",amount:amount,reason:reason,date:today(),timestamp:new Date().toISOString()});
    state.xpLog=state.xpLog.slice(0,250);
    return true;
  }

  function levelInfo(){
    const xp=Math.max(0,state.xp||0);
    const level=Math.floor(xp/100)+1;
    const current=xp%100;
    return {level:level,xp:xp,current:current,next:100,percent:current};
  }

  function evaluateBadges(showToast){
    let unlocked=0;
    BADGES.forEach(function(b){
      if(b.test()&&!state.earnedBadges.some(function(x){return x.id===b.id})){
        state.earnedBadges.push({id:b.id,earnedAt:new Date().toISOString()});
        awardXP(20,"Badge unlocked: "+b.name,"badge:"+b.id);
        unlocked++;
        if(showToast)toast("Badge unlocked: "+b.name+" (+20 XP)");
      }
    });
    return unlocked;
  }

  function evaluateGoals(showToast){
    state.networkingGoals.forEach(function(g){
      const progress=metricValue(g.metric);
      if(progress>=Number(g.target||0)&&!g.completed){
        g.completed=true;g.completedAt=new Date().toISOString();
        awardXP(50,"Goal completed: "+g.title,"goal:"+g.id);
        if(showToast)toast("Goal completed: "+g.title+" (+50 XP)");
      }
    });
  }

  function refreshGamification(showToast){
    evaluateGoals(showToast);
    evaluateBadges(showToast);
    save();
  }

  window.openGoalModal=function(gid){
    const g=gid?goalById(gid):{title:"",metric:"Total Contacts",target:10,deadline:""};
    if(!g)return;
    openModal(gid?"Edit Networking Goal":"Add Networking Goal",
      field("Goal Title","title","text",g.title,'required')+
      '<div class="form-grid">'+
        selectField("Metric","metric",GOAL_METRICS,g.metric)+
        field("Target","target","number",g.target,'required min="1" step="1"')+
      '</div>'+
      field("Deadline (optional)","deadline","date",g.deadline||""),
      function(fd){
        const data={
          title:fd.get("title").trim(),
          metric:fd.get("metric"),
          target:Math.max(1,Number(fd.get("target")||1)),
          deadline:fd.get("deadline"),
          updatedAt:new Date().toISOString()
        };
        if(gid){Object.assign(g,data);g.completed=metricValue(g.metric)>=g.target}
        else state.networkingGoals.unshift(Object.assign({id:id(),completed:false,createdAt:new Date().toISOString()},data));
        refreshGamification(true);render();toast(gid?"Goal updated":"Goal added");
      }
    );
  };

  window.deleteNetworkingGoal=function(gid){
    const g=goalById(gid);if(!g||!confirm("Delete this networking goal?"))return;
    state.networkingGoals=state.networkingGoals.filter(function(x){return x.id!==gid});
    save();render();toast("Goal deleted");
  };

  function goalProgress(g){
    const value=metricValue(g.metric),target=Math.max(1,Number(g.target||1));
    return {value:value,target:target,pct:Math.min(100,Math.round(value/target*100))};
  }
  function goalCard(g){
    const p=goalProgress(g);
    const due=g.deadline?daysFromToday(g.deadline):null;
    const dueText=g.completed?"Completed":(due==null?"No deadline":due<0?"Overdue":due===0?"Due today":due+"d left");
    return '<div class="goal-card '+(g.completed?'completed':'')+'">'+
      '<div class="goal-head"><div><p class="eyebrow">'+esc(g.metric)+'</p><strong>'+esc(g.title)+'</strong></div><span class="risk-pill '+(g.completed?'good':(due!=null&&due<=3?'warn':'neutral'))+'">'+esc(dueText)+'</span></div>'+
      '<div class="split"><span class="muted">'+p.value+' / '+p.target+'</span><b>'+p.pct+'%</b></div>'+
      '<div class="progress"><i style="width:'+p.pct+'%"></i></div>'+
      '<div class="actions"><button class="btn ghost" onclick="openGoalModal('+g.id+')">Edit</button><button class="btn ghost danger" onclick="deleteNetworkingGoal('+g.id+')">Delete</button></div>'+
      '</div>';
  }

  function badgeHtml(b){
    const earned=state.earnedBadges.find(function(x){return x.id===b.id});
    return '<div class="badge-card '+(earned?'earned':'locked')+'"><div class="badge-icon">'+esc(b.icon)+'</div><div><strong>'+esc(b.name)+'</strong><p>'+esc(b.desc)+'</p><small>'+(earned?'Unlocked '+dateKeyV6(earned.earnedAt):'Locked')+'</small></div></div>';
  }

  function smartActions(){
    const actions=[];
    const overdue=state.followUps.filter(function(f){return f.status!=="Completed"&&f.date&&daysFromToday(f.date)<0});
    if(overdue.length)actions.push({priority:100,title:"Clear overdue follow-ups",detail:overdue.length+" overdue follow-up(s) need action.",action:"navTo('followups')",cta:"Open Follow-Ups"});

    state.contacts.forEach(function(c){
      const last=lastInteractionDate(c),age=last?Math.abs(daysFromToday(last)):999,score=relationshipScore(c);
      if(c.priority==="High"&&score<60)actions.push({priority:90,title:"Protect a high-priority relationship",detail:c.name+" has a relationship score of "+score+".",action:"openContactProfile("+c.id+")",cta:"Open Contact"});
      else if(age>60)actions.push({priority:70,title:"Reconnect with "+c.name,detail:"No recent interaction for more than 60 days.",action:"openInteractionModal("+c.id+")",cta:"Log Interaction"});
    });

    const contactsWithoutInteraction=state.contacts.filter(function(c){return !contactInteractions(c.id).length});
    if(contactsWithoutInteraction.length)actions.push({priority:65,title:"Start new conversations",detail:contactsWithoutInteraction.length+" contact(s) have no logged interaction.",action:"openInteractionModal("+contactsWithoutInteraction[0].id+")",cta:"Start One"});

    const activeOpp=state.opportunities.filter(function(o){return !["Won","Lost"].includes(o.status)});
    const urgent=activeOpp.filter(function(o){const d=daysFromToday(o.deadline);return o.deadline&&d>=0&&d<=7});
    if(urgent.length)actions.push({priority:85,title:"Review opportunity deadlines",detail:urgent.length+" active opportunity deadline(s) fall within 7 days.",action:"navTo('opportunities')",cta:"Review"});

    if(state.contacts.length<10)actions.push({priority:40,title:"Grow your network",detail:"Add "+(10-state.contacts.length)+" more contact(s) to reach the first 10.",action:"openContactModal()",cta:"Add Contact"});
    if(!state.networkingGoals.length)actions.push({priority:50,title:"Set a networking goal",detail:"Create one measurable relationship goal.",action:"openGoalModal()",cta:"Create Goal"});

    return actions.sort(function(a,b){return b.priority-a.priority}).slice(0,6);
  }

  function smartActionsHtml(limit){
    const rows=smartActions().slice(0,limit||6);
    if(!rows.length)return empty("Nothing urgent. Keep logging meaningful relationship activity.");
    return '<div class="smart-action-list">'+rows.map(function(a,index){
      return '<div class="smart-action-card"><span class="action-number">'+(index+1)+'</span><div class="list-main"><strong>'+esc(a.title)+'</strong><small>'+esc(a.detail)+'</small></div><button class="btn ghost" onclick="'+a.action+'">'+esc(a.cta)+'</button></div>';
    }).join("")+'</div>';
  }

  function dailyMission(){
    const rows=smartActions().slice(0,3);
    if(rows.length)return rows;
    return [
      {title:"Log one meaningful interaction",detail:"Keep relationship history current.",action:"openInteractionModal()",cta:"Log"},
      {title:"Review your pipeline",detail:"Make sure relationship stages reflect reality.",action:"navTo('pipeline')",cta:"Open"},
      {title:"Check upcoming dates",detail:"Prepare for birthdays, meetings and reminders.",action:"navTo('dates')",cta:"Open"}
    ];
  }

  function missionHtml(){
    return '<div class="mission-list">'+dailyMission().map(function(a,index){
      return '<div class="mission-item"><span class="mission-check">'+(index+1)+'</span><div class="list-main"><strong>'+esc(a.title)+'</strong><small>'+esc(a.detail)+'</small></div><button class="btn ghost" onclick="'+a.action+'">'+esc(a.cta)+'</button></div>';
    }).join("")+'</div>';
  }

  function xpLogHtml(){
    const rows=state.xpLog.slice(0,10);
    if(!rows.length)return empty("XP activity will appear here.");
    return '<div class="list">'+rows.map(function(x){
      return '<div class="list-item"><div class="list-main"><strong>'+esc(x.reason)+'</strong><small>'+esc(x.date)+'</small></div><span class="xp-chip">+'+x.amount+' XP</span></div>';
    }).join("")+'</div>';
  }

  window.growthView=function(){
    refreshGamification(false);
    const level=levelInfo(),earned=state.earnedBadges.length;
    return sectionTitle("Growth & Goals","Turn consistent relationship work into measurable progress.","＋ Goal","openGoalModal()")+
      '<div class="grid grid-4">'+
        stat("Level",level.level,"Current networking level")+
        stat("Total XP",level.xp,"Earned from CRM actions")+
        stat("Badges",earned+" / "+BADGES.length,"Unlocked achievements")+
        stat("Active Goals",state.networkingGoals.filter(function(g){return !g.completed}).length,"Measurable targets")+
      '</div>'+
      '<div class="grid grid-2" style="margin-top:18px">'+
        '<div class="card xp-card"><div class="card-head"><div><p class="eyebrow">Level '+level.level+'</p><h3>'+level.current+' / 100 XP to next level</h3></div><span class="xp-chip">'+level.xp+' XP</span></div><div class="xp-progress"><i style="width:'+level.percent+'%"></i></div><p class="muted">Core actions already award XP. Goal completion gives +50 XP and each newly unlocked badge gives +20 XP.</p></div>'+
        '<div class="card"><div class="card-head"><div><p class="eyebrow">Daily Networking Mission</p><h3>Three useful actions</h3></div><span class="tag">Rule-based</span></div>'+missionHtml()+'</div>'+
      '</div>'+
      '<div class="card" style="margin-top:18px"><div class="card-head"><div><p class="eyebrow">Networking Goals</p><h3>Measurable targets</h3></div><button class="btn primary" onclick="openGoalModal()">＋ Add Goal</button></div><div class="goal-grid">'+
        (state.networkingGoals.map(goalCard).join("")||empty("No networking goals yet."))+
      '</div></div>'+
      '<div class="card" style="margin-top:18px"><div class="card-head"><div><p class="eyebrow">Smart Actions</p><h3>What to do next</h3></div></div>'+smartActionsHtml(6)+'</div>'+
      '<div class="grid grid-2" style="margin-top:18px">'+
        '<div class="card"><div class="card-head"><div><p class="eyebrow">Badges</p><h3>Achievements</h3></div></div><div class="badge-grid">'+BADGES.map(badgeHtml).join("")+'</div></div>'+
        '<div class="card"><div class="card-head"><div><p class="eyebrow">XP History</p><h3>Recent rewards</h3></div></div>'+xpLogHtml()+'</div>'+
      '</div>';
  };

  const moveContactStageV6Base=window.moveContactStage;
  window.moveContactStage=function(cid,next){
    const c=contactById(cid),before=c?.stage;
    moveContactStageV6Base(cid,next);
    if(c&&before!==c.stage){
      awardXP(3,"Pipeline progress: "+c.name,"stage:"+c.id+":"+c.stage+":"+dateKeyV6(c.stageUpdatedAt));
      refreshGamification(true);save();render();
    }
  };

  const completeFollowupV6Base=window.completeFollowup;
  window.completeFollowup=function(fid){
    const f=state.followUps.find(function(x){return x.id===fid}),was=f?.status;
    completeFollowupV6Base(fid);
    if(f&&was!=="Completed")refreshGamification(true);
  };

  const setOpportunityStatusV6Base=window.setOpportunityStatus;
  window.setOpportunityStatus=function(oid,status){
    const o=state.opportunities.find(function(x){return x.id===oid}),before=o?.status;
    setOpportunityStatusV6Base(oid,status);
    if(o&&before!==o.status){
      if(o.status==="Won")awardXP(25,"Opportunity won: "+o.title,"won:"+o.id);
      refreshGamification(true);save();render();
    }
  };

  const dashboardV6Base=dashboardView;
  dashboardView=function(){
    refreshGamification(false);
    const level=levelInfo();
    return dashboardV6Base()+
      '<div class="grid grid-2" style="margin-top:18px">'+
        '<div class="card"><div class="card-head"><div><p class="eyebrow">Daily Networking Mission</p><h3>Do the next useful thing</h3></div><button class="btn ghost" onclick="navTo(\'growth\')">Growth</button></div>'+missionHtml()+'</div>'+
        '<div class="card xp-card"><div class="card-head"><div><p class="eyebrow">Level '+level.level+'</p><h3>'+level.xp+' total XP</h3></div><span class="xp-chip">'+state.earnedBadges.length+' badges</span></div><div class="xp-progress"><i style="width:'+level.percent+'%"></i></div><p class="muted">'+level.current+' / 100 XP toward Level '+(level.level+1)+'.</p></div>'+
      '</div>';
  };

  const renderV6Base=render;
  render=function(){
    if(currentView==="growth"){
      document.getElementById("viewTitle").textContent="Growth & Goals";
      document.getElementById("todayLabel").textContent=new Date().toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long"});
      document.getElementById("viewRoot").innerHTML=growthView();
      document.querySelectorAll("[data-view]").forEach(function(b){b.classList.toggle("active",b.dataset.view==="growth")});
      return;
    }
    renderV6Base();
  };

  ensureV6();
  render();
})();