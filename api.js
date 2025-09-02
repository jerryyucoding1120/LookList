/* Browser API for your Supabase data, built on top of auth.js.
   Load order in HTML:
     <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
     <script src="auth.js"></script>
     <script src="api.js"></script>
*/
(function () {
  if (!window.authClients) {
    console.error('api.js requires auth.js to be loaded first');
    return;
  }
  const { spLocal, spSession } = window.authClients;

  // Choose the client holding the session; fallback to spLocal
  async function sp() {
    try {
      const [l, s] = await Promise.all([
        spLocal.auth.getSession(),
        spSession.auth.getSession(),
      ]);
      if (l?.data?.session) return spLocal;
      if (s?.data?.session) return spSession;
      return spLocal;
    } catch {
      return spLocal;
    }
  }

  async function getCurrentUser() {
    const client = await sp();
    const { data, error } = await client.auth.getUser();
    if (error) throw error;
    return data.user ?? null;
  }

  async function getUID(required = true) {
    const u = await getCurrentUser();
    if (!u && required) throw new Error('Not authenticated');
    return u?.id ?? null;
  }

  function handle({ data, error }) {
    if (error) throw error;
    return data;
  }

  // BOOKINGS
  async function listMyBookings() {
    const client = await sp();
    const uid = await getUID();
    const q = client
      .from('bookings')
      .select('*')
      .or(`customer_id.eq.${uid},merchant_id.eq.${uid}`)
      .order('created_at', { ascending: false });
    return handle(await q);
  }

  // THREADS
  async function listMyThreads() {
    const client = await sp();
    const uid = await getUID();
    const q = client
      .from('threads')
      .select('*')
      .or(`customer_id.eq.${uid},merchant_id.eq.${uid}`)
      .order('created_at', { ascending: false });
    return handle(await q);
  }

  // MESSAGES
  async function listThreadMessages(threadId) {
    const client = await sp();
    const q = client
      .from('messages')
      .select('*')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true });
    return handle(await q);
  }

  async function listLastMessagesForThreads(threadIds) {
    if (!threadIds?.length) return [];
    const client = await sp();
    const q = client
      .from('messages')
      .select('id, thread_id, body, sender_id, created_at')
      .in('thread_id', threadIds)
      .order('created_at', { ascending: false });
    return handle(await q);
  }

  async function sendMessage(threadId, body) {
    const client = await sp();
    const uid = await getUID();
    const payload = { thread_id: threadId, sender_id: uid, body };
    const q = client.from('messages').insert(payload).select().single();
    return handle(await q);
  }

  function subscribeToThreadMessages(threadId, onInsert) {
    const client = spLocal; // channel can be static
    const channel = client.channel(`messages-thread-${threadId}`);
    channel.on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `thread_id=eq.${threadId}` },
      (payload) => onInsert?.(payload.new)
    );
    channel.subscribe();
    return () => client.removeChannel(channel);
  }

  // PROFILES
  async function getProfile(userId) {
    const client = await sp();
    const q = client.from('profiles').select('*').eq('id', userId).single();
    return handle(await q);
  }

  async function getProfilesMany(ids) {
    if (!ids?.length) return [];
    const client = await sp();
    const q = client.from('profiles').select('id, full_name, username').in('id', ids);
    return handle(await q);
  }

  // Export
  window.api = {
    me: { getCurrentUser, getUID },
    bookings: { listMyBookings },
    threads: { listMyThreads },
    messages: { listThreadMessages, listLastMessagesForThreads, sendMessage, subscribeToThreadMessages },
    profiles: { getProfile, getMany: getProfilesMany },
  };
})();