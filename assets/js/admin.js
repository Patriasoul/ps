(()=>{"use strict";const auth=window.PatriaSoulAuth,$=s=>document.querySelector(s),set=(id,v)=>{const e=$("#"+id);if(e)e.textContent=v},fmt=v=>v?new Intl.DateTimeFormat("hr-HR",{dateStyle:"medium",timeStyle:"short"}).format(new Date(v)):"—";const OWNER="patriasoul@protonmail.com";const esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));const roleLabel=r=>({player:"Korisnik",editor:"Urednik",admin:"Admin"}[r]||"Korisnik");const statusLabel=s=>({draft:"Nacrt",review:"Urednička provjera",approved:"Odobreno",scheduled:"Zakazano",published:"Objavljeno",archived:"Arhivirano"}[s]||s||"—");const storyLabel=s=>({novo:"Novo",u_provjeri:"U provjeri",prihvaceno:"Prihvaćeno",odbijeno:"Odbijeno",objavljeno:"Objavljeno"}[s]||s||"—");async function count(c,t){const r=await c.from(t).select("*",{count:"exact",head:true});if(r.error){console.error("PatriaSoul admin count error",t,r.error);return null}return r.count||0}
const GH_API="https://api.github.com/repos/cn-dom/ps/actions/workflows/";
async function githubWorkflowRuns(file){try{const r=await fetch(GH_API+encodeURIComponent(file)+"/runs?per_page=5",{cache:"no-store",headers:{Accept:"application/vnd.github+json"}});if(!r.ok)throw new Error("GitHub Actions HTTP "+r.status);const j=await r.json();return (j.workflow_runs||[]).sort((a,b)=>Date.parse(b.run_started_at||b.created_at||b.updated_at||0)-Date.parse(a.run_started_at||a.created_at||a.updated_at||0))}catch(e){console.error("PatriaSoul GitHub Actions status error",file,e);return null}}
async function latestGithubBackup(){const lists=await Promise.all([githubWorkflowRuns("backup.yml"),githubWorkflowRuns("storage-backup.yml")]);if(lists.some(x=>x===null))return {data:[],error:{message:"GitHub Actions status unavailable"}};const runs=lists.flat().sort((a,b)=>Date.parse(b.run_started_at||b.created_at||b.updated_at||0)-Date.parse(a.run_started_at||a.created_at||a.updated_at||0));return {data:runs.slice(0,1),error:null}}
const workflowStatus=r=>!r?"Nije dostupno":r.status==="in_progress"?"U tijeku":r.status==="queued"||r.status==="requested"||r.status==="waiting"?"Na čekanju":r.status==="completed"?(r.conclusion==="success"?"Uspješan":r.conclusion==="failure"||r.conclusion==="timed_out"?"Neuspješan":r.conclusion==="cancelled"?"Otkazan":r.conclusion||"Završen"):r.status||"Nije evidentiran";
const hrMonths={"siječnja":0,"veljače":1,"ožujka":2,"travnja":3,"svibnja":4,"lipnja":5,"srpnja":6,"kolovoza":7,"rujna":8,"listopada":9,"studenoga":10,"prosinca":11,"sij":0,"velj":1,"ožu":2,"tra":3,"svi":4,"lip":5,"srp":6,"kol":7,"ruj":8,"lis":9,"stu":10,"pro":11};
async function users(c,currentId){const r=await c.from("profiles").select("id,display_name,role,created_at").order("created_at",{ascending:true});if(r.error)throw r.error;const b=$("#users-list");b.innerHTML=(r.data||[]).map(u=>{const owner=u.id===currentId;return '<div class="ps-admin-user"><div><strong>'+esc(u.display_name||"Bez imena")+'</strong><small>'+fmt(u.created_at)+(owner?' · <b>Vlasnik</b>':" · "+roleLabel(u.role))+'</small></div><div>'+(owner?'<span class="ps-owner-label">Vlasnik</span>':'<select data-user-role="'+esc(u.id)+'"><option value="player" '+(u.role==="player"?"selected":"")+'>Korisnik</option><option value="editor" '+(u.role==="editor"?"selected":"")+'>Urednik</option><option value="admin" '+(u.role==="admin"?"selected":"")+'>Admin</option></select>')+'</div></div>'}).join("")||"<p>Nema korisnika.</p>";b.querySelectorAll("select[data-user-role]").forEach(s=>{s.dataset.old=s.value;s.addEventListener("change",async()=>{const old=s.dataset.old;s.disabled=true;try{const r=await c.from("profiles").update({role:s.value,updated_at:new Date().toISOString()}).eq("id",s.dataset.userRole);if(r.error)throw r.error;await c.from("portal_system_events").insert({level:"info",event_type:"role_changed",message:"Promijenjena uloga korisnika.",metadata:{user_id:s.dataset.userRole,new_role:s.value},actor_id:currentId});s.dataset.old=s.value}catch(e){alert("Uloga nije promijenjena: "+(e?.message||"nepoznata greška"));s.value=old}finally{s.disabled=false}})})}
async function manageForum(c,canManage,currentId){
 const topicsBox=$("#forum-topics-manage"),reportsBox=$("#forum-reports-manage");
 const [topics,posts,reports]=await Promise.all([
  c.from("forum_topics").select("id,title,status,is_pinned,created_at,user_id").order("created_at",{ascending:false}).limit(12),
  count(c,"forum_posts"),
  c.from("forum_reports").select("id,topic_id,post_id,reason,details,status,created_at").eq("status","open").order("created_at",{ascending:false}).limit(12)
 ]);
 if(topics.error)throw topics.error;
 if(reports.error)throw reports.error;
 const openReports=reports.data||[];
 const topicRows=topics.data||[];
 const totalTopics=await count(c,"forum_topics");
 ["forum-topic-total","stat-forum-topics"].forEach(id=>set(id,totalTopics===null?"—":totalTopics));
 ["forum-post-total","stat-forum-posts"].forEach(id=>set(id,posts===null?"—":posts));
 set("forum-report-total",openReports.length);
 if(topicsBox)topicsBox.innerHTML=topicRows.map(t=>'<article class="ps-admin-forum-item"><div class="ps-admin-forum-copy"><strong>'+esc(t.title||"Tema bez naslova")+'</strong><small>'+fmt(t.created_at)+' · '+(t.is_pinned?"Prikvačeno · ":"")+esc(t.status||"—")+'</small></div><div class="ps-admin-actions"><select data-forum-topic-status="'+esc(t.id)+'" '+(!canManage?'disabled':'')+' aria-label="Status teme"><option value="published" '+(t.status==="published"?"selected":"")+'>Objavljena</option><option value="hidden" '+(t.status==="hidden"?"selected":"")+'>Skrivena</option><option value="locked" '+(t.status==="locked"?"selected":"")+'>Zaključana</option><option value="removed" '+(t.status==="removed"?"selected":"")+'>Uklonjena</option></select><button type="button" class="ps-admin-button ps-admin-button-light" data-forum-pin="'+esc(t.id)+'" data-pinned="'+String(!!t.is_pinned)+'" '+(!canManage?'disabled':'')+'>'+(t.is_pinned?"Otkvači":"Prikvači")+'</button></div></article>').join("")||'<p class="ps-admin-empty">Forum još nema tema.</p>';
 if(reportsBox)reportsBox.innerHTML=openReports.map(r=>'<article class="ps-admin-forum-item"><div class="ps-admin-forum-copy"><strong>'+esc(({spam:"Neželjeni sadržaj",uvreda:"Uvrede",mrznja:"Govor mržnje",neprimjeren_sadrzaj:"Neprimjeren sadržaj",dezinformacija:"Moguće dezinformacije",drugo:"Drugi razlog"}[r.reason]||r.reason||"Prijava"))+'</strong><small>'+fmt(r.created_at)+' · '+esc(r.details||("Tema: "+String(r.topic_id||"").slice(0,8)))+'</small></div><div class="ps-admin-actions"><select data-forum-report-status="'+esc(r.id)+'" '+(!canManage?'disabled':'')+' aria-label="Status prijave"><option value="open" selected>Otvorena</option><option value="reviewed">Pregledana</option><option value="dismissed">Odbačena</option><option value="removed">Sadržaj uklonjen</option></select></div></article>').join("")||'<p class="ps-admin-empty">Nema otvorenih prijava na forumu.</p>';
 topicsBox?.querySelectorAll("[data-forum-topic-status]").forEach(el=>el.addEventListener("change",async()=>{const old=el.dataset.old||"published";el.disabled=true;try{const r=await c.from("forum_topics").update({status:el.value,updated_at:new Date().toISOString()}).eq("id",el.dataset.forumTopicStatus);if(r.error)throw r.error;el.dataset.old=el.value;await manageForum(c,canManage,currentId)}catch(e){alert("Status teme nije promijenjen: "+(e?.message||"greška"));el.value=old}finally{el.disabled=!canManage}}));
 topicsBox?.querySelectorAll("[data-forum-pin]").forEach(btn=>btn.addEventListener("click",async()=>{btn.disabled=true;try{const r=await c.from("forum_topics").update({is_pinned:btn.dataset.pinned!=="true",updated_at:new Date().toISOString()}).eq("id",btn.dataset.forumPin);if(r.error)throw r.error;await manageForum(c,canManage,currentId)}catch(e){alert("Tema nije ažurirana: "+(e?.message||"greška"));btn.disabled=!canManage}}));
 reportsBox?.querySelectorAll("[data-forum-report-status]").forEach(el=>el.addEventListener("change",async()=>{const old="open";el.disabled=true;try{const r=await c.from("forum_reports").update({status:el.value,reviewed_by:currentId,reviewed_at:new Date().toISOString()}).eq("id",el.dataset.forumReportStatus);if(r.error)throw r.error;await manageForum(c,canManage,currentId)}catch(e){alert("Prijava nije ažurirana: "+(e?.message||"greška"));el.value=old}finally{el.disabled=!canManage}}));
}
async function manageStories(c){const r=await c.from("heritage_submissions").select("id,title,name,category,status,created_at,location").order("created_at",{ascending:false}).limit(30);const b=$("#stories-manage");if(r.error){console.error("PatriaSoul admin stories error",r.error);b.innerHTML="<p>Prijavljene priče trenutačno nisu dostupne. Provjeri dozvole Supabase tablice.</p>";return}b.innerHTML=(r.data||[]).map(x=>'<div class="ps-admin-item ps-admin-manage-item"><div><strong>'+esc(x.title||"Bez naslova")+'</strong><small>'+esc(x.name||"")+(x.location?" · "+esc(x.location):"")+" · "+fmt(x.created_at)+'</small></div><div class="ps-admin-actions"><select data-story-status="'+esc(x.id)+'"><option value="novo" '+(x.status==="novo"?"selected":"")+'>Novo</option><option value="u_provjeri" '+(x.status==="u_provjeri"?"selected":"")+'>U provjeri</option><option value="prihvaceno" '+(x.status==="prihvaceno"?"selected":"")+'>Prihvaćeno</option><option value="odbijeno" '+(x.status==="odbijeno"?"selected":"")+'>Odbijeno</option><option value="objavljeno" '+(x.status==="objavljeno"?"selected":"")+'>Objavljeno</option></select></div></div>').join("")||"<p>Nema prijavljenih priča.</p>";b.querySelectorAll("[data-story-status]").forEach(s=>{s.dataset.old=s.value;s.addEventListener("change",async()=>{const old=s.dataset.old;s.disabled=true;try{const r=await c.from("heritage_submissions").update({status:s.value}).eq("id",s.dataset.storyStatus);if(r.error)throw r.error;s.dataset.old=s.value}catch(e){alert("Status priče nije promijenjen: "+(e?.message||"nepoznata greška"));s.value=old}finally{s.disabled=false}})})}

async function manageSocialWall(c,canManage,currentId){
 const reportsBox=$("#wall-reports-manage"),postsBox=$("#wall-posts-manage");
 const [reports,posts]=await Promise.all([
  c.from("community_post_reports").select("id,post_id,reporter_id,reason,status,created_at").order("created_at",{ascending:false}).limit(30),
  c.from("community_posts").select("id,content,status,created_at,author_id,profiles!community_posts_author_id_fkey(display_name)").order("created_at",{ascending:false}).limit(25)
 ]);
 if(reports.error||posts.error){
  const msg="Moderacija zida još nije dostupna. Provjeri je li migracija društvenog zida primijenjena na Supabase.";
  if(reportsBox)reportsBox.innerHTML='<p class="ps-admin-empty">'+esc(msg)+'</p>';
  if(postsBox)postsBox.innerHTML='<p class="ps-admin-empty">'+esc(msg)+'</p>';
  set("wall-report-total","—");return;
 }
 const postMap=new Map((posts.data||[]).map(p=>[p.id,p]));
 const pending=(reports.data||[]).filter(r=>r.status==="pending").length;
 set("wall-report-total",pending);
 if(reportsBox)reportsBox.innerHTML=(reports.data||[]).map(r=>{
  const p=postMap.get(r.post_id),content=p?.content||"[Objava bez teksta ili više nije dostupna]";
  return '<article class="ps-admin-forum-item"><div class="ps-admin-forum-copy"><strong>'+esc(r.reason||"Prijava")+'</strong><small>'+fmt(r.created_at)+' · '+esc(content.slice(0,240))+'</small><small>Prijavitelj: '+esc(r.reporter_id.slice(0,8))+' · Objavljivač: '+esc(p?.profiles?.display_name||p?.author_id?.slice(0,8)||"nepoznat")+'</small></div><div class="ps-admin-actions"><select data-wall-report-status="'+esc(r.id)+'" data-old="'+esc(r.status)+'" '+(!canManage?'disabled':'')+' aria-label="Status prijave na zidu"><option value="pending" '+(r.status==="pending"?"selected":"")+'>Na čekanju</option><option value="reviewed" '+(r.status==="reviewed"?"selected":"")+'>Pregledana</option><option value="dismissed" '+(r.status==="dismissed"?"selected":"")+'>Odbačena</option><option value="action_taken" '+(r.status==="action_taken"?"selected":"")+'>Sadržaj uklonjen</option></select></div></article>';
 }).join("")||'<p class="ps-admin-empty">Nema prijava za objave na zidu.</p>';
 if(postsBox)postsBox.innerHTML=(posts.data||[]).map(p=>'<article class="ps-admin-forum-item"><div class="ps-admin-forum-copy"><strong>'+esc(p.profiles?.display_name||"Član zajednice")+'</strong><small>'+fmt(p.created_at)+' · '+esc((p.content||"[Fotografija]").slice(0,260))+'</small></div><div class="ps-admin-actions"><select data-wall-post-status="'+esc(p.id)+'" data-old="'+esc(p.status)+'" '+(!canManage?'disabled':'')+' aria-label="Status objave"><option value="published" '+(p.status==="published"?"selected":"")+'>Objavljena</option><option value="hidden" '+(p.status==="hidden"?"selected":"")+'>Skrivena</option><option value="removed" '+(p.status==="removed"?"selected":"")+'>Uklonjena</option></select></div></article>').join("")||'<p class="ps-admin-empty">Još nema objava na zidu.</p>';
 reportsBox?.querySelectorAll("[data-wall-report-status]").forEach(el=>el.addEventListener("change",async()=>{
  const old=el.dataset.old;el.disabled=true;
  try{
   if(el.value==="action_taken"){
    const report=(reports.data||[]).find(r=>r.id===el.dataset.wallReportStatus);
    if(report?.post_id){const hide=await c.from("community_posts").update({status:"hidden",updated_at:new Date().toISOString()}).eq("id",report.post_id);if(hide.error)throw hide.error}
   }
   const r=await c.from("community_post_reports").update({status:el.value,reviewed_by:currentId,reviewed_at:new Date().toISOString()}).eq("id",el.dataset.wallReportStatus);if(r.error)throw r.error;
   await manageSocialWall(c,canManage,currentId);
  }catch(e){alert("Prijava zida nije ažurirana: "+(e?.message||"nepoznata greška"));el.value=old}
  finally{el.disabled=!canManage}
 }));
 postsBox?.querySelectorAll("[data-wall-post-status]").forEach(el=>el.addEventListener("change",async()=>{
  const old=el.dataset.old;el.disabled=true;
  try{const r=await c.from("community_posts").update({status:el.value,updated_at:new Date().toISOString()}).eq("id",el.dataset.wallPostStatus);if(r.error)throw r.error;await manageSocialWall(c,canManage,currentId)}
  catch(e){alert("Status objave nije promijenjen: "+(e?.message||"nepoznata greška"));el.value=old}
  finally{el.disabled=!canManage}
 }));
}

async function manageAccountRequests(c,currentId){
 const box=$("#account-requests-manage");if(!box)return;
 const r=await c.from("account_lifecycle_requests").select("id,user_id,request_type,account_email,message,status,created_at,processed_at,admin_note").order("created_at",{ascending:false}).limit(100);
 if(r.error){box.innerHTML='<p class="ps-admin-empty">Zahtjevi računa nisu dostupni. Provjeri je li migracija 202610110003_account_lifecycle_requests.sql primijenjena na Supabase.</p>';return}
 const rows=r.data||[];
 if(!rows.length){box.innerHTML='<p class="ps-admin-empty">Nema zahtjeva za obradu.</p>';return}
 const types={deactivate:"Deaktivacija računa",delete:"Brisanje računa"},statuses={pending:"Na čekanju",in_review:"U obradi",completed:"Dovršeno",rejected:"Odbijeno"};
 box.innerHTML=rows.map(x=>'<article class="ps-admin-forum-item"><div class="ps-admin-forum-copy"><strong>'+esc(types[x.request_type]||x.request_type)+'</strong><small>'+esc(x.account_email||"E-mail nije dostupan")+' · '+fmt(x.created_at)+'</small><small>Korisnički ID: '+esc(x.user_id)+' · '+esc(x.message||"")+'</small>'+'<label class="ps-admin-note-label">Interna napomena<textarea data-account-request-note="'+esc(x.id)+'" maxlength="2000" rows="2" aria-label="Interna napomena za zahtjev">'+esc(x.admin_note||"")+'</textarea></label><button type="button" class="secondary" data-account-request-note-save="'+esc(x.id)+'">Spremi napomenu</button></div><div class="ps-admin-actions"><select data-account-request-status="'+esc(x.id)+'" data-old="'+esc(x.status)+'" aria-label="Status zahtjeva"><option value="pending" '+(x.status==="pending"?"selected":"")+'>Na čekanju</option><option value="in_review" '+(x.status==="in_review"?"selected":"")+'>U obradi</option><option value="rejected" '+(x.status==="rejected"?"selected":"")+'>Odbijen</option><option value="completed" '+(x.status==="completed"?"selected":"")+'>Dovršen</option></select></div></article>').join("");
 box.querySelectorAll("[data-account-request-note-save]").forEach(button=>button.addEventListener("click",async()=>{
  const id=button.dataset.accountRequestNoteSave,field=box.querySelector('[data-account-request-note="'+id+'"]');
  if(!field)return;
  const note=field.value.trim();
  if(note.length>2000){alert("Napomena smije imati najviše 2000 znakova.");return}
  button.disabled=true;
  try{
   const result=await c.from("account_lifecycle_requests").update({admin_note:note||null}).eq("id",id);
   if(result.error)throw result.error;
   await manageAccountRequests(c,currentId);
  }catch(e){alert("Napomena nije spremljena: "+(e?.message||"nepoznata greška"))}
  finally{button.disabled=false}
 }));
 box.querySelectorAll("[data-account-request-status]").forEach(el=>el.addEventListener("change",async()=>{
  const old=el.dataset.old,next=el.value;el.disabled=true;
  if(next==="completed"&&!window.confirm("Potvrđuješ da je zahtjev stvarno proveden izvan ove nadzorne ploče? Ova promjena samo označava zahtjev kao dovršen; ne deaktivira i ne briše račun.")){el.value=old;el.disabled=false;return}
  try{const terminal=next==="completed"||next==="rejected";const upd={status:next,processed_at:terminal?new Date().toISOString():null,processed_by:terminal?currentId:null};const result=await c.from("account_lifecycle_requests").update(upd).eq("id",el.dataset.accountRequestStatus);if(result.error)throw result.error;await manageAccountRequests(c,currentId)}
  catch(e){alert("Zahtjev nije ažuriran: "+(e?.message||"nepoznata greška"));el.value=old}
  finally{el.disabled=false}
 }));
}
async function load(){
 const status=$("#admin-status"),denied=$("#admin-denied"),dash=$("#admin-dashboard");
 try{
  const u=await auth.getUser();
  if(!u){status.textContent="Niste prijavljeni";denied.hidden=false;return}
  const owner=String(u.email||"").toLowerCase()===OWNER;
  const c=await auth.client();
  const profile=await c.from("profiles").select("display_name,role").eq("id",u.id).maybeSingle();
  if(profile.error)throw profile.error;
  const role=profile.data?.role||"player";
  const canEdit=role==="editor"||role==="admin"||owner;
  if(!canEdit){status.textContent="Pristup odbijen";denied.hidden=false;return}
  const ops=role==="admin"||owner;
  status.textContent=(owner?"Vlasnik PatriaSoul · ":role==="admin"?"Administrator · ":"Urednik · ")+(profile.data?.display_name||u.email||"");
  dash.hidden=false;
  const rolesPanel=$("#roles-panel");if(rolesPanel){rolesPanel.dataset.accessDenied=String(!owner);rolesPanel.hidden=!owner}const requestsPanel=$("#account-requests-panel");if(requestsPanel){requestsPanel.dataset.accessDenied=String(!ops);requestsPanel.hidden=!ops}const usersTab=document.querySelector('[data-admin-tab="users"]');if(usersTab){usersTab.hidden=!ops;usersTab.setAttribute("aria-hidden",String(!ops));}
  const note=$("#admin-access-note");
  if(note)note.textContent=owner?"Puni pristup, uključujući upravljanje ulogama.":ops?"Moderacija zajednice i foruma.":"Upravljanje prijavljenim pričama i komentarima.";
  const [stories,usersCount,forumTopics,forumPosts,backs,deps,events]=await Promise.all([
   count(c,"heritage_submissions"),count(c,"profiles"),
   count(c,"forum_topics"),count(c,"forum_posts"),
   ops?latestGithubBackup():Promise.resolve({data:[],error:null}),
   ops?githubWorkflowRuns("pages.yml").then(r=>r===null?{data:[],error:{message:"GitHub Actions status unavailable"}}:{data:r.slice(0,1),error:null}):Promise.resolve({data:[],error:null}),
   ops?c.from("portal_system_events").select("level,event_type,message,created_at").order("created_at",{ascending:false}).limit(10):Promise.resolve({data:[],error:null})
  ]);
  set("stat-stories",stories===null?"—":stories);
  set("stat-users",usersCount===null?"—":usersCount);
  set("stat-forum-topics",forumTopics===null?"—":forumTopics);
  set("stat-forum-posts",forumPosts===null?"—":forumPosts);
  const backup=backs.data?.[0],deploy=deps.data?.[0],errorEvents=(events.data||[]).filter(e=>e.level==="error");
  set("stat-backup",backup?workflowStatus(backup):"—");
  set("stat-backup-note",backup?fmt(backup.run_started_at||backup.created_at||backup.updated_at):"Nema dostupnog zapisa");
  set("stat-deploy",deploy?workflowStatus(deploy):"—");
  set("stat-deploy-note",deploy?fmt(deploy.run_started_at||deploy.created_at||deploy.updated_at):"Nema dostupnog zapisa");
  set("stat-errors",ops?errorEvents.length:"—");
  set("stat-errors-note",ops?(errorEvents[0]?.message||"Nema evidentiranih grešaka"):"Dostupno administratoru");
  const ok=!ops||(Boolean(backup)&&backup.status==="completed"&&backup.conclusion==="success"&&Boolean(deploy)&&deploy.status==="completed"&&deploy.conclusion==="success"&&errorEvents.length===0);
  set("stat-system",ok?"Provjera završena":"Potrebna provjera");
  set("stat-system-note",ok?"Operativne provjere ne pokazuju aktivan problem.":"Provjeri posljednju sigurnosnu kopiju, objavu ili zapis greške.");
  const checks=$("#system-checks");
  if(checks)checks.innerHTML=[
   ["Pristup",true,owner?"Vlasnik potvrđen":ops?"Administratorski pristup potvrđen":"Urednički pristup potvrđen"],
   ["Forum",forumTopics!==null&&forumPosts!==null,(forumTopics??"—")+" tema · "+(forumPosts??"—")+" objava"],
   ["Prijavljene priče",stories!==null,stories===null?"Podaci nisu dostupni":stories+" zapisa"],
   ["Korisnici",usersCount!==null,usersCount===null?"Podaci nisu dostupni":usersCount+" profila"],
   ["Sigurnosna kopija",ops?(backup?.status==="completed"&&backup?.conclusion==="success"):"—",ops?(backup?workflowStatus(backup):"Nema zapisa"):"Dostupno administratoru"],
   ["Objava portala",ops?(deploy?.status==="completed"&&deploy?.conclusion==="success"):"—",ops?(deploy?workflowStatus(deploy):"Nema zapisa"):"Dostupno administratoru"],
   ["Sustavne greške",ops?errorEvents.length===0:"—",ops?(errorEvents.length?errorEvents.length+" grešaka":"Nema evidentiranih grešaka"):"Dostupno administratoru"]
  ].map(x=>'<li><span>'+esc(x[0])+'</span><strong class="'+(x[1]===true?"ps-check-ok":x[1]===false?"ps-check-bad":"")+'">'+(x[1]===true?"✓ ":x[1]===false?"! ":"")+esc(x[2])+"</strong></li>").join("");
  const tasks=[manageStories(c),manageSocialWall(c,canEdit,u.id)];
  if(ops)tasks.push(manageForum(c,true,u.id));else tasks.push(manageForum(c,false,u.id));
  if(owner)tasks.push(users(c,u.id));
  if(ops)tasks.push(manageAccountRequests(c,u.id));
  const results=await Promise.allSettled(tasks);
  const failures=results.filter(r=>r.status==="rejected");
  if(failures.length){console.error("PatriaSoul admin community load errors",failures.map(r=>r.reason));set("stat-system","Dio podataka nije dostupan");set("stat-system-note","Provjeri dozvole Supabase tablica i konzolu preglednika.")}
 }catch(e){
  console.error(e);
  status.textContent="Greška pri učitavanju";
  dash.hidden=false;
  set("stat-system","Greška");
  set("stat-system-note",e?.message||"Podaci se nisu mogli učitati.");
 }
}
$("#refresh-admin")?.addEventListener("click",load);window.PatriaSoulAdmin={refreshCommunity:load};load()})();