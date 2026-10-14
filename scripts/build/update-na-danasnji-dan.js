"use strict";

const fs = require("fs");
const path = require("path");

const API = "https://hr.wikipedia.org/w/api.php";
const REST = "https://hr.wikipedia.org/api/rest_v1/feed/onthisday/events";
const INDEX = "https://www.index.hr/kalendar?datum=";
const MONTHS = ["siječnja","veljače","ožujka","travnja","svibnja","lipnja","srpnja","kolovoza","rujna","listopada","studenoga","prosinca"];

function pad(n){ return String(n).padStart(2,"0"); }

function clean(value){
  return String(value||"")
    .replace(/<[^>]+>/g," ")
    .replace(/&nbsp;/gi," ")
    .replace(/&amp;/gi,"&")
    .replace(/&quot;/gi,'"')
    .replace(/&#39;/gi,"'")
    .replace(/&#x27;/gi,"'")
    .replace(/\[\[[^\]|]+\|([^\]]+)\]\]/g,"$1")
    .replace(/\[\[([^\]]+)\]\]/g,"$1")
    .replace(/\{\{[^}]+\}\}/g," ")
    .replace(/''+/g,"")
    .replace(/\s+/g," ")
    .trim();
}

function parseEvents(source){
  const text=String(source||"");
  const match=text.match(/(?:^|\n)={2,}\s*(?:Događaji|Događaji na današnji dan)\s*={2,}([\s\S]*?)(?=\n={2,}[^=]+={2,}|$)/i);
  if(!match) return [];
  const events=[];
  for(const raw of match[1].split("\n")){
    const line=clean(raw.replace(/^\s*[*#:]+\s*/,""));
    if(!line) continue;
    const m=line.match(/^(\d{1,4})\.?\s*(?:pr\.\s*Kr\.\s*)?(?:[-–—:.]\s*|\s{2,})(.+)$/i);
    if(!m) continue;
    const year=Number(m[1]);
    const text=clean(m[2]);
    if(Number.isFinite(year) && text) events.push({year,text});
  }
  return events.slice(0,40);
}

function parseHtmlEvents(source){
  const text=String(source||"")
    .replace(/<br\s*\/?>/gi,"\n")
    .replace(/<li[^>]*>/gi,"\n")
    .replace(/<\/li>/gi,"")
    .replace(/<[^>]+>/g," ");
  return parseEvents(text);
}

function parseIndexEvents(html){
  const section=String(html||"").split(/VIDI\s+VIŠE\s+DOGAĐAJA/i)[0];
  const anchors=[];
  const anchorPattern=/<a\b[^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while((match=anchorPattern.exec(section))!==null){
    anchors.push({text:clean(match[1]),index:match.index});
  }

  const events=[];
  for(let i=0;i<anchors.length;i++){
    const year=Number(anchors[i].text);
    if(!/^\d{3,4}$/.test(anchors[i].text) || !Number.isFinite(year)) continue;

    let title="";
    for(let j=i-1;j>=0 && j>=i-4;j--){
      const candidate=clean(anchors[j].text);
      if(!candidate || /^\d{3,4}$/.test(candidate)) continue;
      if(candidate.length>=4){
        title=candidate;
        break;
      }
    }

    if(!title) continue;
    if(/^(Početna|Vijesti|Sport|Magazin|Horoskop|Kalendar|Ljudi|Rođeni|Preminuli)$/i.test(title)) continue;

    events.push({year,text:title});
    if(events.length>=12) break;
  }

  const unique=[];
  const seen=new Set();
  for(const event of events){
    const key=event.year+"|"+event.text;
    if(seen.has(key)) continue;
    seen.add(key);
    unique.push(event);
  }
  return unique;
}

async function fetchText(url, timeoutMs=15000){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    const response=await fetch(url,{
      signal:controller.signal,
      headers:{
        "User-Agent":"PatriaSoul/1.3 (na-danasnji-dan; https://patriasoul.github.io/Patriasoul-portal-v2/)",
        "Accept":"text/html,application/json"
      }
    });
    if(!response.ok) throw new Error("HTTP "+response.status);
    return await response.text();
  }finally{
    clearTimeout(timer);
  }
}

async function fetchJson(url, timeoutMs=12000){
  const text=await fetchText(url,timeoutMs);
  return JSON.parse(text);
}

function extractFeedEvents(feed){
  return (feed?.events||[])
    .map(e=>({
      year:Number(e.year),
      text:clean(e.text||e.pages?.[0]?.extract||"")
    }))
    .filter(e=>Number.isFinite(e.year)&&e.text);
}

async function fetchWikipedia(page,month,day){
  const feedUrl=REST+"/"+pad(month)+"/"+pad(day);
  try{
    const feedEvents=extractFeedEvents(await fetchJson(feedUrl));
    if(feedEvents.length) return feedEvents;
  }catch(_){}

  try{
    const params=new URLSearchParams({
      action:"parse",
      page,
      prop:"wikitext",
      format:"json",
      formatversion:"2"
    });
    const json=await fetchJson(API+"?"+params.toString());
    const events=parseEvents(json.parse?.wikitext||"");
    if(events.length) return events;

    const htmlParams=new URLSearchParams({
      action:"parse",
      page,
      prop:"text",
      format:"json",
      formatversion:"2"
    });
    const htmlJson=await fetchJson(API+"?"+htmlParams.toString());
    return parseHtmlEvents(htmlJson.parse?.text||"");
  }catch(_){
    return [];
  }
}

async function fetchIndex(month,day){
  try{
    const url=INDEX+pad(day)+pad(month);
    const html=await fetchText(url);
    const plain=clean(html).toLowerCase();
    const expected=(Number(day)+". "+MONTHS[month-1]).toLowerCase();
    if(!plain.includes(expected)) return [];
    return parseIndexEvents(html);
  }catch(_){
    return [];
  }
}

async function fetchPage(page){
  const [day,monthName]=page.split("|");
  const month=MONTHS.indexOf(monthName)+1;

  const wiki=await fetchWikipedia(day+". "+monthName,month,day);
  if(wiki.length) return {events:wiki,source:"Hrvatska Wikipedija",source_url:"https://hr.wikipedia.org/"};

  const index=await fetchIndex(month,day);
  if(index.length) return {events:index,source:"Index Kalendar",source_url:INDEX+pad(day)+pad(month)};

  return {events:[],source:"",source_url:""};
}

async function fetchConcurrent(pages, limit=8){
  const result={};
  let next=0;

  async function worker(){
    while(true){
      const index=next++;
      if(index>=pages.length) return;

      const page=pages[index];
      result[page]=await fetchPage(page);
      console.log(page+": "+result[page].events.length+" događaja ("+(index+1)+"/"+pages.length+")");
    }
  }

  await Promise.all(Array.from({length:Math.min(limit,pages.length)},worker));
  return result;
}

(async()=>{
  const pages=[];

  for(let month=1;month<=12;month++){
    const days=new Date(Date.UTC(2028,month,0)).getUTCDate();

    for(let day=1;day<=days;day++){
      pages.push(day+"|"+MONTHS[month-1]);
    }
  }

  const data=await fetchConcurrent(pages,8);
  const dates={};

  for(const page of pages){
    const [day,monthName]=page.split("|");
    const month=MONTHS.indexOf(monthName)+1;
    const key=pad(month)+"-"+pad(day);
    const title=day+". "+monthName;
    const item=data[page] || {events:[],source:"",source_url:""};

    dates[key]={
      date:key,
      source:item.source || "PatriaSoul",
      source_url:item.source_url || "https://patriasoul.github.io/Patriasoul-portal-v2/",
      events:item.events || []
    };
  }

  const nonEmpty=Object.values(dates).filter(d=>d.events.length>0).length;
  if(nonEmpty<100){
    throw new Error("Premalo dohvaćenih datuma: "+nonEmpty+". Prekid kako se ne bi objavio prazan kalendar.");
  }

  const output={
    source:"Hrvatska povijesna referenca",
    source_url:"https://www.index.hr/kalendar",
    updated_at:new Date().toISOString(),
    dates
  };

  const target=path.join(process.cwd(),"data","na-danasnji-dan.json");
  fs.mkdirSync(path.dirname(target),{recursive:true});
  fs.writeFileSync(target,JSON.stringify(output,null,2)+"\n","utf8");
  console.log("Zapisano:",target);
})().catch(error=>{
  console.error(error);
  process.exit(1);
});
