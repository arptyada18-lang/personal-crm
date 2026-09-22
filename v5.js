// Personal CRM — Advanced V5: analytics + networking heatmap
(function(){
  const V5_VERSION=5;

  function ensureV5(){
    state.schemaVersion=V5_VERSION;
    state.analyticsSnapshots=Array.isArray(state.analyticsSnapshots)?state.analyticsSnapshots:[];
    save();
  }

  function dateKey(value){
    if(!value)return "";
    return String(value).slice(0,10);
  }
  function addDate(base,delta){
    const d=new Date(base+"T00:00:00");
    d.setDate(d.getDate()+delta);
    return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
  }
  function rangeDays(count){
    const out=[];
    for(let i=count-1;i>=0;i--)out.push(addDate(today(),-i));
    return out;
  }
  function activityEvents(){
    const rows=[];
    (state.contacts||[]).forEach(function(c){
      if(c.createdAt)rows.push({date:dateKey(c.createdAt),type:"contact",label:"Contact added"});
    });
    (state.interactions||[]).forEach(function(x){
      if(x.date)rows.push({date:dateKey(x.date),type:"interaction",label:x.type||"Interaction"});
    });
    (state.followUps||[]).forEach(function(f){
      if(f.completedAt)rows.push({date:dateKey(f.completedAt),type:"followup",label:"Follow-up completed"});
    });
    (state.pipelineActivity||[]).forEach(function(a){
      if(a.date||a.timestamp)rows.push({date:dateKey(a.date||a.timestamp),type:"pipeline",label:"Pipeline movement"});
    });
    (state.opportunities||[]).forEach(function(o){
      if(o.createdAt)rows.push({date:dateKey(o.createdAt),type:"opportunity",label:"Opportunity added"});
    });
    (state.importantDates||[]).forEach(function(x){
      if(x.createdAt)rows.push({date:dateKey(x.createdAt),type:"date",label:"Important date added"});
    });
    return rows.filter(function(x){return x.date});
  }

  function countByDate(events){
    const map={};
    events.forEach(function(x){map[x.date]=(map[x.date]||0)+1});
    return map;
  }

  function heatLevel(n){
    if(n<=0)return 0;
    if(n===1)return 1;
    if(n<=3)return 2;
    if(n<=5)return 3;
    return 4;
  }

  function heatmapHtml(daysCount){
    const days=rangeDays(daysCount),counts=countByDate(activityEvents());
    return '<div class="heatmap-wrap"><div class="heatmap-grid">'+
      days.map(function(day){
        const n=counts[day]||0;
        return '<div class="heat-cell heat-'+heatLevel(n)+'" title="'+esc(day)+': '+n+' recorded activities"><span>'+n+'</span></div>';
      }).join("")+
      '</div><div class="heat-legend"><span>Less</span><i class="heat-cell heat-0"></i><i class="heat-cell heat-1"></i><i class="heat-cell heat-2"></i><i class="heat-cell heat-3"></i><i class="heat-cell heat-4"></i><span>More</span></div></div>';
  }

  function periodStart(days){
    return addDate(today(),-(days-1));
  }
  function inRange(date,start,end){
    if(!date)return false;
    const d=dateKey(date);
    return d>=start&&d<=end;
  }
  function countEvents(days,type){
    const start=periodStart(days),end=today();
    return activityEvents().filter(function(e){return (!type||e.type===type)&&inRange(e.date,start,end)}).length;
  }

  function weeklyBuckets(weeks){
    const events=activityEvents(),out=[];
    for(let i=weeks-1;i>=0;i--){
      const end=addDate(today(),-(i*7));
      const start=addDate(end,-6);
      const count=events.filter(function(e){return inRange(e.date,start,end)}).length;
      out.push({start:start,end:end,count:count,label:start.slice(5)+" → "+end.slice(5)});
    }
    return out;
  }

  function barChartHtml(rows){
    const max=Math.max(1,...rows.map(function(x){return x.count}));
    return '<div class="mini-bars">'+rows.map(function(x){
      const pct=Math.max(3,Math.round(x.count/max*100));
      return '<div class="mini-bar-col" title="'+esc(x.label)+': '+x.count+'"><div class="mini-bar-track"><i style="height:'+pct+'%"></i></div><small>'+x.count+'</small></div>';
    }).join("")+'</div>';
  }

  function healthDistribution(){
    const buckets=[
      {label:"Strong",min:80,max:100,cls:"strong"},
      {label:"Active",min:60,max:79,cls:"active"},
      {label:"Needs Attention",min:40,max:59,cls:"attention"},
      {label:"Dormant",min:0,max:39,cls:"dormant"}
    ];
    return buckets.map(function(b){
      const count=state.contacts.filter(function(c){const s=relationshipScore(c);return s>=b.min&&s<=b.max}).length;
      return {label:b.label,count:count,cls:b.cls};
    });
  }

  function distributionHtml(rows,total){
    return '<div class="analytics-distribution">'+rows.map(function(r){
      const pct=total?Math.round(r.count/total*100):0;
      return '<div class="analytics-dist-row"><div class="split"><span>'+esc(r.label)+'</span><b>'+r.count+' <small>'+pct+'%</small></b></div><div class="progress"><i style="width:'+pct+'%"></i></div></div>';
    }).join("")+'</div>';
  }

  function interactionTypeRows(){
    const counts={};
    state.interactions.forEach(function(x){counts[x.type||"Other"]=(counts[x.type||"Other"]||0)+1});
    return Object.entries(counts).map(function(x){return {label:x[0],count:x[1]}}).sort(function(a,b){return b.count-a.count});
  }

  function stageRows(){
    const labels=["New Contact","Connected","Conversation Started","Relationship Building","Opportunity","Strong Connection"];
    return labels.map(function(s){
      return {label:s,count:state.contacts.filter(function(c){return c.stage===s}).length};
    });
  }

  function opportunityOutcomeRows(){
    const statuses=["New","Exploring","Applied / Proposed","In Progress","Won","Lost","On Hold"];
    return statuses.map(function(s){return {label:s,count:state.opportunities.filter(function(o){return o.status===s}).length}});
  }

  function followupPerformance(){
    const completed=state.followUps.filter(function(f){return f.status==="Completed"});
    const open=state.followUps.filter(function(f){return f.status!=="Completed"});
    const overdue=open.filter(function(f){return f.date&&daysFromToday(f.date)<0});
    const rate=state.followUps.length?Math.round(completed.length/state.followUps.length*100):0;
    return {completed:completed.length,open:open.length,overdue:overdue.length,rate:rate};
  }

  function networkGrowthRows(months){
    const out=[],now=new Date();
    for(let i=months-1;i>=0;i--){
      const d=new Date(now.getFullYear(),now.getMonth()-i,1);
      const y=d.getFullYear(),m=d.getMonth()+1,key=y+"-"+String(m).padStart(2,"0");
      const count=state.contacts.filter(function(c){return dateKey(c.createdAt).slice(0,7)===key}).length;
      out.push({label:d.toLocaleDateString("en-IN",{month:"short"}),count:count});
    }
    return out;
  }

  function topContacts(){
    return state.contacts.map(function(c){
      return {
        c:c,
        score:relationshipScore(c),
        interactions:contactInteractions(c.id).length,
        followups:contactFollowups(c.id).filter(function(f){return f.status==="Completed"}).length
      };
    }).sort(function(a,b){
      return (b.interactions*4+b.followups*2+b.score)-(a.interactions*4+a.followups*2+a.score);
    }).slice(0,6);
  }

  function topContactsHtml(){
    const rows=topContacts();
    if(!rows.length)return empty("No contacts to rank yet.");
    return '<div class="list">'+rows.map(function(x,index){
      return '<div class="list-item"><span class="rank-badge">'+(index+1)+'</span><div class="avatar">'+esc(initials(x.c.name))+'</div><div class="list-main"><strong>'+esc(x.c.name)+'</strong><small>'+x.interactions+' interactions • '+x.followups+' completed follow-ups</small></div><span class="score '+strengthMeta(x.score).cls+'">'+x.score+'</span></div>';
    }).join("")+'</div>';
  }

  function networkingMomentum(){
    const recent7=countEvents(7),prevStart=addDate(today(),-13),prevEnd=addDate(today(),-7);
    const prev=activityEvents().filter(function(e){return inRange(e.date,prevStart,prevEnd)}).length;
    const change=prev===0?(recent7?100:0):Math.round((recent7-prev)/prev*100);
    return {recent:recent7,previous:prev,change:change};
  }

  function analyticsInsights(){
    const insights=[],fp=followupPerformance(),momentum=networkingMomentum(),health=healthDistribution();
    const dormant=(health.find(function(x){return x.label==="Dormant"})||{count:0}).count;
    if(fp.overdue>0)insights.push(fp.overdue+" overdue follow-up(s) are reducing relationship consistency.");
    if(dormant>0)insights.push(dormant+" contact(s) are currently in dormant relationship health.");
    if(momentum.change>0)insights.push("Recorded networking activity is up "+momentum.change+"% versus the previous 7-day period.");
    if(momentum.change<0)insights.push("Recorded networking activity is down "+Math.abs(momentum.change)+"% versus the previous 7-day period.");
    if(!state.interactions.length)insights.push("No interactions are logged yet, so relationship analytics are naturally limited.");
    if(state.contacts.length&&state.interactions.length/state.contacts.length<1)insights.push("Average interaction coverage is below one logged interaction per contact.");
    if(!insights.length)insights.push("No major analytics warning is visible from the currently recorded data.");
    return insights.slice(0,5);
  }

  function analyticsInsightsHtml(){
    return '<div class="intelligence-list">'+analyticsInsights().map(function(msg){
      return '<div class="intelligence-item"><div class="analytics-dot"></div><div class="list-main"><small>'+esc(msg)+'</small></div></div>';
    }).join("")+'</div>';
  }

  function advancedAnalyticsView(){
    const fp=followupPerformance(),momentum=networkingMomentum();
    const events30=countEvents(30),interactions30=countEvents(30,"interaction");
    const weekly=weeklyBuckets(8);
    const types=interactionTypeRows();
    return sectionTitle("Advanced Analytics","See real patterns from recorded CRM activity. No fabricated historical data.")+
      '<div class="grid grid-4">'+
      stat("30-Day Activity",events30,"Recorded CRM events")+
      stat("30-Day Interactions",interactions30,"Logged conversations")+
      stat("Follow-Up Completion",fp.rate+"%","Completed / total")+
      stat("7-Day Momentum",(momentum.change>0?"+":"")+momentum.change+"%","vs previous 7 days")+
      '</div>'+
      '<div class="card" style="margin-top:18px"><div class="card-head"><div><p class="eyebrow">84-Day Networking Heatmap</p><h3>Consistency map</h3></div><span class="tag">Recorded activity only</span></div>'+heatmapHtml(84)+'</div>'+
      '<div class="grid grid-2" style="margin-top:18px">'+
        '<div class="card"><div class="card-head"><div><p class="eyebrow">8-Week Trend</p><h3>Networking activity</h3></div></div>'+barChartHtml(weekly)+'</div>'+
        '<div class="card"><div class="card-head"><div><p class="eyebrow">Network Growth</p><h3>Contacts added by month</h3></div></div>'+barChartHtml(networkGrowthRows(6))+'</div>'+
      '</div>'+
      '<div class="grid grid-2" style="margin-top:18px">'+
        '<div class="card"><div class="card-head"><h3>Relationship Health</h3></div>'+distributionHtml(healthDistribution(),state.contacts.length)+'</div>'+
        '<div class="card"><div class="card-head"><h3>Pipeline Stage Mix</h3></div>'+distributionHtml(stageRows(),state.contacts.length)+'</div>'+
      '</div>'+
      '<div class="grid grid-2" style="margin-top:18px">'+
        '<div class="card"><div class="card-head"><h3>Interaction Channels</h3></div>'+distributionHtml(types,state.interactions.length)+'</div>'+
        '<div class="card"><div class="card-head"><h3>Opportunity Outcomes</h3></div>'+distributionHtml(opportunityOutcomeRows(),state.opportunities.length)+'</div>'+
      '</div>'+
      '<div class="grid grid-2" style="margin-top:18px">'+
        '<div class="card"><div class="card-head"><div><p class="eyebrow">Relationship Leaders</p><h3>Most active contacts</h3></div></div>'+topContactsHtml()+'</div>'+
        '<div class="card"><div class="card-head"><div><p class="eyebrow">Data Insights</p><h3>What the numbers say</h3></div><span class="tag">Rule-based</span></div>'+analyticsInsightsHtml()+'</div>'+
      '</div>'+
      '<div class="grid grid-3" style="margin-top:18px">'+
        stat("Completed Follow-Ups",fp.completed,"All time")+
        stat("Open Follow-Ups",fp.open,"Still pending")+
        stat("Overdue Follow-Ups",fp.overdue,"Needs attention")+
      '</div>';
  }

  analyticsView=function(){return advancedAnalyticsView()};

  const dashboardV5Base=dashboardView;
  dashboardView=function(){
    const m=networkingMomentum();
    return dashboardV5Base()+
      '<div class="grid grid-2" style="margin-top:18px">'+
        '<div class="card"><div class="card-head"><div><p class="eyebrow">Networking Momentum</p><h3>Last 7 days</h3></div><button class="btn ghost" onclick="navTo(\'analytics\')">Analytics</button></div><div class="momentum-score">'+m.recent+'<small> recorded activities</small></div><p class="muted">'+(m.change===0?'No change versus the previous 7 days.':((m.change>0?'+':'')+m.change+'% versus the previous 7 days.'))+'</p></div>'+
        '<div class="card"><div class="card-head"><div><p class="eyebrow">28-Day Activity</p><h3>Recent consistency</h3></div></div>'+heatmapHtml(28)+'</div>'+
      '</div>';
  };

  ensureV5();
  render();
})();