// Enhances messages.html: loads the user's threads with the last message snippet.
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

  const listEl = document.querySelector('.thread-list');
  const noteEl = document.querySelector('.note');
  if (!listEl) return;

  function fmtDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  function textSnippet(s, n = 90) {
    if (!s) return '';
    const t = String(s).trim().replace(/\s+/g, ' ');
    return t.length > n ? t.slice(0, n - 1) + '…' : t;
  }

  try {
    if (noteEl) noteEl.textContent = 'Loading your conversations…';

    // 1) Fetch my threads
    const threads = await window.api.threads.listMyThreads();
    const myId = user.id;

    // 2) Load last messages for those threads in one query
    const threadIds = threads.map(t => t.id);
    const msgs = threadIds.length
      ? await window.api.messages.listLastMessagesForThreads(threadIds)
      : [];

    // Reduce to last message per thread_id
    const lastByThread = new Map();
    for (const m of msgs) {
      if (!lastByThread.has(m.thread_id)) {
        lastByThread.set(m.thread_id, m);
      }
    }

    // 3) Get the "other" user profile per thread
    const otherIds = Array.from(
      new Set(
        threads
          .map(t => (t.customer_id === myId ? t.merchant_id : t.customer_id))
          .filter(Boolean)
      )
    );
    const profiles = otherIds.length ? await window.api.profiles.getMany(otherIds) : [];
    const profileMap = new Map(profiles.map(p => [p.id, p]));

    // Clear sample items
    listEl.innerHTML = '';
    if (noteEl) noteEl.textContent = '';

    if (!threads.length) {
      const empty = document.createElement('div');
      empty.className = 'note';
      empty.textContent = 'No conversations yet.';
      listEl.appendChild(empty);
      return;
    }

    for (const t of threads) {
      const last = lastByThread.get(t.id) || null;
      const otherId = t.customer_id === myId ? t.merchant_id : t.customer_id;
      const other = profileMap.get(otherId);
      const displayName =
        other?.full_name ||
        other?.name ||
        other?.username ||
        other?.display_name ||
        'Conversation';

      const a = document.createElement('a');
      a.href = '#';
      a.className = 'thread';
      a.setAttribute('role', 'listitem');
      a.setAttribute('aria-label', `Chat with ${displayName}`);

      const img = document.createElement('img');
      img.className = 'avatar';
      img.src = 'assets/profile.png';
      img.alt = '';
      img.setAttribute('aria-hidden', 'true');

      const textWrap = document.createElement('div');

      const title = document.createElement('p');
      title.className = 'thread-title';
      title.textContent = displayName;

      const snippet = document.createElement('p');
      snippet.className = 'thread-snippet';
      snippet.textContent = last ? textSnippet(last.body) : 'No messages yet.';

      textWrap.appendChild(title);
      textWrap.appendChild(snippet);

      const meta = document.createElement('div');
      meta.className = 'thread-meta';
      meta.textContent = last ? fmtDate(last.created_at) : fmtDate(t.created_at);

      a.appendChild(img);
      a.appendChild(textWrap);
      a.appendChild(meta);

      a.addEventListener('click', (e) => {
        e.preventDefault();
        alert(`Open thread ${t.id} (detail view not implemented yet).`);
      });

      listEl.appendChild(a);
    }
  } catch (err) {
    console.error(err);
    if (noteEl) noteEl.textContent = 'Failed to load messages. Please try again.';
  }
})();