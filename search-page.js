import { sb } from "./supabase-client.js";

const params = new URLSearchParams(location.search);
const state = { category: params.get("category") || "", q:"", style:"", loc:"" };
const $pills = document.getElementById("active-filters");
const $q = document.getElementById("q");
const $loc = document.getElementById("loc");
const $style = document.getElementById("style");
const $out = document.getElementById("results");

init();

function init(){
  renderPills();
  $q.addEventListener("input", d(()=>{state.q=$q.value.trim(); fetchRows();},250));
  $loc.addEventListener("change",()=>{state.loc=$loc.value.trim(); fetchRows();});
  $style.addEventListener("change",()=>{state.style=$style.value; fetchRows();});
  fetchRows();
}

function renderPills(){
  $pills.innerHTML="";
  Object.entries(state).forEach(([k,v])=>{
    if(!v) return;
    const b=document.createElement("button");
    b.className="pill";
    b.textContent=`${v} ✕`;
    b.onclick=()=>{state[k]=""; renderPills(); fetchRows();};
    $pills.appendChild(b);
  });
}

async function fetchRows(){
  $out.textContent="Loading…";
  let q = sb.from("listings").select("*").eq("active", true).limit(50);
  if(state.category) q=q.eq("category",state.category);
  if(state.style) q=q.contains("styles",[state.style]);
  if(state.q) q=q.or(`name.ilike.%${state.q}%,description.ilike.%${state.q}%`);
  if(state.loc) q=q.or(`city.ilike.%${state.loc}%,postcode.ilike.%${state.loc}%`);
  const { data, error } = await q;
  if (error){ $out.textContent = error.message; return; }
  if(!data||!data.length){ $out.textContent="No matches yet."; return; }
  $out.innerHTML = data.map(rowToCard).join("");
  renderPills();
}

function rowToCard(x){
  const url=`listing.html?id=${x.id}&category=${encodeURIComponent(state.category)}`;
  const rating=x.rating ?? "–";
  const city=x.city || "";
  const price=x.price_from ?? "—";
  return `<article class="card">
    <div class="card__top"><h3>${escapeHTML(x.name)}</h3><div>⭐ ${rating}</div></div>
    <div class="card__meta">${cap(x.category)} · ${escapeHTML(city)} · from £${price}</div>
    <button class="btn" onclick="location.href='${url}'">Book</button>
  </article>`;
}

function d(fn,ms){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a),ms);} }
function cap(s){ return s? s[0].toUpperCase()+s.slice(1): s; }
function escapeHTML(s){ return (s||"").replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }