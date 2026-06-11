// avatar.js — стабильный «тимлид»-стайл: ручной старт/стоп, без автопрыжков.

(() => {
  const ENDPOINTS = {
    token:   '/api/streaming/token',
    session: '/api/streaming/session',
    start:   '/api/streaming/start',
    stop:    '/api/streaming/stop',
  };

  const elVideo  = document.getElementById('avatar-video');
  const elAudio  = document.getElementById('avatar-audio');
  const elToggle = document.getElementById('avatar-toggle');
  const elStatus = document.getElementById('avatar-status');

  let state = { enabled:false, starting:false, token:null, sessionId:null, room:null };

  function setStatus(on) {
    state.enabled = !!on;
    if (elStatus) {
      elStatus.classList.toggle('on',  on);
      elStatus.classList.toggle('off', !on);
      const txt = elStatus.querySelector('.text');
      if (txt) txt.textContent = on ? 'аватар включён' : 'аватар выключен';
    }
    if (elToggle) {
      elToggle.classList.toggle('on',  on);
      elToggle.classList.toggle('off', !on);
      elToggle.textContent = on ? 'Стоп' : 'Аватар';
      elToggle.disabled = false;
    }
  }
  function lockToggle(msg = 'Подключаю...') {
    if (!elToggle) return;
    elToggle.disabled = true;
    elToggle.textContent = msg;
  }

  async function startAvatar() {
    if (!window.AVATAR_ENABLED) return;
    if (state.starting || state.enabled) return;
    if (!window.LivekitClient || !LivekitClient.Room) {
      console.error('[Avatar] LivekitClient не загружен');
      return;
    }

    state.starting = true;
    lockToggle(elToggle?.dataset.connect || 'Подключаю...');

    try {
      const rTok = await fetch(ENDPOINTS.token, { method: 'POST' });
      if (!rTok.ok) throw new Error('token ' + rTok.status);
      const { token } = await rTok.json();

      const rSess = await fetch(`${ENDPOINTS.session}?token=${encodeURIComponent(token)}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}'
      });
      if (!rSess.ok) throw new Error('session ' + rSess.status);
      const sess = await rSess.json(); // { url, access_token, session_id }

      const rStart = await fetch(`${ENDPOINTS.start}?token=${encodeURIComponent(token)}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sess.session_id })
      });
      if (!rStart.ok) throw new Error('start ' + rStart.status);

      const room = new LivekitClient.Room({ adaptiveStream: true, dynacast: true });

      room.on(LivekitClient.RoomEvent.TrackSubscribed, (track) => {
        const mst = track?.mediaStreamTrack;
        if (!mst) return;
        if (mst.kind === 'video' && elVideo) {
          elVideo.srcObject = new MediaStream([mst]);
          elVideo.muted = true; elVideo.playsInline = true;
          elVideo.play().catch(()=>{});
        }
        if (mst.kind === 'audio' && elAudio) {
          elAudio.srcObject = new MediaStream([mst]);
          elAudio.muted = false;
          elAudio.play().catch(()=>{});
        }
      });

      room.on(LivekitClient.RoomEvent.Disconnected, () => {
        console.warn('[Avatar] Disconnected');
        cleanupMedia();
        setStatus(false);
      });

      await room.connect(sess.url, sess.access_token);

      state.token     = token;
      state.sessionId = sess.session_id;
      state.room      = room;
      setStatus(true);
    } catch (e) {
      console.error('[Avatar] start error:', e);
      setStatus(false);
      alert('Не удалось запустить аватара.');
    } finally {
      state.starting = false;
    }
  }

  async function stopAvatar() {
    lockToggle(elToggle?.dataset.disconnect || 'Отключаю...');
    try {
      try { state.room?.disconnect(); } catch {}
      if (state.token && state.sessionId) {
        await fetch(`${ENDPOINTS.stop}?token=${encodeURIComponent(state.token)}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: state.sessionId })
        }).catch(()=>{});
      }
    } finally {
      cleanupMedia();
      state = { enabled:false, starting:false, token:null, sessionId:null, room:null };
      setStatus(false);
    }
  }

  function cleanupMedia() {
    if (elVideo) { elVideo.srcObject = null; elVideo.load(); }
    if (elAudio) { elAudio.srcObject = null; elAudio.load(); }
  }

  elToggle?.addEventListener('click', () => state.enabled ? stopAvatar() : startAvatar());
  window.addEventListener('beforeunload', () => { try { state.room?.disconnect(); } catch {} });

  // Экспорт
  window.startAvatar = startAvatar;
  window.stopAvatar  = stopAvatar;
  window.avatarStream = state; // для индикатора

  setStatus(false);
})();
