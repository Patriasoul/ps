(() => {
"use strict";
const DATA_URL = new URL("../../data/na-danasnji-dan.json", document.currentScript.src).href;
const $ = (s) => document.querySelector(s);
const pad = (n) => String(n).padStart(2,"0");
const hrMonths = ["siječnja","veljače","ožujka","travnja","svibnja","lipnja","srpnja","kolovoza","rujna","listopada","studenoga","prosinca"];
const categoryFor = (e) => {
  if (e.category) return e.category;
  const text = (String(e.title || "") + " " + String(e.text || "") + " " + String(e.pages?.[0]?.normalizedtitle || "")).toLowerCase();
  if (/olympic|football|soccer|basketball|tennis|sport|championship|world cup|olimp|olimpij|nogomet|košarka|tenis|sport|prvenstvo|kup|utrka/.test(text)) return "Sport";
  if (/science|scientist|space|moon|nasa|physics|chemistry|medicine|medical|discovery|invention|technology|computer|atom|znanost|znanstvenik|svemir|mjesec|nasa|fizika|kemija|medicina|liječnik|otkriće|izum|tehnologija|računalo|atom|nobel/.test(text)) return "Znanost";
  if (/film|movie|music|artist|painting|literature|author|writer|poet|theatre|theater|culture|book|opera|film|glazba|umjetnik|slikarstvo|književnost|pisac|pjesnik|kazalište|kultura|knjiga|opera|koncert/.test(text)) return "Kultura";
  return "Povijest";
};
const decodeEntities = (text) => String(text || "").replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n))).replace(/&#x([0-9a-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16))).replace(/&quot;/g,'"').replace(/&amp;/g,"&").replace(/&apos;/g,"'").replace(/&lt;/g,"<").replace(/&gt;/g,">");
const cleanText = (text) => decodeEntities(text).replace(/\s+/g," ").trim();
const isBadEvent = (e) => {
  const title=cleanText(e.title || "");
  const text=cleanText(e.text || "");
  if (/^\d{3,4}\.?$/.test(title) || /^\d{3,4}\.?$/.test(text)) return true;
  if (/^(Roy Keane|Antonio Banderas)$/i.test(title)) return true;
  if (!title && !text) return true;
  return false;
};
const yearFor = (e) => Number(e.year);
const state = { date:new Date(), events:[] };

function dateLabel(d){ return new Intl.DateTimeFormat("hr-HR",{weekday:"long",day:"numeric",month:"long",year:"numeric"}).format(d); }
function renderDate(d){
  $("#today-date").textContent = dateLabel(d);
  $("#date-picker").value = d.toISOString().slice(0,10);
}
function escapeHtml(v){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));}

async function fetchLocalEvents(d){
  const response=await fetch(DATA_URL+"?v="+Date.now(),{
    cache:"no-store",
    headers:{"Accept":"application/json"}
  });
  if(!response.ok) throw new Error("HTTP "+response.status);
  const json=await response.json();
  const key=pad(d.getMonth()+1)+"-"+pad(d.getDate());
  return json?.dates?.[key]?.events || [];
}

function eventCard(e, featured=false){
  const year = yearFor(e);
  const category = categoryFor(e);
  const title = cleanText(e.localizedTitle || e.title || e.text || (Number.isFinite(year) ? "Događaj iz " + year : "Događaj"));
  const text = cleanText(e.localizedText || e.description || (e.text && e.text !== title ? e.text : ""));
  const yearLabel = Number.isFinite(year) ? String(year) : "—";
  return featured
    ? '<div class="ps-event-meta"><span class="ps-event-year">'+yearLabel+'</span><span class="ps-event-category">'+category+'</span></div><h3>'+escapeHtml(title)+'</h3><p>'+escapeHtml(text)+'</p>'
    : '<article class="ps-event-card"><div class="ps-event-meta"><span class="ps-event-year">'+yearLabel+'</span><span class="ps-event-category">'+category+'</span></div><h3>'+escapeHtml(title)+'</h3><p>'+escapeHtml(text)+'</p></article>';
}
function render(events){
  const grid=$("#events-grid"),feature=$("#featured-event"),featureContent=$("#featured-event-content"),empty=$("#events-empty");
  grid.innerHTML=""; feature.hidden=true; empty.hidden=true;
  const valid=events.filter(e=>!isBadEvent(e));
  if(!valid.length){empty.hidden=false;return;}
  const sorted=valid.slice().sort((a,b)=>(Number(b.year)||0)-(Number(a.year)||0));
  feature.hidden=false;
  featureContent.innerHTML=eventCard(sorted[0],true);
  sorted.slice(1,16).forEach(e=>grid.insertAdjacentHTML("beforeend",eventCard(e,false)));
}
async function load(d){
  state.date=d; renderDate(d);
  $("#today-status").textContent="Događaji se automatski učitavaju…";
  $("#events-grid").innerHTML='<div class="ps-event-loading">Učitavanje događaja…</div>';
  $("#featured-event").hidden=true; $("#events-empty").hidden=true;
  try{
    const events = await fetchLocalEvents(d);
    state.events=events;
    render(events);
    const visibleEvents=events.filter(e=>!isBadEvent(e));
    $("#today-status").textContent=visibleEvents.length
      ? ("Prikazano "+visibleEvents.length+" događaja na hrvatskom jeziku.")
      : "Za ovaj datum trenutačno nema dostupnih događaja.";
  }catch(err){
    state.events=[];
    $("#events-grid").innerHTML='<div class="ps-event-error">Podaci za ovaj datum trenutačno nisu dostupni.</div>';
    $("#today-status").textContent="Automatsko učitavanje nije uspjelo.";
  }
}

function shift(days){const d=new Date(state.date);d.setDate(d.getDate()+days);load(d);}
$("#date-prev").addEventListener("click",()=>shift(-1));
$("#date-next").addEventListener("click",()=>shift(1));
$("#date-today").addEventListener("click",()=>load(new Date()));
$("#date-picker").addEventListener("change",e=>{if(e.target.value){const [y,m,day]=e.target.value.split("-").map(Number);load(new Date(y,m-1,day));}});
$("#share-button").addEventListener("click",async()=>{
  const url=location.href.split("#")[0];
  const title="Na današnji dan — "+dateLabel(state.date);
  try{
    if(navigator.share){await navigator.share({title,text:title,url});$("#share-status").textContent="Podijeljeno.";}
    else{await navigator.clipboard.writeText(url);$("#share-status").textContent="Poveznica je kopirana.";}
  }catch(_){}
});
$("#copy-button").addEventListener("click",async()=>{
  try{await navigator.clipboard.writeText(location.href.split("#")[0]);$("#share-status").textContent="Poveznica je kopirana.";}
  catch(_){$("#share-status").textContent="Kopiranje nije dostupno u ovom pregledniku.";}
});
load(new Date());
})();