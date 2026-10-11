(()=>{"use strict";
const root=document.getElementById("ps-hub");if(!root||root.dataset.ready)return;root.dataset.ready="1";
const $=id=>document.getElementById(id),status=$("hub-status");
let db,user,profile,groups=[],events=[],memberships=new Set(),attending=new Map();
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const say=(s,bad=false)=>{status.textContent=s||"";status.classList.toggle("is-error",bad)};
const fmt=v=>{try{return new Intl.DateTimeFormat("hr-HR",{dateStyle:"medium",timeStyle:"short"}).format(new Date(v))}catch{return ""}};
const errText=e=>e?.message||"Radnja nije uspjela. Provjeri vezu i postavke baze.";
async function load(){
 try{
  if(!window.PatriaSoulAuth)throw Error("Modul za prijavu nije učitan.");
  user=await PatriaSoulAuth.getUser();
  if(!user){say("Za grupe, događaje i pretraživanje članova prijavi se ili izradi račun.",true);$("hub-groups").innerHTML='<p class="ps-wall-empty"><a href="prijava.html?next='+encodeURIComponent("grupe-dogadjaji.html")+'">Prijavi se</a> · <a href="registracija.html">Izradi račun</a></p>';return}
  db=await PatriaSoulAuth.client();
  const pr=await db.from("profiles").select("display_name,role").eq("id",user.id).maybeSingle();if(pr.error)throw pr.error;profile=pr.data||{};
  $("hub-group-form").hidden=false;$("hub-event-form").hidden=false;
  await Promise.all([loadGroups(),loadEvents()]);say("Prijavljen/a kao "+(profile.display_name||user.email||"član"));
 }catch(e){console.error(e);say(errText(e),true)}
}
async function loadGroups(){
 const [g,m]=await Promise.all([
  db.from("community_groups").select("id,owner_id,name,description,visibility,created_at").eq("visibility","public").order("created_at",{ascending:false}).limit(60),
  db.from("community_group_members").select("group_id,role").eq("user_id",user.id)
 ]);
 if(g.error)throw g.error;if(m.error)throw m.error;groups=g.data||[];memberships=new Set((m.data||[]).map(x=>x.group_id));
 $("hub-groups").innerHTML=groups.length?groups.map(g=>'<article class="ps-hub-item"><h3>'+esc(g.name)+'</h3><p>'+esc(g.description||"Grupa za članove PatriaSoula.")+'</p><small>Osnovana '+esc(fmt(g.created_at))+' · '+(g.owner_id===user.id?"Tvoja grupa":memberships.has(g.id)?"Član si":"Otvorena grupa")+'</small><div><button type="button" data-group-action="'+(memberships.has(g.id)?"leave":"join")+'" data-id="'+esc(g.id)+'" '+(g.owner_id===user.id?'disabled title="Vlasnik grupe"':'')+'>'+(memberships.has(g.id)?"Napusti grupu":"Pridruži se")+'</button></div></article>').join(""):'<p class="ps-wall-empty">Još nema javnih grupa. Osnuj prvu grupu zajednice.</p>';
}
async function loadEvents(){
 const [e,a]=await Promise.all([
  db.from("community_events").select("id,host_id,group_id,title,description,location,starts_at,ends_at,created_at").gte("starts_at",new Date(Date.now()-86400000).toISOString()).order("starts_at",{ascending:true}).limit(60),
  db.from("community_event_attendees").select("event_id,response").eq("user_id",user.id)
 ]);
 if(e.error)throw e.error;if(a.error)throw a.error;events=e.data||[];attending=new Map((a.data||[]).map(x=>[x.event_id,x.response]));
 $("hub-events").innerHTML=events.length?events.map(e=>'<article class="ps-hub-item"><h3>'+esc(e.title)+'</h3><div class="ps-hub-meta">◷ '+esc(fmt(e.starts_at))+(e.location?' · '+esc(e.location):'')+'</div><p>'+esc(e.description||"Detalji događaja bit će objavljeni naknadno.")+'</p><small>'+(e.host_id===user.id?"Organiziraš ti":attending.has(e.id)?"Tvoj odaziv: "+(attending.get(e.id)==="going"?"Dolazim":"Zainteresiran/a"):"Događaj zajednice")+'</small><div><button type="button" data-event-action="going" data-id="'+esc(e.id)+'">'+(attending.get(e.id)==="going"?"Odaziv: dolazim ✓":"Dolazim")+'</button><button type="button" class="secondary" data-event-action="interested" data-id="'+esc(e.id)+'">'+(attending.get(e.id)==="interested"?"Zainteresiran/a ✓":"Zanima me")+'</button>'+(attending.has(e.id)?'<button type="button" class="secondary" data-event-action="cancel" data-id="'+esc(e.id)+'">Poništi odaziv</button>':'')+'</div></article>').join(""):'<p class="ps-wall-empty">Nema najavljenih događaja. Objavi prvi susret ili aktivnost.</p>';
}
$("hub-group-form").addEventListener("submit",async e=>{e.preventDefault();const name=$("hub-group-name").value.trim(),description=$("hub-group-desc").value.trim();if(!name)return;
 const b=e.submitter;b.disabled=true;try{const {data,error}=await db.from("community_groups").insert({owner_id:user.id,name,description,visibility:"public"}).select("id").single();if(error)throw error;
 const joined=await db.from("community_group_members").insert({group_id:data.id,user_id:user.id,role:"owner"});if(joined.error)throw joined.error;
 e.target.reset();say("Grupa je osnovana.");await loadGroups();
 }catch(x){say(errText(x),true)}finally{b.disabled=false}
});
$("hub-groups").addEventListener("click",async e=>{const b=e.target.closest("button[data-group-action]");if(!b||b.disabled)return;b.disabled=true;try{
 const group=groups.find(g=>g.id===b.dataset.id);if(!group)throw Error("Grupa više nije dostupna.");
 const r=b.dataset.groupAction==="join"?await db.from("community_group_members").insert({group_id:group.id,user_id:user.id,role:"member"}):await db.from("community_group_members").delete().eq("group_id",group.id).eq("user_id",user.id);
 if(r.error&&r.error.code!=="23505")throw r.error;say(b.dataset.groupAction==="join"?"Pridružio/la si se grupi.":"Napustio/la si grupu.");await loadGroups();
 }catch(x){say(errText(x),true)}finally{b.disabled=false}
});
$("hub-event-form").addEventListener("submit",async e=>{e.preventDefault();const title=$("hub-event-title").value.trim(),starts=$("hub-event-date").value;if(!title||!starts)return;
 const b=e.submitter;b.disabled=true;try{const {error}=await db.from("community_events").insert({host_id:user.id,title,starts_at:new Date(starts).toISOString(),location:$("hub-event-location").value.trim(),description:$("hub-event-desc").value.trim()});if(error)throw error;e.target.reset();say("Događaj je objavljen.");await loadEvents()
 }catch(x){say(errText(x),true)}finally{b.disabled=false}
});
$("hub-events").addEventListener("click",async e=>{const b=e.target.closest("button[data-event-action]");if(!b)return;b.disabled=true;try{const id=b.dataset.id,action=b.dataset.eventAction;
 let r;if(action==="cancel")r=await db.from("community_event_attendees").delete().eq("event_id",id).eq("user_id",user.id);
 else r=await db.from("community_event_attendees").upsert({event_id:id,user_id:user.id,response:action},{onConflict:"event_id,user_id"});
 if(r.error)throw r.error;say(action==="cancel"?"Odaziv je poništen.":"Hvala, tvoj odaziv je spremljen.");await loadEvents()
 }catch(x){say(errText(x),true)}finally{b.disabled=false}
});
$("hub-refresh-groups").addEventListener("click",()=>loadGroups().catch(e=>say(errText(e),true)));
$("hub-refresh-events").addEventListener("click",()=>loadEvents().catch(e=>say(errText(e),true)));
$("hub-search-form").addEventListener("submit",async e=>{e.preventDefault();const q=$("hub-query").value.trim().replace(/[%,()]/g," ").replace(/\s+/g," ").slice(0,80);if(q.length<2){say("Upiši barem dva znaka.",true);return}
 const box=$("hub-search-results");box.innerHTML='<p class="ps-wall-empty">Pretražujem…</p>';try{
 const pattern="%"+q+"%";const [people,postRows,groupRows,eventRows]=await Promise.all([
  db.from("profiles").select("id,display_name").ilike("display_name",pattern).limit(8),
  db.from("community_posts").select("id,content,created_at").eq("status","published").ilike("content",pattern).order("created_at",{ascending:false}).limit(8),
  db.from("community_groups").select("id,name,description").eq("visibility","public").ilike("name",pattern).limit(8),
  db.from("community_events").select("id,title,starts_at,location").ilike("title",pattern).gte("starts_at",new Date().toISOString()).order("starts_at").limit(8)
 ]);
 for(const r of [people,postRows,groupRows,eventRows])if(r.error)throw r.error;
 const results=[
 ...(people.data||[]).map(p=>({title:p.display_name||"Član PatriaSoula",meta:"Član zajednice · otvori profil",href:"profil.html?id="+encodeURIComponent(p.id)})),
 ...(postRows.data||[]).map(p=>({title:(p.content||"Objava s fotografijom").slice(0,130),meta:"Objava na zidu · "+fmt(p.created_at),href:"zid-zajednice.html"})),
 ...(groupRows.data||[]).map(g=>({title:g.name,meta:g.description||"Grupa zajednice",href:"grupe-dogadjaji.html"})),
 ...(eventRows.data||[]).map(x=>({title:x.title,meta:fmt(x.starts_at)+(x.location?" · "+x.location:""),href:"grupe-dogadjaji.html"}))
 ];
 box.innerHTML=results.length?results.map(x=>'<a class="ps-hub-result" href="'+esc(x.href)+'"><strong>'+esc(x.title)+'</strong><small>'+esc(x.meta)+'</small></a>').join(""):'<p class="ps-wall-empty">Nema rezultata za „'+esc(q)+'”.</p>';say("Pretraživanje završeno · "+results.length+" rezultata.");
 }catch(x){console.error(x);box.innerHTML='<p class="ps-wall-empty">Pretraživanje nije dostupno. Provjeri je li migracija zajednice primijenjena.</p>';say(errText(x),true)}
});
load();
})();