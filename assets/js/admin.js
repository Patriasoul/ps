(()=>{"use strict";const auth=window.PatriaSoulAuth,$=s=>document.querySelector(s),set=(id,v)=>{const e=$("#"+id);if(e)e.textContent=v},fmt=v=>v?new Intl.DateTimeFormat("hr-HR",{dateStyle:"medium",timeStyle:"short"}).format(new Date(v)):"—";const OWNER="patriasoul@protonmail.com";const esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));const roleLabel=r=>({player:"Korisnik",editor:"Urednik",admin:"Admin"}[r]||"Korisnik");const statusLabel=s=>({draft:"Nacrt",review:"Urednička provjera",approved:"Odobreno",scheduled:"Zakazano",published:"Objavljeno",archived:"Arhivirano"}[s]||s||"—");const storyLabel=s=>({novo:"Novo",u_provjeri:"U provjeri",prihvaceno:"Prihvaćeno",odbijeno:"Odbijeno",objavljeno:"Objavljeno"}[s]||s||"—");const commentText=v=>String(v??"").trim();async function count(c,t){const r=await c.from(t).select("*",{count:"exact",head:true});if(r.error){console.error("PatriaSoul admin count error",t,r.error);return null}return r.count||0}
const GH_API="https://api.github.com/repos/cn-dom/ps/actions/workflows/";
async function githubWorkflowRuns(file){try{const r=await fetch(GH_API+encodeURIComponent(file)+"/runs?per_page=5",{cache:"no-store",headers:{Accept:"application/vnd.github+json"}});if(!r.ok)throw new Error("GitHub Actions HTTP "+r.status);const j=await r.json();return (j.workflow_runs||[]).sort((a,b)=>Date.parse(b.run_started_at||b.created_at||b.updated_at||0)-Date.parse(a.run_started_at||a.created_at||a.updated_at||0))}catch(e){console.error("PatriaSoul GitHub Actions status error",file,e);return null}}
async function latestGithubBackup(){const lists=await Promise.all([githubWorkflowRuns("backup.yml"),githubWorkflowRuns("storage-backup.yml")]);if(lists.some(x=>x===null))return {data:[],error:{message:"GitHub Actions status unavailable"}};const runs=lists.flat().sort((a,b)=>Date.parse(b.run_started_at||b.created_at||b.updated_at||0)-Date.parse(a.run_started_at||a.created_at||a.updated_at||0));return {data:runs.slice(0,1),error:null}}
const workflowStatus=r=>!r?"Nije dostupno":r.status==="in_progress"?"U tijeku":r.status==="queued"||r.status==="requested"||r.status==="waiting"?"Na čekanju":r.status==="completed"?(r.conclusion==="success"?"Uspješan":r.conclusion==="failure"||r.conclusion==="timed_out"?"Neuspješan":r.conclusion==="cancelled"?"Otkazan":r.conclusion||"Završen"):r.status||"Nije evidentiran";
const hrMonths={"siječnja":0,"veljače":1,"ožujka":2,"travnja":3,"svibnja":4,"lipnja":5,"srpnja":6,"kolovoza":7,"rujna":8,"listopada":9,"studenoga":10,"prosinca":11,"sij":0,"velj":1,"ožu":2,"tra":3,"svi":4,"lip":5,"srp":6,"kol":7,"ruj":8,"lis":9,"stu":10,"pro":11};
function articleDateValue(value){const v=String(value||"").trim();if(!v)return 0;const iso=Date.parse(v);if(/^\d{4}-\d{2}-\d{2}/.test(v)&&Number.isFinite(iso))return iso;const m=v.toLocaleLowerCase("hr-HR").match(/(\d{1,2})\.?\s*([a-zčćđšž]+)\s*(\d{4})/i);if(m&&hrMonths[m[2]]!==undefined)return new Date(Number(m[3]),hrMonths[m[2]],Number(m[1]),12).getTime();const parsed=Date.parse(v);return Number.isFinite(parsed)?parsed:0}
async function users(c,currentId){const r=await c.from("profiles").select("id,display_name,role,created_at").order("created_at",{ascending:true});if(r.error)throw r.error;const b=$("#users-list");b.innerHTML=(r.data||[]).map(u=>{const owner=u.id===currentId;return '<div class="ps-admin-user"><div><strong>'+esc(u.display_name||"Bez imena")+'</strong><small>'+fmt(u.created_at)+(owner?' · <b>Vlasnik</b>':" · "+roleLabel(u.role))+'</small></div><div>'+(owner?'<span class="ps-owner-label">Vlasnik</span>':'<select data-user-role="'+esc(u.id)+'"><option value="player" '+(u.role==="player"?"selected":"")+'>Korisnik</option><option value="editor" '+(u.role==="editor"?"selected":"")+'>Urednik</option><option value="admin" '+(u.role==="admin"?"selected":"")+'>Admin</option></select>')+'</div></div>'}).join("")||"<p>Nema korisnika.</p>";b.querySelectorAll("select[data-user-role]").forEach(s=>{s.dataset.old=s.value;s.addEventListener("change",async()=>{const old=s.dataset.old;s.disabled=true;try{const r=await c.from("profiles").update({role:s.value,updated_at:new Date().toISOString()}).eq("id",s.dataset.userRole);if(r.error)throw r.error;await c.from("portal_system_events").insert({level:"info",event_type:"role_changed",message:"Promijenjena uloga korisnika.",metadata:{user_id:s.dataset.userRole,new_role:s.value},actor_id:currentId});s.dataset.old=s.value}catch(e){alert("Uloga nije promijenjena: "+(e?.message||"nepoznata greška"));s.value=old}finally{s.disabled=false}})})}
async function manageArticles(c){
const r=await c.from("portal_articles").select("id,title,path,status,published_at,updated_at").neq("status","published").order("updated_at",{ascending:false}).limit(30);if(r.error)throw r.error;
const b=$("#articles-manage");
b.innerHTML='<div class="ps-admin-actions ps-admin-new-article"><button type="button" class="ps-admin-button" id="new-article">+ Novi članak</button></div>'+(r.data||[]).map(a=>'<div class="ps-admin-item ps-admin-manage-item"><div><strong>'+esc(a.title||"Bez naslova")+'</strong><small>'+esc(a.path||"")+" · "+fmt(a.updated_at)+'</small></div><div class="ps-admin-actions"><select data-article-status="'+esc(a.id)+'"><option value="draft" '+(a.status==="draft"?"selected":"")+'>Nacrt</option><option value="review" '+(a.status==="review"?"selected":"")+'>Urednička provjera</option><option value="approved" '+(a.status==="approved"?"selected":"")+'>Odobreno</option><option value="scheduled" '+(a.status==="scheduled"?"selected":"")+'>Zakazano</option><option value="published" '+(a.status==="published"?"selected":"")+'>Objavljeno</option><option value="archived" '+(a.status==="archived"?"selected":"")+'>Arhivirano</option></select><button type="button" class="ps-admin-button ps-admin-preview" data-preview-article="'+esc(a.id)+'">Pregled</button><button type="button" class="ps-admin-button ps-admin-publish" data-publish-article="'+esc(a.id)+'">Objavi</button><button type="button" class="ps-admin-button ps-admin-edit" data-edit-article="'+esc(a.id)+'">Uredi</button><button type="button" class="ps-admin-danger" data-delete-article="'+esc(a.id)+'">Obriši</button></div></div>').join("")||"<p>Nema članaka u CMS bazi.</p>";
$("#new-article")?.addEventListener("click",()=>window.PatriaSoulArticleEditor?.open());
b.querySelectorAll("[data-preview-article]").forEach(btn=>btn.addEventListener("click",async()=>{btn.disabled=true;try{const r=await c.from("portal_articles").select("title,kicker,category,subcategory,excerpt,body_html,image_url,image_alt,author_display,status,published_at,source_data").eq("id",btn.dataset.previewArticle).single();if(r.error)throw r.error;const a=r.data||{};const modal=$("#article-preview-modal"),title=$("#article-preview-title"),meta=$("#article-preview-meta"),img=$("#article-preview-image"),body=$("#article-preview-body"),sources=$("#article-preview-sources");title.textContent=a.title||"Bez naslova";meta.textContent=[a.kicker,a.category,a.subcategory,statusLabel(a.status),a.published_at?fmt(a.published_at):"Za provjeru"].filter(Boolean).join(" · ");if(a.image_url){img.src=a.image_url;img.alt=a.image_alt||a.title||"";img.hidden=false}else{img.hidden=true;img.removeAttribute("src")}body.innerHTML=a.body_html||"<p>Nema teksta članka.</p>";sources.innerHTML=(Array.isArray(a.source_data?.sources)&&a.source_data.sources.length)?("<strong>Izvori</strong>"+a.source_data.sources.map(x=>'<div><a href="'+esc(x)+'" target="_blank" rel="noopener">'+esc(x)+"</a></div>").join("")):"";modal.hidden=false;document.body.classList.add("ps-preview-open")}catch(e){alert("Pregled nije moguće otvoriti: "+(e?.message||"nepoznata greška"))}finally{btn.disabled=false}}));
b.querySelectorAll("[data-edit-article]").forEach(btn=>btn.addEventListener("click",()=>window.PatriaSoulArticleEditor?.open(btn.dataset.editArticle)));b.querySelectorAll("[data-publish-article]").forEach(btn=>btn.addEventListener("click",async()=>{btn.disabled=true;try{const r=await c.from("portal_articles").update({status:"published",published_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",btn.dataset.publishArticle);if(r.error)throw r.error;await Promise.all([manageArticles(c),managePublishedArticles(c)])}catch(e){alert("Članak nije objavljen: "+(e?.message||"nepoznata greška"));btn.disabled=false}}));b.querySelectorAll("[data-delete-article]").forEach(btn=>btn.addEventListener("click",async()=>{if(!confirm("Obrisati ovaj članak? Ova radnja se ne može poništiti."))return;btn.disabled=true;try{const rev=await c.from("portal_article_revisions").delete().eq("article_id",btn.dataset.deleteArticle);if(rev.error)throw rev.error;const r=await c.from("portal_articles").delete().eq("id",btn.dataset.deleteArticle);if(r.error)throw r.error;await manageArticles(c)}catch(e){alert("Članak nije obrisan: "+(e?.message||"nepoznata greška"));btn.disabled=false}}));
b.querySelectorAll("[data-article-status]").forEach(s=>{s.dataset.old=s.value;s.addEventListener("change",async()=>{const old=s.dataset.old;s.disabled=true;try{const patch={status:s.value,updated_at:new Date().toISOString()};if(s.value==="published")patch.published_at=new Date().toISOString();const r=await c.from("portal_articles").update(patch).eq("id",s.dataset.articleStatus);if(r.error)throw r.error;s.dataset.old=s.value;await Promise.all([manageArticles(c),managePublishedArticles(c)])}catch(e){alert("Status članka nije promijenjen: "+(e?.message||"nepoznata greška"));s.value=old}finally{s.disabled=false}})});
}
async function managePublishedArticles(c){
 const r=await c.from("portal_articles").select("id,title,path,published_at,updated_at").eq("status","published").order("published_at",{ascending:false,nullsFirst:false}).order("updated_at",{ascending:false}).limit(50);
 if(r.error)throw r.error;
 const b=$("#published-articles-manage");if(!b)return;
 const rows=r.data||[];
 b.innerHTML=rows.map(a=>'<article class="ps-admin-published-item"><div class="ps-admin-published-copy"><strong>'+esc(a.title||"Bez naslova")+'</strong><small>'+esc(a.path||"")+' · Objavljeno '+fmt(a.published_at||a.updated_at)+'</small></div><div class="ps-admin-actions"><button type="button" class="ps-admin-button ps-admin-button-light" data-published-edit="'+esc(a.id)+'">Uredi</button>'+(a.path?'<a class="ps-admin-button" href="../'+esc(String(a.path).replace(/^\.\//,""))+'" target="_blank" rel="noopener">Otvori članak ↗</a>':"")+'</div></article>').join("")||'<p class="ps-admin-empty">Još nema objavljenih članaka.</p>';
 b.querySelectorAll("[data-published-edit]").forEach(btn=>btn.addEventListener("click",()=>window.PatriaSoulArticleEditor?.open(btn.dataset.publishedEdit)));
}
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
async function manageComments(c){const r=await c.from("article_comments").select("id,article_path,author_name,body,created_at").order("created_at",{ascending:false}).limit(30);if(r.error)throw r.error;const b=$("#comments-manage");b.innerHTML=(r.data||[]).map(x=>'<div class="ps-admin-comment"><div class="ps-admin-comment-head"><strong>'+esc(x.author_name||"Korisnik")+'</strong><small>'+fmt(x.created_at)+'</small></div><small>'+esc(x.article_path||"")+'</small><p>'+esc(commentText(x.body))+'</p><button type="button" class="ps-admin-danger" data-delete-comment="'+esc(x.id)+'">Obriši komentar</button></div>').join("")||"<p>Nema komentara.</p>";b.querySelectorAll("[data-delete-comment]").forEach(btn=>btn.addEventListener("click",async()=>{if(!confirm("Obrisati ovaj komentar?"))return;btn.disabled=true;try{const r=await c.from("article_comments").delete().eq("id",btn.dataset.deleteComment);if(r.error)throw r.error;await manageComments(c);set("stat-comments",await count(c,"article_comments"))}catch(e){alert("Komentar nije obrisan: "+(e?.message||"nepoznata greška"));btn.disabled=false}}))}

async function manageRssDrafts(c,currentUserId){
 const statusEl=$("#rss-drafts-status"),list=$("#rss-drafts-list");
 if(!statusEl||!list)return;
 statusEl.textContent="Učitavanje privatnih RSS prijedloga…";
 try{
  const r=await c.from("rss_editorial_drafts").select("id,source_url,source_name,source_published_at,title,summary,status,editorial_notes,created_at,updated_at").order("source_published_at",{ascending:false}).limit(60);
  if(r.error)throw r.error;
  const rows=r.data||[];
  if(!rows.length){list.innerHTML="<p>Nema novih RSS prijedloga. Automatizacija sprema samo relevantne vijesti iz posljednjih 36 sati.</p>";statusEl.textContent="Nema prijedloga za prikaz.";return}
  const date=v=>v?fmt(v):"—";
  const sourceLink=value=>{try{const u=new URL(value);if(u.protocol!=="https:"||!["index.hr","www.index.hr","vecernji.hr","www.vecernji.hr"].includes(u.hostname.toLowerCase()))return "";return '<a href="'+esc(u.href)+'" target="_blank" rel="noopener noreferrer">Otvori izvor ↗</a>'}catch{return ""}};
  const cardHtml=x=>'<article class="ps-rss-draft" data-rss-draft="'+esc(x.id)+'"><div class="ps-rss-draft-head"><div><span class="ps-rss-status ps-rss-status-'+esc(x.status)+'">'+esc(({pending:"Čeka provjeru",reviewed:"Pregledano",rejected:"Odbijeno",converted:"Preuzeto u CMS"})[x.status]||x.status)+'</span><h3>'+esc(x.title)+'</h3></div><small>'+date(x.source_published_at)+'</small></div><p class="ps-rss-draft-summary">'+esc(x.summary||"Izvor nije dostavio sažetak.")+'</p><div class="ps-rss-draft-meta"><span>'+esc(x.source_name)+'</span>'+sourceLink(x.source_url)+'</div><label class="ps-rss-draft-note">Urednička bilješka<textarea rows="3" maxlength="4000" data-rss-note>'+esc(x.editorial_notes||"")+'</textarea></label><div class="ps-admin-actions ps-rss-draft-actions"><label>Status<select data-rss-status><option value="pending" '+(x.status==="pending"?"selected":"")+'>Čeka provjeru</option><option value="reviewed" '+(x.status==="reviewed"?"selected":"")+'>Pregledano</option><option value="rejected" '+(x.status==="rejected"?"selected":"")+'>Odbijeno</option><option value="converted" '+(x.status==="converted"?"selected":"")+'>Preuzeto u CMS</option></select></label><button type="button" class="ps-admin-button" data-rss-save>Spremi bilješku i status</button><button type="button" class="ps-admin-button ps-admin-button-light" data-rss-create>Izradi članak</button></div></article>';
  const active=rows.filter(x=>x.status!=="rejected");
  const sections=[
   {status:"pending",title:"1. Novi prijedlozi",hint:"Čekaju urednički pregled."},
   {status:"reviewed",title:"2. Spremno za izradu",hint:"Pregledani prijedlozi koje možeš pretvoriti u članak."},
   {status:"converted",title:"3. Spremljeno u CMS",hint:"Članci spremljeni kao nacrti; provjeri ih prije objave."}
  ];
  list.innerHTML=sections.map(sec=>{const items=active.filter(x=>x.status===sec.status);return '<section class="ps-rss-workflow-stage" data-rss-stage="'+sec.status+'"><h3>'+sec.title+' <span>('+items.length+')</span></h3><p>'+sec.hint+'</p><div class="ps-rss-stage-items">'+(items.map(cardHtml).join("")||'<p class="ps-admin-muted">Nema prijedloga u ovom koraku.</p>')+'</div></section>'}).join("");
  list.querySelectorAll("[data-rss-save]").forEach(btn=>btn.addEventListener("click",async()=>{
   const card=btn.closest("[data-rss-draft]"),id=card?.dataset.rssDraft,note=card?.querySelector("[data-rss-note]")?.value||"",next=card?.querySelector("[data-rss-status]")?.value||"pending";
   if(!id)return;btn.disabled=true;const prior=btn.textContent;btn.textContent="Spremam…";
   try{
    const patch={editorial_notes:note,status:next,updated_at:new Date().toISOString(),reviewed_by:next==="pending"?null:currentUserId,reviewed_at:next==="pending"?null:new Date().toISOString()};
    const saved=await c.from("rss_editorial_drafts").update(patch).eq("id",id).select("id").maybeSingle();
    if(saved.error)throw saved.error;
    if(!saved.data)throw new Error("Promjena nije spremljena. Provjeri uredničke ovlasti.");
    await manageRssDrafts(c,currentUserId);
    statusEl.textContent=next==="rejected"?"Prijedlog je odbijen i uklonjen s aktivnih lista.":next==="reviewed"?"Prijedlog je pregledan i premješten u blok za izradu.":next==="converted"?"Prijedlog je premješten u blok preuzetih u CMS.":"Prijedlog je vraćen među nove prijedloge.";
   }catch(e){alert("RSS prijedlog nije spremljen: "+(e?.message||"nepoznata greška"));btn.textContent=prior}
   finally{btn.disabled=false}
  }));
  list.querySelectorAll("[data-rss-create]").forEach(btn=>btn.addEventListener("click",async()=>{
   const card=btn.closest("[data-rss-draft]");
   const row=rows.find(x=>String(x.id)===String(card?.dataset.rssDraft));
   if(!row)return;
   if(!window.PatriaSoulAIArticle?.generateFromRSS){alert("AI generator nije učitan. Osvježi administraciju i pokušaj ponovno.");return}
   btn.disabled=true;const oldText=btn.textContent;btn.textContent="Pokrećem AI…";
   try{
    await window.PatriaSoulAIArticle.generateFromRSS({id:row.id,title:row.title,description:row.summary||"",link:row.source_url,date:row.source_published_at||"",source:row.source_name||"RSS izvor"});
    statusEl.textContent="Članak je izrađen i prenesen u CMS urednik. Spremi ga ondje da se prijedlog premjesti u blok spremljenih.";
   }catch(e){alert("Članak nije izrađen: "+(e?.message||"nepoznata greška"))}
   finally{btn.disabled=false;btn.textContent=oldText}
  }));
  statusEl.textContent=rows.length+" privatnih RSS prijedloga. Nijedan se ne objavljuje automatski.";
 }catch(e){console.error("PatriaSoul RSS drafts error",e);statusEl.textContent="RSS prijedlozi nisu dostupni: "+(e?.message||"provjeri pristup bazi");list.innerHTML="<p>Provjeri da je RSS tablica postavljena i da je tvoj račun ovlašten za urednički pristup.</p>"}
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
  $("#roles-panel").hidden=!owner;
  const note=$("#admin-access-note");
  if(note)note.textContent=owner?"Puni pristup, uključujući upravljanje ulogama.":ops?"Moderacija zajednice i foruma.":"Upravljanje prijavljenim pričama i komentarima.";
  const [stories,comments,usersCount,forumTopics,forumPosts,backs,deps,events]=await Promise.all([
   count(c,"heritage_submissions"),count(c,"article_comments"),count(c,"profiles"),
   count(c,"forum_topics"),count(c,"forum_posts"),
   ops?latestGithubBackup():Promise.resolve({data:[],error:null}),
   ops?githubWorkflowRuns("pages.yml").then(r=>r===null?{data:[],error:{message:"GitHub Actions status unavailable"}}:{data:r.slice(0,1),error:null}):Promise.resolve({data:[],error:null}),
   ops?c.from("portal_system_events").select("level,event_type,message,created_at").order("created_at",{ascending:false}).limit(10):Promise.resolve({data:[],error:null})
  ]);
  set("stat-stories",stories===null?"—":stories);
  set("stat-comments",comments===null?"—":comments);
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
   ["Komentari",comments!==null,comments===null?"Podaci nisu dostupni":comments+" zapisa"],
   ["Korisnici",usersCount!==null,usersCount===null?"Podaci nisu dostupni":usersCount+" profila"],
   ["Sigurnosna kopija",ops?(backup?.status==="completed"&&backup?.conclusion==="success"):"—",ops?(backup?workflowStatus(backup):"Nema zapisa"):"Dostupno administratoru"],
   ["Objava portala",ops?(deploy?.status==="completed"&&deploy?.conclusion==="success"):"—",ops?(deploy?workflowStatus(deploy):"Nema zapisa"):"Dostupno administratoru"],
   ["Sustavne greške",ops?errorEvents.length===0:"—",ops?(errorEvents.length?errorEvents.length+" grešaka":"Nema evidentiranih grešaka"):"Dostupno administratoru"]
  ].map(x=>'<li><span>'+esc(x[0])+'</span><strong class="'+(x[1]===true?"ps-check-ok":x[1]===false?"ps-check-bad":"")+'">'+(x[1]===true?"✓ ":x[1]===false?"! ":"")+esc(x[2])+"</strong></li>").join("");
  const tasks=[manageStories(c),manageComments(c)];
  if(ops)tasks.push(manageForum(c,true,u.id));else tasks.push(manageForum(c,false,u.id));
  if(owner)tasks.push(users(c,u.id));
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
$("#article-preview-close")?.addEventListener("click",()=>{$("#article-preview-modal").hidden=true;document.body.classList.remove("ps-preview-open")});$("#article-preview-modal")?.addEventListener("click",e=>{if(e.target.id==="article-preview-modal"){$("#article-preview-modal").hidden=true;document.body.classList.remove("ps-preview-open")}});$("#refresh-admin")?.addEventListener("click",load);$("#rss-drafts-refresh")?.addEventListener("click",async()=>{try{const u=await auth.getUser();if(!u)return;const c=await auth.client();await manageRssDrafts(c,u.id)}catch(e){console.error(e)}});$("#article-save")?.addEventListener("click",()=>window.PatriaSoulArticleEditor?.save());$("#article-clear")?.addEventListener("click",()=>window.PatriaSoulArticleEditor?.clear());window.PatriaSoulAdmin={refreshArticles:async()=>{try{const c=await auth.client();await Promise.all([manageArticles(c),managePublishedArticles(c),manageForum(c,true,null)])}catch(e){console.error(e)}},refreshRssDrafts:async()=>{try{const u=await auth.getUser();if(!u)return;const c=await auth.client();await manageRssDrafts(c,u.id)}catch(e){console.error(e)}}};load()})();