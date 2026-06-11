// public/js/transcribe.js
(() => {
  const micBtn = document.getElementById('mic-toggle');

  let streamRef, audioCtx, processor, ws, mediaRec;
  let recording = false, silenceMark = null;

  const SILENCE_TIMEOUT = 500;               // тишина > 0.5s = конец фразы
  let VAD_THRESHOLD = 0.005;                 // стартовый порог VAD
  const NOISE_CALIBRATION_DURATION = 1000;   // калибровка шума
  const TIMESLICE_MS = 200;                  // частота чанков MediaRecorder

  const sleep = ms => new Promise(r => setTimeout(r, ms));

  function createRecorder() {
    const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : 'audio/webm';

    const rec = new MediaRecorder(streamRef, { mimeType: mime });
    let chunks = [];

    // Копим локально, НЕ отправляем по одному фрагменту
    rec.ondataavailable = e => {
      if (e.data && e.data.size) chunks.push(e.data);
    };

    rec.onstop = () => {
      // Собираем цельный WebM и отправляем пачкой
      const blob = new Blob(chunks, { type: mime });
      const filename = `segment_${Date.now()}.webm`;
      const file = new File([blob], filename, { type: mime });
      console.debug('[transcribe.js] sending file:', file.name, file.size);

      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(file);   // валидный целиковый webm
        ws.send('idle'); // маркер конца фразы
      }

      // Готовим новый цикл записи
      chunks = [];
      mediaRec = createRecorder();
      mediaRec.start(TIMESLICE_MS);
    };

    return rec;
  }

  async function startStream() {
    try {
      // 1) Микрофон
      streamRef = await navigator.mediaDevices.getUserMedia({ audio: true });

      // 2) Калибровка шума
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      await audioCtx.resume();
      console.debug('[transcribe.js] calibrating noise floor...');
      const calSrc = audioCtx.createMediaStreamSource(streamRef);
      const calProc = audioCtx.createScriptProcessor(4096, 1, 1);
      let sum = 0, count = 0;
      calProc.onaudioprocess = ({ inputBuffer }) => {
        const data = inputBuffer.getChannelData(0);
        let s = 0; for (let v of data) s += Math.abs(v);
        sum += Math.sqrt(s / data.length); count++;
      };
      calSrc.connect(calProc); calProc.connect(audioCtx.destination);
      await sleep(NOISE_CALIBRATION_DURATION);
      calProc.disconnect(); calSrc.disconnect();
      const noiseFloor = sum / Math.max(1, count);
      VAD_THRESHOLD = noiseFloor * 1.5;
      console.debug('[transcribe.js] noiseFloor=', noiseFloor.toFixed(5), 'VAD_THRESHOLD=', VAD_THRESHOLD.toFixed(5));

      // 3) WebSocket к бэку
      ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/api/transcribe/ws`);
      ws.onopen    = () => console.debug('[transcribe.js] WS open');
      ws.onerror   = e  => console.error('[transcribe.js] WS error', e);
      ws.onclose   = () => console.debug('[transcribe.js] WS closed');
      ws.onmessage = ({ data }) => {
        try {
          const { type, text } = JSON.parse(data);
          // в чат отправляем только финал
          if (type === 'final' && text && text.trim()) {
            window.sendMessage(text.trim());
          }
        } catch (e) {
          console.error('[transcribe.js] WS parse', e);
        }
      };

      // 4) VAD: на тишине — стоп рекордера (соберёт файл и отправит)
      const src = audioCtx.createMediaStreamSource(streamRef);
      processor = audioCtx.createScriptProcessor(4096, 1, 1);
      src.connect(processor); processor.connect(audioCtx.destination);
      silenceMark = null;

      processor.onaudioprocess = ({ inputBuffer }) => {
        const data = inputBuffer.getChannelData(0);
        let s = 0; for (let v of data) s += Math.abs(v);
        const rms = Math.sqrt(s / data.length);
        // console.debug('[transcribe.js][VAD] rms=', rms.toFixed(5));

        if (rms < VAD_THRESHOLD) {
          if (!silenceMark) silenceMark = Date.now();
          else if (Date.now() - silenceMark > SILENCE_TIMEOUT && recording) {
            if (mediaRec && mediaRec.state === 'recording') {
              console.debug('[transcribe.js][VAD] pause → stop recorder');
              mediaRec.stop();
            }
            silenceMark = null;
          }
        } else {
          silenceMark = null;
        }
      };

      // 5) Запускаем рекордер с таймслайсом (ускоряет завершение)
      mediaRec = createRecorder();
      mediaRec.start(TIMESLICE_MS);

      // 6) UI
      micBtn.classList.replace('mic-off', 'mic-on');
      recording = true;

    } catch (err) {
      console.error('[transcribe.js] startStream', err);
      await stopStream();
    }
  }

  async function stopStream() {
    try {
      processor?.disconnect(); processor = null;
      if (mediaRec && mediaRec.state === 'recording') mediaRec.stop();
      mediaRec = null;
      if (audioCtx) { await audioCtx.close(); audioCtx = null; }
      streamRef?.getTracks().forEach(t => t.stop()); streamRef = null;
      if (ws && ws.readyState === WebSocket.OPEN) ws.close(); ws = null;
    } catch (e) {
      console.error('[transcribe.js] stopStream', e);
    } finally {
      micBtn.classList.replace('mic-on', 'mic-off');
      recording = false;
      silenceMark = null;
    }
  }

  micBtn.addEventListener('click', () => recording ? stopStream() : startStream());
})();
