// Enhances bookings.html: loads the user's bookings.
(async function () {
  const { user } = await authInit({ requireAuth: true });

  // Keep header "Sign in/Out" swap logic:
  const signInLinks = document.querySelectorAll('[data-auth="signin"]');
  if (user) {
    signInLinks.forEach(el => {
      el.textContent = 'Sign Out';
      el.onclick = (e) => { e.preventDefault(); authSignOut(); };
      el.setAttribute('href', '#');
    });
  } else {
    signInLinks.forEach(el => {
      el.textContent = 'Sign in';
      el.onclick = null;
      el.setAttribute('href', 'signin.html');
    });
    return;
  }

  const listEl = document.querySelector('.booking-list');
  const introEl = document.querySelector('.intro');
  if (!listEl) return;

  function fmtDateTime(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  }

  function createCard(b) {
    const title = b.service_name || b.title || `Booking ${b.id}`;
    const area = b.location || b.area || '';
    const status = (b.status || 'pending').toLowerCase();
    const when = b.start_time || b.scheduled_at || b.created_at;

    const card = document.createElement('section');
    card.className = 'booking-card';
    card.setAttribute('role', 'listitem');
    card.setAttribute('aria-label', `${title}`);

    const left = document.createElement('div');
    const h = document.createElement('p');
    h.className = 'booking-title';
    h.textContent = title;

    const meta = document.createElement('div');
    meta.className = 'booking-meta';
    const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);
    meta.innerHTML = `${fmtDateTime(when)}${area ? ' · ' + area : ''} · <span class="status ${status}">${statusLabel}</span>`;

    left.appendChild(h);
    left.appendChild(meta);

    const actions = document.createElement('div');
    actions.className = 'card-actions';
    const view = document.createElement('a');
    view.href = '#';
    view.className = 'btn';
    view.textContent = 'View';
    const second = document.createElement('a');
    second.href = '#';
    second.className = 'btn';
    second.textContent = status === 'pending' ? 'Cancel' : 'Reschedule';
    actions.appendChild(view);
    actions.appendChild(second);

    card.appendChild(left);
    card.appendChild(actions);
    return card;
  }

  try {
    if (introEl) introEl.textContent = 'Loading your bookings…';

    const bookings = await window.api.bookings.listMyBookings();

    // Clear demo content
    listEl.innerHTML = '';

    if (!bookings.length) {
      const empty = document.createElement('div');
      empty.className = 'intro';
      empty.textContent = 'No bookings yet.';
      listEl.appendChild(empty);
      if (introEl) introEl.textContent = '';
      return;
    }

    for (const b of bookings) {
      listEl.appendChild(createCard(b));
    }
    if (introEl) introEl.textContent = '';
  } catch (err) {
    console.error(err);
    if (introEl) introEl.textContent = 'Failed to load bookings. Please try again.';
  }
})();