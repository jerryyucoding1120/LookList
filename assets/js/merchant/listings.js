import { sb } from '/assets/js/supabase-client.js';
import { requireUser, signOut } from '/assets/js/merchant/auth.js';

const form = document.getElementById('listing-form');
const list = document.getElementById('my-listings');
const signoutBtn = document.getElementById('signout');

main();

async function main(){
  const user = await requireUser(); if (!user) return;
  if (signoutBtn) signoutBtn.onclick = signOut;
  await refreshMyListings(user.id);

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form));
      const styles = (data.styles || '').split(',').map(s => s.trim()).filter(Boolean);
      const payload = {
        owner: user.id,
        name: data.name,
        category: data.category,
        styles,
        city: data.city || null,
        postcode: data.postcode || null,
        price_from: data.price_from ? Number(data.price_from) : null,
        description: data.description || null,
        active: data.active === 'on'
      };
      const { data: row, error } = await sb.from('listings').insert(payload).select('*').single();
      if (error) { alert(error.message); return; }
      form.reset();
      await refreshMyListings(user.id);
    });
  }
}

async function refreshMyListings(userId){
  if (list) list.innerHTML = 'Loading…';
  const { data, error } = await sb.from('listings').select('*').eq('owner', userId).order('created_at', { ascending:false });
  if (error) { list.textContent = error.message; return; }
  if (!data.length) { list.textContent = 'No listings yet. Create one above.'; return; }

  list.innerHTML = data.map(l => `
    <li>
      <div class="row">
        <b>${escape(l.name)}</b>
        <small>${escape(l.category)}</small>
        <small>${escape(l.city||'')}</small>
        <small>Active: ${l.active ? 'Yes' : 'No'}</small>
      </div>
      <div class="row">
        <button onclick="editListing('${l.id}')" class="secondary">Edit</button>
        <a href="/merchant/availability.html?listing=${l.id}" class="secondary">Manage Availability</a>
      </div>
      <details>
        <summary>Details</summary>
        <pre>${escape(JSON.stringify(l, null, 2))}</pre>
      </details>
    </li>
  `).join('');
}

window.editListing = async function(id){
  const name = prompt('New listing name (leave blank to skip)');
  const active = confirm('Mark ACTIVE? Click OK for Active, Cancel for Inactive.');
  const patch = {};
  if (name) patch.name = name;
  patch.active = active;
  const { error } = await sb.from('listings').update(patch).eq('id', id);
  if (error) { alert(error.message); return; }
  const { data: { user } } = await sb.auth.getUser();
  await refreshMyListings(user.id);
}

function escape(s){ return String(s).replace(/[&<>"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m])); }