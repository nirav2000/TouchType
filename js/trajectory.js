// Learning trajectory: calibrated, within-stage, fixed-word checkpoints.
// No unsupported claim that a child will reach a particular WPM in a given time.
window.KQ = window.KQ || {};
KQ.trajectory = (() => {
  const DAY = 86400000;
  const esc = (s) => KQ.escapeHtml(String(s));
  const median = (a) => {
    const sorted = [...a].sort((x,y)=>x-y);
    return sorted.length ? (sorted[Math.floor((sorted.length-1)/2)] + sorted[Math.floor(sorted.length/2)]) / 2 : 0;
  };
  const dayKey = (iso) => new Date(iso).toISOString().slice(0,10);
  function summarize(profile) {
    const stage = KQ.adaptiveStageFor(profile);
    const benchmark = KQ.buildBenchmark(profile);
    const attempts = (profile.benchmarkRecords || [])
      .filter((r)=>r.benchmarkId===benchmark.id && Number.isFinite(r.wpm) && r.wpm>0 && Number.isFinite(r.accuracy) && Number.isFinite(Date.parse(r.date)))
      .sort((a,b)=>Date.parse(a.date)-Date.parse(b.date));
    const settings=profile.settings||{};
    const minAccuracy=Number(settings.chartMinAccuracy??0);
    const penalty=Number(settings.chartPenalty??1);
    const adjusted=r=>Math.round(r.wpm*Math.pow(Math.max(0,r.accuracy)/100,penalty)*10)/10;
    const raw=attempts.filter(r=>(r.method||"touch")==="touch" && r.accuracy>=minAccuracy);
    const peck=attempts.filter(r=>r.method==="peck" && r.accuracy>=minAccuracy);
    // One daily median; no cherry-picking a personal best and no counting rapid retries as new learning.
    const groups = new Map();
    for (const r of raw) {
      const day=dayKey(r.date);
      if (!groups.has(day)) groups.set(day,[]);
      groups.get(day).push(r);
    }
    const points = [...groups].map(([day,rows])=>({
      day,
      t:Date.parse(day+"T12:00:00Z"),
      wpm:Math.round(median(rows.map(r=>r.wpm))*10)/10,
      accuracy:Math.round(median(rows.map(r=>r.accuracy))),
      n:rows.length,
      adjusted:Math.round(median(rows.map(adjusted))*10)/10,
    }));
    const last=points[points.length-1] || null;
    const first=points[0] || null;
    const elapsed=first&&last ? Math.round((last.t-first.t)/DAY) : 0;
    const calibrated=points.length>=4 && elapsed>=7;
    // Robust slope: median of all positive/negative pairwise changes in sqrt(days+1).
    // This reflects diminishing returns, rather than an implausible straight-line extrapolation.
    const slopes=[];
    if (calibrated) for(let i=0;i<points.length;i++) for(let j=i+1;j<points.length;j++){
      const x1=Math.sqrt(1+(points[i].t-first.t)/DAY);
      const x2=Math.sqrt(1+(points[j].t-first.t)/DAY);
      if(x2-x1>=0.3) slopes.push((points[j].wpm-points[i].wpm)/(x2-x1));
    }
    const slope=median(slopes);
    const rising=calibrated && slope>0.35 && last.wpm>=first.wpm;
    // A deliberately conservative, explicitly conditional planning guide. Not a statistical confidence interval.
    const forecast=rising ? [7,14,21,28,35].map(days=>{
      const gain=slope*(Math.sqrt(1+elapsed+days)-Math.sqrt(1+elapsed));
      const limited=Math.min(15,Math.max(0,gain));
      return {day:days,wpm:Math.round((last.wpm+limited)*10)/10};
    }):[];
    const due=(profile.wordSkills && Object.values(profile.wordSkills).filter(s=>s.due && s.due<=Date.now()).length)||0;
    return {benchmark,stageTitle:stage.title,points,attempts,peck,penalty,minAccuracy,first,last,elapsed,calibrated,rising,forecast,due,
      status:!last?"No checkpoint yet":!calibrated?"Calibrating":!rising?"Reviewing pattern":"Conditional estimate"};
  }
  function render(profile) {
    const data=summarize(profile);
    const status=document.getElementById("trajectory-status");
    const summary=document.getElementById("trajectory-summary");
    const chart=document.getElementById("trajectory-chart");
    const explanation=document.getElementById("trajectory-explanation");
    if(!status||!summary||!chart||!explanation)return;
    const filtered=data.attempts.filter(r=>r.accuracy>=data.minAccuracy);
    const latest=filtered.length?filtered[filtered.length-1]:null;
    const adjustedValue=r=>Math.round(r.wpm*Math.pow(r.accuracy/100,data.penalty)*10)/10;
    const count=document.getElementById("trajectory-matches");
    const speed=document.getElementById("trajectory-adjusted");
    const rows=document.getElementById("trajectory-rows");
    if(count)count.textContent=filtered.length+" / "+data.attempts.length;
    if(speed)speed.textContent=latest?adjustedValue(latest)+" WPM":"—";
    if(rows)rows.innerHTML=filtered.slice(-25).reverse().map(r=>'<tr><td>'+esc(new Date(r.date).toLocaleDateString("en-GB",{day:"numeric",month:"short"}))+' <small>'+esc(r.method==="peck"?"Peck":"Touch")+'</small></td><td>'+esc(r.wpm)+'</td><td>'+esc(r.accuracy)+'%</td><td>'+adjustedValue(r)+'</td></tr>').join("")||'<tr><td colspan="4">No matching checkpoints</td></tr>';
    status.textContent=data.status;
    summary.innerHTML=[
      [data.last ? data.last.wpm+" WPM":"—","Latest checkpoint"],
      [data.points.length+"","Distinct checkpoint days"],
      [data.last?data.last.accuracy+"%":"—","Latest checkpoint accuracy"],
    ].map(([value,label])=>'<div class="trajectory-metric"><strong>'+esc(value)+'</strong><span>'+esc(label)+'</span></div>').join("");
    if(!data.points.length && !data.peck.length){
      chart.innerHTML='<div class="trajectory-empty"><strong>First, establish your baseline.</strong><span>Complete a word checkpoint, then return on a different day. We will not invent a curve before measuring it.</span></div>';
      explanation.textContent="A checkpoint is a short fixed list of real words from your current stage. Future stages have different words and start a new chart.";
      return;
    }
    const origin=Math.min(...data.attempts.map(r=>Date.parse(dayKey(r.date)+"T12:00:00Z")));
    const actual=data.points.map(p=>({x:(p.t-origin)/DAY,y:p.wpm}));
    const adjusted=data.points.map(p=>({x:(p.t-origin)/DAY,y:p.adjusted}));
    const peck=data.peck.map(r=>({x:(Date.parse(dayKey(r.date)+"T12:00:00Z")-origin)/DAY,y:r.wpm,accuracy:r.accuracy}));
    const estimated=data.forecast.map(p=>({x:(data.last.t-origin)/DAY+p.day,y:p.wpm}));
    const combined=actual.concat(estimated,adjusted,peck);
    const maxX=Math.max(7,...combined.map(p=>p.x));
    const minY=Math.max(0,Math.floor(Math.min(...combined.map(p=>p.y))*0.8/5)*5);
    const maxY=Math.max(minY+10,Math.ceil(Math.max(...combined.map(p=>p.y))*1.18/5)*5);
    const X=x=>52+Math.max(0,x)/maxX*620;
    const Y=y=>230-(y-minY)/(maxY-minY)*188;
    const path=pts=>pts.map((p,i)=>(i?'L':'M')+X(p.x).toFixed(1)+' '+Y(p.y).toFixed(1)).join(' ');
    const forecastPath=data.forecast.length && actual.length ? path([actual[actual.length-1],...estimated]):"";
    chart.innerHTML='<svg viewBox="0 0 710 270" role="img" aria-label="Measured speed in solid line; conditional estimate in dashed line" preserveAspectRatio="xMidYMid meet">'+
      [0,1,2,3,4].map(i=>'<line x1="52" x2="672" y1="'+(230-i*47)+'" y2="'+(230-i*47)+'" stroke="currentColor" opacity=".11"/><text x="44" y="'+(235-i*47)+'" text-anchor="end" fill="currentColor" font-size="12">'+Math.round(minY+(maxY-minY)*i/4)+'</text>').join('')+
      '<text x="52" y="257" fill="currentColor" font-size="12">First checkpoint</text><text x="672" y="257" text-anchor="end" fill="currentColor" font-size="12">Day '+Math.round(maxX)+'</text>'+
      (actual.length>1?'<path d="'+path(actual)+'" fill="none" stroke="#1689ff" stroke-width="3.5" stroke-linecap="round"/>':'')+
      (adjusted.length>1?'<path d="'+path(adjusted)+'" fill="none" stroke="#00bd67" stroke-width="2.5" stroke-linecap="round"/>':'')+
      adjusted.map(p=>'<circle cx="'+X(p.x)+'" cy="'+Y(p.y)+'" r="3" fill="#00bd67"><title>Adjusted '+p.y+' WPM</title></circle>').join('')+
      peck.map(p=>'<circle cx="'+X(p.x)+'" cy="'+Y(p.y)+'" r="6" fill="#a8a1f6"><title>Peck '+p.y+' WPM at '+p.accuracy+'% accuracy</title></circle>').join('')+
      actual.map(p=>'<circle cx="'+X(p.x)+'" cy="'+Y(p.y)+'" r="5" fill="#1689ff"><title>'+p.y+' WPM</title></circle>').join('')+
      (forecastPath?'<path d="'+forecastPath+'" fill="none" stroke="#a8a1f6" stroke-width="2.5" stroke-dasharray="7 7"/>':'')+
      '</svg><div class="trajectory-legend"><span><i class="trajectory-dot"></i>Touch WPM</span><span>🟠 Accuracy-adjusted touch WPM</span><span>🟣 Peck typing WPM</span>'+(data.forecast.length?'<span><i class="trajectory-dot predicted"></i>Conditional planning guide</span>':'')+'</div>';
    explanation.textContent=!data.calibrated
      ?"Only "+data.points.length+" distinct touch-typing checkpoint day(s) so far. Four days spanning at least a week are needed before considering a forecast. Keep using the adaptive schedule; test after a break."
      :!data.rising
        ?"Your data do not yet show a stable rising trend. No forecast is shown. Changes in difficulty, fatigue, practice gaps and accuracy can affect speed; keep working on fluent movements."
        :"Dashed line: a capped, diminishing-returns planning estimate based on this stage's daily median checkpoints, assuming continued scheduled practice. It is NOT a validated prediction or confidence interval. Gains may slow, stop or reverse; a new stage resets the benchmark.";
  }
  return {summarize,render};
})();
