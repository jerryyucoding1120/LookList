import { sb } from '/assets/js/supabase-client.js';
import { requireUser, signOut } from '/assets/js/merchant/auth.js';

const params = new URLSearchParams(location.search);
const listingId = params.get('listing');

const form = document.getElementById('slot-form');
const list = document.getElementById('slot-list');
const signoutBtn = document.getElementById('signout');

main();

async function main(){
  const user = await requireUser(); if (!user) return;
  if (signoutBtn) signoutBtn.onclick = signOut;
  if (!listingId){ document.querySelector('main').innerHTML='<p>Missing ?listing=ID</p>'; return; }
  await refreshSlots();
  if (form) form.addEventListener('submit', onSubmit);
}

async function onSubmit(e){
  e.preventDefault();
  const data = Object.fromEntries(new FormData(form));
  const payload = {
    listing_id: listingId,
    label: data.label || null,
    date: data.date,
    start_time: data.start_time,
    end_time: data.end_time,
    price: Number(data.price || 0),
    capacity: Number(data.capacity || 1)
  };
  const { error } = await sb.from('availability').insert(payload);
  if (error) { alert(error.message); return; }
  form.reset();
  await refreshSlots();
}

async function refreshSlots(){
  if (list) list.innerHTML = 'Loading…';
  const { data, error } = await sb.from('availability').select('*').eq('listing_id', listingId).order('date');
  if (error) { list.textContent = error.message; return; }
  if (!data.length) { list.textContent = 'No slots yet.'; return; }

  list.innerHTML = data.map(s => `
    <li>
      <div class="row">
        <b>${s.date}</b> ${s.start_time}–${s.end_time}
        <small>£${s.price}</small>
        <small>${escape(s.label||'')}</small>
        <small>Cap ${s.capacity} · Booked ${s.booked_count}</small>
      </div>
      <div class="row">
        <button onclick="del('${s.id}')" class="secondary">Delete</button>
      </div>
    </li>
  `).join('');
}

window.del = async function(id){
  if (!confirm('Delete this slot?')) return;
  const { error } = await sb.from('availability').delete().eq('id', id);
  if (error) { alert(error.message); return; }
  await refreshSlots();
}

function escape(s){ return String(s).replace(/[&<>"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m])); }