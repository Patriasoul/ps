(()=>{"use strict";
const root=document.getElementById("ps-wall");if(!root||root.dataset.ready)return;root.dataset.ready="1";
const $=id=>document.getElementById(id),status=$("ps-wall-status"),feed=$("ps-wall-feed"),composer=$("ps-wall-composer"),form=$("ps-wall-post-form"),submit=$("ps-wall-post-submit"),imageInput=$("ps-wall-post-image");
let client=null,user=null,profile=null,blocks=new Set(),posts=[];
const linkMetaCache=new Map();
let emojiPickerModule=null,emojiDataModule=null;
async function loadEmojiPicker(){
 if(!emojiPickerModule)emojiPickerModule=import("https://esm.sh/emoji-mart@5.6.0?bundle");
 if(!emojiDataModule)emojiDataModule=import("https://esm.sh/@emoji-mart/data@1.2.1?bundle");
 const [pickerModule,dataModule]=await Promise.all([emojiPickerModule,emojiDataModule]);
 return {Picker:pickerModule.Picker,data:dataModule.default||dataModule};
}
function insertAtCursor(input,value){
 const start=input.selectionStart??input.value.length,end=input.selectionEnd??input.value.length;
 input.setRangeText(value,start,end,"end");input.focus();
}
async function toggleEmojiPicker(button,input){
 const existing=button.parentElement.querySelector(".ps-wall-emoji-popover");
 if(existing){existing.remove();button.setAttribute("aria-expanded","false");return}
 document.querySelectorAll(".ps-wall-emoji-popover").forEach(el=>el.remove());
 document.querySelectorAll('[data-action="post-emoji-picker"],[data-action="comment-emoji-picker"]').forEach(el=>el.setAttribute("aria-expanded","false"));
 const popover=document.createElement("div");popover.className="ps-wall-emoji-popover";popover.setAttribute("role","dialog");popover.setAttribute("aria-label","Odaberi emoji");
 button.parentElement.classList.add("ps-wall-emoji-anchor");button.parentElement.append(popover);button.setAttribute("aria-expanded","true");
 popover.textContent="Učitavam emoji…";
 try{
  const {Picker,data}=await loadEmojiPicker();
  if(!popover.isConnected)return;
  const picker=new Picker({data,onEmojiSelect:emoji=>{insertAtCursor(input,emoji.native);popover.remove();button.setAttribute("aria-expanded","false")},locale:"en",theme:"dark",previewPosition:"none",skinTonePosition:"none"});
  popover.replaceChildren(picker);
 }catch(error){console.error("Emoji Mart se nije mogao učitati:",error);popover.textContent="Emoji se trenutačno ne mogu učitati. Pokušaj ponovno."}
}
const esc=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const initials=name=>String(name||"PS").trim().split(/\s+/).slice(0,2).map(s=>s[0]||"").join("").toUpperCase();
const say=(message,error=false)=>{status.textContent=message||"";status.classList.toggle("is-error",!!error);status.hidden=!message};
const db=async()=>{if(client)return client;client=await PatriaSoulAuth.client();return client};
const isAdmin=()=>["admin","editor"].includes(profile?.role);
const formatDate=value=>{try{return new Intl.DateTimeFormat("hr-HR",{dateStyle:"medium",timeStyle:"short"}).format(new Date(value))}catch{return ""}};
function avatar(name,url){return url?'<div class="ps-wall-avatar"><img alt="" src="'+esc(url)+'"></div>':'<div class="ps-wall-avatar" aria-hidden="true">'+esc(initials(name))+'</div>'}
async function signedImage(path){if(!path)return "";try{const {data,error}=await (await db()).storage.from("community-media").createSignedUrl(path,1800);return error?"":data?.signedUrl||""}catch{return ""}}
function hostOf(url){try{return new URL(url).hostname.replace(/^www\./,"")}catch{return ""}}
async function fetchLinkMeta(url,manualTitle=""){
 if(!url)return null;
 if(linkMetaCache.has(url))return linkMetaCache.get(url);
 const task=(async()=>{
  const host=hostOf(url);
  try{
   const parsed=new URL(url);
   if(/(^|\.)wikipedia\.org$/i.test(parsed.hostname)&&parsed.pathname.startsWith("/wiki/")){
    const page=decodeURIComponent(parsed.pathname.slice(6)).replace(/_/g," ");
    const response=await fetch("https://"+parsed.hostname+"/api/rest_v1/page/summary/"+encodeURIComponent(page),{headers:{Accept:"application/json"}});
    if(response.ok){const data=await response.json();return {title:manualTitle||data.title||page,description:data.extract||"",image:data.thumbnail?.source||data.originalimage?.source||"",site:host}}
   }
   const response=await fetch("https://api.microlink.io/?url="+encodeURIComponent(url)+"&meta=true&screenshot=false",{headers:{Accept:"application/json"}});
   if(response.ok){const payload=await response.json(),data=payload?.data||{};if(payload.status==="success"||data.title||data.description||data.image?.url)return {title:manualTitle||data.title||host,description:data.description||"",image:data.image?.url||"",site:data.publisher||host}}
  }catch(err){console.debug("Link preview unavailable",host,err)}
  return {title:manualTitle||host||url,description:"",image:"",site:host};
 })();
 linkMetaCache.set(url,task);return task;
}
function linkCard(url,manualTitle,meta){
 const title=manualTitle||meta?.title||hostOf(url)||url;
 const image=meta?.image?'<img class="ps-wall-link-image" src="'+esc(meta.image)+'" alt="" loading="lazy" referrerpolicy="no-referrer">':"";
 const description=meta?.description?'<p class="ps-wall-link-description">'+esc(meta.description.slice(0,360))+'</p>':"";
 return '<a class="ps-wall-link-card" href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">'+image+'<span>'+esc(meta?.site||hostOf(url)||"POVEZNICA")+'</span><strong>'+esc(title)+'</strong>'+description+'<small>Otvori izvor ↗</small></a>';
}
function updateComposerPreview(){
 const urlInput=$("ps-wall-link-url"),titleInput=$("ps-wall-link-title"),preview=$("ps-wall-link-preview");if(!urlInput||!preview)return;
 const url=urlInput.value.trim();if(!url){preview.hidden=true;preview.innerHTML="";return}
 let parsed;try{parsed=new URL(url);if(parsed.protocol!=="https:")throw Error("https")}catch{preview.hidden=true;preview.innerHTML="";return}
 preview.hidden=false;preview.innerHTML='<div class="ps-wall-link-preview-loading">Dohvaćam naslov, sliku i opis poveznice…</div>';
 fetchLinkMeta(parsed.href,titleInput?.value.trim()||"").then(meta=>{if(urlInput.value.trim()!==url)return;preview.innerHTML=linkCard(parsed.href,titleInput?.value.trim(),meta)}).catch(()=>{preview.innerHTML=linkCard(parsed.href,titleInput?.value.trim(),null)});
}
async function loadBlocks(){const {data,error}=await (await db()).from("community_user_blocks").select("blocked_id").eq("blocker_id",user.id);if(error)throw error;blocks=new Set((data||[]).map(x=>x.blocked_id))}
async function loadPosts(){
 feed.innerHTML='<div class="ps-wall-empty">Učitavam objave…</div>';
 const c=await db();
 const {data,error}=await c.from("community_posts").select("id,author_id,content,image_path,link_url,link_title,link_type,status,created_at,updated_at,profiles!community_posts_author_id_fkey(display_name,avatar_url),community_post_reactions(id,user_id,reaction),community_post_comments(id,post_id,parent_comment_id,author_id,content,image_path,created_at,profiles!community_post_comments_author_id_fkey(display_name,avatar_url),community_comment_reactions(id,user_id,reaction))").eq("status","published").order("created_at",{ascending:false}).limit(40);
 if(error)throw error;
 posts=(data||[]).filter(p=>!blocks.has(p.author_id));
 if(!posts.length){feed.innerHTML='<div class="ps-wall-empty">Još nema objava. Budi među prvima koji će podijeliti priču sa zajednicom.</div>';return}
 const enriched=await Promise.all(posts.map(async p=>({p,image:await signedImage(p.image_path),linkMeta:p.link_url?await fetchLinkMeta(p.link_url,p.link_title||""):null,comments:await Promise.all((p.community_post_comments||[]).map(async cm=>({...cm,imageUrl:await signedImage(cm.image_path)})))})));
 feed.innerHTML=enriched.map(({p,image,linkMeta,comments})=>{
  const name=p.profiles?.display_name||"Član zajednice",mine=p.author_id===user.id,rx=p.community_post_reactions||[],sorted=comments.sort((a,b)=>new Date(a.created_at)-new Date(b.created_at)),count=rx.length,active=rx.some(r=>r.user_id===user.id);
  const renderComment=cm=>{const cr=cm.community_comment_reactions||[],liked=cr.some(r=>r.user_id===user.id),replies=sorted.filter(x=>x.parent_comment_id===cm.id);return '<div class="ps-wall-comment'+(cm.parent_comment_id?' ps-wall-comment-reply':'')+'" data-comment-id="'+esc(cm.id)+'">'+avatar(cm.profiles?.display_name,cm.profiles?.avatar_url)+'<div class="ps-wall-comment-body"><a class="ps-wall-profile-link" href="profil.html?id='+encodeURIComponent(cm.author_id)+'"><strong>'+esc(cm.profiles?.display_name||"Član")+'</strong></a><p>'+esc(cm.content)+'</p>'+(cm.imageUrl?'<a href="'+esc(cm.imageUrl)+'" target="_blank" rel="noopener"><img class="ps-wall-comment-image" src="'+esc(cm.imageUrl)+'" alt="Fotografija u komentaru" loading="lazy"></a>':'')+'<time>'+esc(formatDate(cm.created_at))+'</time><div class="ps-wall-comment-actions"><button type="button" data-action="like-comment" class="'+(liked?'is-active':'')+'">♥ Sviđa mi se · '+cr.length+'</button><button type="button" data-action="reply-comment">↩ Odgovori</button>'+(cm.author_id===user.id?'<button type="button" class="ps-wall-comment-delete" data-action="delete-comment">Izbriši</button>':'')+'</div></div></div>'+replies.map(renderComment).join("")};
  const topComments=sorted.filter(cm=>!cm.parent_comment_id);
  return '<article class="ps-wall-post" data-post-id="'+esc(p.id)+'"><header class="ps-wall-post-head">'+avatar(name,p.profiles?.avatar_url)+'<div class="ps-wall-post-author"><a class="ps-wall-profile-link" href="profil.html?id='+encodeURIComponent(p.author_id)+'"><strong>'+esc(name)+'</strong></a><time datetime="'+esc(p.created_at)+'">'+esc(formatDate(p.created_at))+'</time></div><div class="ps-wall-post-menu">'+(mine?'<button type="button" data-action="delete-post">Izbriši</button>':'<button type="button" data-action="report-post">Prijavi</button><button type="button" data-action="block-user">Blokiraj</button>')+'</div></header>'+(p.content?'<div class="ps-wall-post-content">'+esc(p.content)+'</div>':'')+(image?'<img class="ps-wall-post-image" src="'+esc(image)+'" alt="Fotografija u objavi" loading="lazy">':'')+(p.link_url?linkCard(p.link_url,p.link_title,linkMeta):"")+'<div class="ps-wall-post-actions"><button type="button" data-action="react" class="'+(active?'is-active':'')+'">♥ Podržavam · '+count+'</button><button type="button" data-action="focus-comment">💬 Komentiraj · '+comments.length+'</button></div><section class="ps-wall-comments" aria-label="Komentari">'+topComments.map(renderComment).join("")+'<form class="ps-wall-comment-form" enctype="multipart/form-data"><input type="hidden" name="parent_comment_id" value=""><textarea name="comment" maxlength="1000" rows="2" placeholder="Napiši komentar…"></textarea><div class="ps-wall-comment-tools"><label class="ps-wall-comment-upload">📷 Slika<input type="file" name="comment_image" accept="image/jpeg,image/png,image/webp,image/gif"></label><button type="button" data-action="comment-emoji" data-emoji="❤️">❤️</button><button type="button" data-action="comment-emoji" data-emoji="😊">😊</button><button type="button" data-action="comment-emoji" data-emoji="🇭🇷">🇭🇷</button><button type="button" class="ps-wall-emoji-button" data-action="comment-emoji-picker" aria-expanded="false" aria-label="Odaberi emoji">😀 Emoji</button><button type="button" data-action="comment-mention">@ Označi</button><span class="ps-wall-comment-file-name">Bez fotografije</span><button type="submit">Pošalji</button></div><p class="ps-wall-replying" hidden>Odgovaraš na komentar <button type="button" data-action="cancel-reply">Odustani</button></p></form></section></article>'
 }).join("");
}
async function refresh(){try{await loadBlocks();await loadPosts();say("")}catch(e){console.error("PatriaSoul zid — greška pri učitavanju:",e);const detail=e?.message||e?.details||e?.hint||"Nepoznata greška";say("Objave se trenutačno ne mogu učitati. Detalj: "+detail,true)}}
async function init(){
 try{
  if(!window.PatriaSoulAuth)throw new Error("Modul za korisnički račun nije učitan.");
  user=await PatriaSoulAuth.getUser();
  if(!user){say("Za pristup zidu zajednice moraš se prijaviti.");feed.innerHTML='<div class="ps-wall-empty">Zid je dostupan samo prijavljenim članovima.<br><br><a href="prijava.html?next='+encodeURIComponent("zid-zajednice.html"+location.search)+'">Prijavi se</a> ili <a href="registracija.html">izradi račun</a>.</div>';return}
  const c=await db(),{data,error}=await c.from("profiles").select("id,display_name,role,avatar_url").eq("id",user.id).maybeSingle();if(error)throw error;profile=data||{};
  const name=profile.display_name||user.user_metadata?.display_name||user.email?.split("@")[0]||"Član";
  $("ps-wall-my-name").textContent=name;$("ps-wall-my-email").textContent=user.email||"";$("ps-wall-my-avatar").textContent=initials(name);
  if(profile.avatar_url)$("ps-wall-my-avatar").innerHTML='<img alt="" src="'+esc(profile.avatar_url)+'">';
  composer.hidden=false;
  const shareParams=new URLSearchParams(location.search),shareUrl=shareParams.get("shareUrl");
  if(shareUrl){
   $("ps-wall-link-url").value=shareUrl;
   $("ps-wall-link-title").value=shareParams.get("shareTitle")||"";
   
   $("ps-wall-post-content").value=shareParams.get("shareText")||"";
  }
  $("ps-wall-link-url").addEventListener("change",updateComposerPreview);
  $("ps-wall-link-title").addEventListener("change",updateComposerPreview);
  $("ps-wall-link-url").addEventListener("paste",()=>setTimeout(updateComposerPreview,0));
  if(shareUrl)updateComposerPreview();
  await refresh();
 }catch(e){console.error(e);say(e.message||"Zid se nije mogao pokrenuti.",true);feed.innerHTML='<div class="ps-wall-empty">Provjeri vezu i pokušaj ponovno.</div>'}
}
imageInput.addEventListener("change",()=>{$("ps-wall-image-name").textContent=imageInput.files?.[0]?.name||"Bez fotografije"});
composer.addEventListener("click",async e=>{const button=e.target.closest('[data-action="post-emoji-picker"]');if(!button)return;await toggleEmojiPicker(button,$("ps-wall-post-content"))});
form.addEventListener("submit",async e=>{
 e.preventDefault();if(!user)return;
 const content=$("ps-wall-post-content").value.trim(),file=imageInput.files?.[0],rawLink=$("ps-wall-link-url").value.trim(),linkTitle=$("ps-wall-link-title").value.trim();
 let link_url=null;
 if(rawLink){try{const parsed=new URL(rawLink);
  if(parsed.protocol!=="https:"){say("Radi sigurnosti dopuštene su samo HTTPS poveznice.",true);return}
  link_url=parsed.href;
 }catch{say("Upiši ispravnu poveznicu.",true);return}}
 if(!content&&!file&&!link_url){say("Upiši tekst, odaberi fotografiju ili dodaj poveznicu.",true);return}
 if(file){const allowed=["image/jpeg","image/png","image/webp","image/gif"];if(!allowed.includes(file.type)){say("Dopuštene su JPG, PNG, WebP ili GIF fotografije.",true);return}if(file.size>8*1024*1024){say("Fotografija je veća od dopuštenih 8 MB.",true);return}}
 submit.disabled=true;say("Objavljujem…");
 try{
  const c=await db();let image_path=null;
  if(file){const ext=({ "image/jpeg":"jpg","image/png":"png","image/webp":"webp","image/gif":"gif"})[file.type];image_path=user.id+"/posts/"+crypto.randomUUID()+"."+ext;const {error}=await c.storage.from("community-media").upload(image_path,file,{contentType:file.type,upsert:false});if(error)throw error}
  const {error}=await c.from("community_posts").insert({author_id:user.id,content,image_path,link_url,link_title:linkTitle||null,link_type:"link",status:"published"});if(error)throw error;
  form.reset();$("ps-wall-image-name").textContent="Bez fotografije";updateComposerPreview();say("Objava je dodana.");await refresh();
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
  }else if(action==="focus-comment"){article.querySelector('textarea[name="comment"]')?.focus()}
   else if(action==="like-comment"){const cmEl=button.closest("[data-comment-id]"),cmId=cmEl?.dataset.commentId,cm=(p.community_post_comments||[]).find(x=>x.id===cmId),existing=(cm?.community_comment_reactions||[]).find(r=>r.user_id===user.id);if(!cm)throw Error("Komentar nije pronađen.");if(existing){const {error}=await c.from("community_comment_reactions").delete().eq("id",existing.id);if(error)throw error}else{const {error}=await c.from("community_comment_reactions").insert({comment_id:cmId,user_id:user.id,reaction:"heart"});if(error)throw error}await refresh();
   }else if(action==="reply-comment"){const cmEl=button.closest("[data-comment-id]"),f=article.querySelector(".ps-wall-comment-form");f.elements.parent_comment_id.value=cmEl?.dataset.commentId||"";f.querySelector(".ps-wall-replying").hidden=false;f.querySelector("textarea[name=comment]").placeholder="Napiši odgovor…";f.querySelector("textarea[name=comment]").focus();
   }else if(action==="cancel-reply"){const f=button.closest(".ps-wall-comment-form");f.elements.parent_comment_id.value="";f.querySelector(".ps-wall-replying").hidden=true;f.querySelector("textarea[name=comment]").placeholder="Napiši komentar…";
   }else if(action==="comment-emoji"){const f=button.closest(".ps-wall-comment-form"),input=f.querySelector("textarea[name=comment]");insertAtCursor(input,button.dataset.emoji);
   }else if(action==="comment-emoji-picker"){const f=button.closest(".ps-wall-comment-form"),input=f.querySelector("textarea[name=comment]");await toggleEmojiPicker(button,input);
   }else if(action==="comment-mention"){const f=button.closest(".ps-wall-comment-form"),input=f.querySelector("textarea[name=comment]");input.setRangeText("@",input.selectionStart,input.selectionEnd,"end");input.focus()}
  else if(action==="report-post"){
   const reason=prompt("Zašto prijavljuješ ovu objavu? (upiši barem 3 znaka; npr. uznemiravanje, neželjeni sadržaj, povreda privatnosti)");if(!reason?.trim())return;const cleanReason=reason.trim().slice(0,1000);if(cleanReason.length<3){say("Razlog prijave mora sadržavati barem 3 znaka.",true);return;}
   const {error}=await c.from("community_post_reports").insert({reporter_id:user.id,post_id:id,reason:cleanReason});if(error)throw error;say("Prijava je zaprimljena. Hvala što pomažeš zaštititi zajednicu.");
  }else if(action==="block-user"){
   if(!confirm("Blokirati ovog člana? Njegove objave više se neće prikazivati u tvom zidu."))return;
   const {error}=await c.from("community_user_blocks").insert({blocker_id:user.id,blocked_id:p.author_id});if(error&&error.code!=="23505")throw error;say("Član je blokiran.");await refresh();
  }else if(action==="delete-post"){
   if(p.author_id!==user.id)throw Error("Možeš izbrisati samo vlastitu objavu.");
   if(!confirm("Izbrisati svoju objavu, fotografiju i komentare ispod nje? Radnja se ne može poništiti."))return;
   const {error}=await c.from("community_posts").delete().eq("id",id).eq("author_id",user.id);if(error)throw error;
   if(p.image_path){const {error:imageError}=await c.storage.from("community-media").remove([p.image_path]);if(imageError)console.warn("Objava izbrisana, ali fotografiju nije bilo moguće ukloniti iz pohrane.",imageError)}
   say("Objava i pripadajući komentari su izbrisani.");await refresh();
  }else if(action==="delete-comment"){
   const commentEl=e.target.closest("[data-comment-id]"),commentId=commentEl?.dataset.commentId,comment=(p.community_post_comments||[]).find(x=>x.id===commentId);
   if(!comment||comment.author_id!==user.id)throw Error("Možeš izbrisati samo vlastiti komentar.");
   if(!confirm("Izbrisati svoj komentar?"))return;
   const {error}=await c.from("community_post_comments").delete().eq("id",commentId).eq("author_id",user.id);if(error)throw error;say("Komentar je izbrisan.");await refresh();
  }
 }catch(err){console.error(err);say(err.message||"Radnja nije uspjela. Provjeri postavke baze.",true)}finally{button.disabled=false}
});
feed.addEventListener("change",e=>{const file=e.target.closest('input[name="comment_image"]');if(file)file.closest(".ps-wall-comment-form").querySelector(".ps-wall-comment-file-name").textContent=file.files?.[0]?.name||"Bez fotografije"});
feed.addEventListener("submit",async e=>{
 const f=e.target.closest(".ps-wall-comment-form");if(!f)return;e.preventDefault();
 const article=f.closest("[data-post-id]"),id=article.dataset.postId,input=f.elements.comment,content=input.value.trim(),file=f.elements.comment_image.files?.[0],parentId=f.elements.parent_comment_id.value||null;if(!content&&!file)return;
 const button=f.querySelector('button[type="submit"]');button.disabled=true;
 if(file&&(!["image/jpeg","image/png","image/webp","image/gif"].includes(file.type)||file.size>8*1024*1024)){say("Odaberi JPG, PNG, WebP ili GIF fotografiju do 8 MB.",true);button.disabled=false;return}
 try{const c=await db();let image_path=null;if(file){const ext=({"image/jpeg":"jpg","image/png":"png","image/webp":"webp","image/gif":"gif"})[file.type];image_path=user.id+"/comments/"+crypto.randomUUID()+"."+ext;const {error:uploadError}=await c.storage.from("community-media").upload(image_path,file,{contentType:file.type,upsert:false});if(uploadError)throw uploadError}
  const {error}=await c.from("community_post_comments").insert({post_id:id,author_id:user.id,content:content||" ",image_path,parent_comment_id:parentId});if(error)throw error;f.reset();f.elements.parent_comment_id.value="";f.querySelector(".ps-wall-replying").hidden=true;f.querySelector("textarea[name=comment]").placeholder="Napiši komentar…";f.querySelector(".ps-wall-comment-file-name").textContent="Bez fotografije";await refresh()}
 catch(err){console.error(err);say(err.message||"Komentar nije spremljen. Provjeri je li migracija baze primijenjena.",true)}
 finally{button.disabled=false}
});

init();
})();