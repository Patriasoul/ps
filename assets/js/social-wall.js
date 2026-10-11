(()=>{"use strict";
const root=document.getElementById("ps-wall");if(!root||root.dataset.ready)return;root.dataset.ready="1";
const $=id=>document.getElementById(id),status=$("ps-wall-status"),feed=$("ps-wall-feed"),composer=$("ps-wall-composer"),form=$("ps-wall-post-form"),submit=$("ps-wall-post-submit"),imageInput=$("ps-wall-post-image");
let client=null,user=null,profile=null,blocks=new Set(),posts=[];
const esc=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const initials=name=>String(name||"PS").trim().split(/\s+/).slice(0,2).map(s=>s[0]||"").join("").toUpperCase();
const say=(message,error=false)=>{status.textContent=message||"";status.classList.toggle("is-error",!!error);status.hidden=!message};
const db=async()=>{if(client)return client;client=await PatriaSoulAuth.client();return client};
const isAdmin=()=>["admin","editor"].includes(profile?.role);
const formatDate=value=>{try{return new Intl.DateTimeFormat("hr-HR",{dateStyle:"medium",timeStyle:"short"}).format(new Date(value))}catch{return ""}};
function avatar(name,url){return url?'<div class="ps-wall-avatar"><img alt="" src="'+esc(url)+'"></div>':'<div class="ps-wall-avatar" aria-hidden="true">'+esc(initials(name))+'</div>'}
async function signedImage(path){if(!path)return "";try{const {data,error}=await (await db()).storage.from("community-media").createSignedUrl(path,1800);return error?"":data?.signedUrl||""}catch{return ""}}
async function loadBlocks(){const {data,error}=await (await db()).from("community_user_blocks").select("blocked_id").eq("blocker_id",user.id);if(error)throw error;blocks=new Set((data||[]).map(x=>x.blocked_id))}
async function loadPosts(){
 feed.innerHTML='<div class="ps-wall-empty">Učitavam objave…</div>';
 const c=await db();
 const {data,error}=await c.from("community_posts").select("id,author_id,content,image_path,status,created_at,updated_at,profiles!community_posts_author_id_fkey(display_name,avatar_url),community_post_reactions(id,user_id,reaction),community_post_comments(id,author_id,content,created_at,profiles!community_post_comments_author_id_fkey(display_name,avatar_url))").eq("status","published").order("created_at",{ascending:false}).limit(40);
 if(error)throw error;
 posts=(data||[]).filter(p=>!blocks.has(p.author_id));
 if(!posts.length){feed.innerHTML='<div class="ps-wall-empty">Još nema objava. Budi među prvima koji će podijeliti priču sa zajednicom.</div>';return}
 const enriched=await Promise.all(posts.map(async p=>({p,image:await signedImage(p.image_path)})));
 feed.innerHTML=enriched.map(({p,image})=>{
  const name=p.profiles?.display_name||"Član zajednice",mine=p.author_id===user.id,rx=p.community_post_reactions||[],comments=(p.community_post_comments||[]).sort((a,b)=>new Date(a.created_at)-new Date(b.created_at));
  const count=rx.length,active=rx.some(r=>r.user_id===user.id);
  return '<article class="ps-wall-post" data-post-id="'+esc(p.id)+'"><header class="ps-wall-post-head">'+avatar(name,p.profiles?.avatar_url)+'<div class="ps-wall-post-author"><strong>'+esc(name)+'</strong><time datetime="'+esc(p.created_at)+'">'+esc(formatDate(p.created_at))+'</time></div><div class="ps-wall-post-menu">'+(mine?'<button type="button" data-action="delete-post">Izbriši</button>':'<button type="button" data-action="report-post">Prijavi</button><button type="button" data-action="block-user">Blokiraj</button>')+'</div></header>'+(p.content?'<div class="ps-wall-post-content">'+esc(p.content)+'</div>':'')+(image?'<img class="ps-wall-post-image" src="'+esc(image)+'" alt="Fotografija u objavi" loading="lazy">':'')+'<div class="ps-wall-post-actions"><button type="button" data-action="react" class="'+(active?'is-active':'')+'">♥ Podržavam · '+count+'</button><button type="button" data-action="focus-comment">💬 Komentiraj · '+comments.length+'</button></div><section class="ps-wall-comments" aria-label="Komentari">'+comments.map(cm=>'<div class="ps-wall-comment">'+avatar(cm.profiles?.display_name,cm.profiles?.avatar_url)+'<div class="ps-wall-comment-body"><strong>'+esc(cm.profiles?.display_name||"Član")+'</strong><p>'+esc(cm.content)+'</p><time>'+esc(formatDate(cm.created_at))+'</time></div></div>').join("")+'<form class="ps-wall-comment-form"><label class="ps-wall-sr-only">Napiši komentar</label><input name="comment" maxlength="1000" required placeholder="Napiši komentar…"><button type="submit">Pošalji</button></form></section></article>'
 }).join("");
}
async function refresh(){try{await loadBlocks();await loadPosts();say("")}catch(e){console.error(e);say("Objave se trenutačno ne mogu učitati. Ako je ovo prva instalacija, potrebno je prvo primijeniti migraciju baze podataka iz supabase/migrations.",true)}}
async function init(){
 try{
  if(!window.PatriaSoulAuth)throw new Error("Modul za korisnički račun nije učitan.");
  user=await PatriaSoulAuth.getUser();
  if(!user){say("Za pristup zidu zajednice moraš se prijaviti.");feed.innerHTML='<div class="ps-wall-empty">Zid je dostupan samo prijavljenim članovima.<br><br><a href="prijava.html?next='+encodeURIComponent("zid-zajednice.html")+'">Prijavi se</a> ili <a href="registracija.html">izradi račun</a>.</div>';return}
  const c=await db(),{data,error}=await c.from("profiles").select("id,display_name,role,avatar_url").eq("id",user.id).maybeSingle();if(error)throw error;profile=data||{};
  const name=profile.display_name||user.user_metadata?.display_name||user.email?.split("@")[0]||"Član";
  $("ps-wall-my-name").textContent=name;$("ps-wall-my-email").textContent=user.email||"";$("ps-wall-my-avatar").textContent=initials(name);
  if(profile.avatar_url)$("ps-wall-my-avatar").innerHTML='<img alt="" src="'+esc(profile.avatar_url)+'">';
  composer.hidden=false;
  await refresh();
 }catch(e){console.error(e);say(e.message||"Zid se nije mogao pokrenuti.",true);feed.innerHTML='<div class="ps-wall-empty">Provjeri vezu i pokušaj ponovno.</div>'}
}
imageInput.addEventListener("change",()=>{$("ps-wall-image-name").textContent=imageInput.files?.[0]?.name||"Bez fotografije"});
form.addEventListener("submit",async e=>{
 e.preventDefault();if(!user)return;
 const content=$("ps-wall-post-content").value.trim(),file=imageInput.files?.[0];
 if(!content&&!file){say("Upiši tekst ili odaberi fotografiju.",true);return}
 if(file){const allowed=["image/jpeg","image/png","image/webp","image/gif"];if(!allowed.includes(file.type)){say("Dopuštene su JPG, PNG, WebP ili GIF fotografije.",true);return}if(file.size>8*1024*1024){say("Fotografija je veća od dopuštenih 8 MB.",true);return}}
 submit.disabled=true;say("Objavljujem…");
 try{
  const c=await db();let image_path=null;
  if(file){const ext=({ "image/jpeg":"jpg","image/png":"png","image/webp":"webp","image/gif":"gif"})[file.type];image_path=user.id+"/posts/"+crypto.randomUUID()+"."+ext;const {error}=await c.storage.from("community-media").upload(image_path,file,{contentType:file.type,upsert:false});if(error)throw error}
  const {error}=await c.from("community_posts").insert({author_id:user.id,content,image_path,status:"published"});if(error)throw error;
  form.reset();$("ps-wall-image-name").textContent="Bez fotografije";say("Objava je dodana.");await refresh();
 }catch(err){console.error(err);say(err.message||"Objava nije spremljena. Provjeri je li migracija baze primijenjena.",true)}finally{submit.disabled=false}
});
$("ps-wall-refresh").addEventListener("click",refresh);
feed.addEventListener("click",async e=>{
 const button=e.target.closest("button[data-action]");if(!button)return;
 const article=button.closest("[data-post-id]"),id=article?.dataset.postId,p=posts.find(x=>x.id===id);if(!p)return;
 button.disabled=true;
 try{
  const c=await db(),action=button.dataset.action;
  if(action==="react"){
   const existing=(p.community_post_reactions||[]).find(r=>r.user_id===user.id);
   if(existing){const {error}=await c.from("community_post_reactions").delete().eq("id",existing.id);if(error)throw error}
   else{const {error}=await c.from("community_post_reactions").insert({post_id:id,user_id:user.id,reaction:"heart"});if(error)throw error}
   await refresh();
  }else if(action==="focus-comment"){article.querySelector('input[name="comment"]')?.focus()}
  else if(action==="report-post"){
   const reason=prompt("Zašto prijavljuješ ovu objavu? (npr. uznemiravanje, neželjeni sadržaj, povreda privatnosti)");if(!reason?.trim())return;
   const {error}=await c.from("community_post_reports").insert({reporter_id:user.id,post_id:id,reason:reason.trim().slice(0,1000)});if(error)throw error;say("Prijava je zaprimljena. Hvala što pomažeš zaštititi zajednicu.");
  }else if(action==="block-user"){
   if(!confirm("Blokirati ovog člana? Njegove objave više se neće prikazivati u tvom zidu."))return;
   const {error}=await c.from("community_user_blocks").insert({blocker_id:user.id,blocked_id:p.author_id});if(error&&error.code!=="23505")throw error;say("Član je blokiran.");await refresh();
  }else if(action==="delete-post"){
   if(!confirm("Želiš li izbrisati svoju objavu?"))return;
   const {error}=await c.from("community_posts").delete().eq("id",id).eq("author_id",user.id);if(error)throw error;say("Objava je izbrisana.");await refresh();
  }
 }catch(err){console.error(err);say(err.message||"Radnja nije uspjela. Provjeri postavke baze.",true)}finally{button.disabled=false}
});
feed.addEventListener("submit",async e=>{
 const f=e.target.closest(".ps-wall-comment-form");if(!f)return;e.preventDefault();
 const article=f.closest("[data-post-id]"),id=article.dataset.postId,input=f.elements.comment,content=input.value.trim();if(!content)return;
 const button=f.querySelector("button");button.disabled=true;
 try{const {error}=await (await db()).from("community_post_comments").insert({post_id:id,author_id:user.id,content});if(error)throw error;input.value="";await refresh()}
 catch(err){console.error(err);say(err.message||"Komentar nije spremljen. Provjeri je li migracija baze primijenjena.",true)}
 finally{button.disabled=false}
});
init();
})();