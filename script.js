(function(){
	const STREAM_URL = 'https://radio.enzomtp.party/listen/enzomtps_radio/radio.mp3';
	const NOWPLAYING_URL = 'https://radio.enzomtp.party/api/nowplaying/enzomtps_radio';
	const STARTUP_GRACE_MS = 15000; // allow initial buffering time before judging stall
	const STALL_AFTER_PLAYING_MS = 6000;
	const BACKOFF_STEPS_MS = [1000, 2000, 4000, 8000];

	
	const el = {
		player: document.getElementById('player'),
		art: document.getElementById('art'),
		title: document.getElementById('title'),
		artist: document.getElementById('artist'),
		status: document.getElementById('status'),
		listeners: document.getElementById('listeners'),
		progress: document.getElementById('progress'),
		progressBar: document.getElementById('progressBar'),
		timecode: document.getElementById('timecode'),
	};

	
	el.player.crossOrigin = 'anonymous';
	el.player.preload = 'auto';
	el.player.src = bust(STREAM_URL);

	
	el.player.muted = false;
	el.player.volume = 1.0;

	
		async function ensurePlaying() {
		try {
				if (el.player.networkState === HTMLMediaElement.NETWORK_EMPTY) {
					el.player.load();
				}
				if (el.player.paused || el.player.readyState < HTMLMediaElement.HAVE_FUTURE_DATA) {
					await el.player.play();
				}
			setStatus('Live');
		} catch (e) {
			
			setStatus('Waiting…');
		}
	}

	
	function bust(url){
		const u = new URL(url);
		u.searchParams.set('_t', Date.now().toString());
		return u.toString();
	}

	
	function setStatus(text){
		el.status.textContent = text;
	}

	
		let reconnectTimer = null;
		let reconnectAttempts = 0;
		let lastSrcSetTs = Date.now();
		let hadFirstPlaying = false;
		function nextBackoff(){
			const idx = Math.min(reconnectAttempts, BACKOFF_STEPS_MS.length - 1);
			return BACKOFF_STEPS_MS[idx];
		}
		function scheduleReconnect(delayMs){
			const ms = typeof delayMs === 'number' ? delayMs : nextBackoff();
		clearTimeout(reconnectTimer);
			reconnectTimer = setTimeout(()=>{
				setStatus('Reconnecting…');
				el.player.pause();
				
				el.player.src = bust(STREAM_URL);
				el.player.load();
				
				lastSrcSetTs = Date.now();
				hadFirstPlaying = false;
				reconnectAttempts++;
				
				setTimeout(()=>{ ensurePlaying(); }, 150);
			}, ms);
	}

	
		let lastTime = 0, lastProgressTs = Date.now();
	setInterval(()=>{
		const ct = el.player.currentTime;
		if (!isFinite(ct)) return;
		if (ct > lastTime + 0.01) {
			lastProgressTs = Date.now();
			lastTime = ct;
				
				
			return;
		}
			
			const sinceProgress = Date.now() - lastProgressTs;
			const sinceSrcSet = Date.now() - lastSrcSetTs;
			const threshold = hadFirstPlaying ? STALL_AFTER_PLAYING_MS : STARTUP_GRACE_MS;
			if (sinceProgress > threshold && sinceSrcSet > threshold) {
				scheduleReconnect();
				lastProgressTs = Date.now();
			}
	}, 1500);

	
		el.player.addEventListener('loadstart', ()=>{
			lastSrcSetTs = Date.now();
			hadFirstPlaying = false;
			setStatus('Connecting…');
		});
		el.player.addEventListener('loadedmetadata', ()=>{
			setStatus('Buffering…');
		});
		el.player.addEventListener('canplay', ()=>{
			ensurePlaying();
		});
		el.player.addEventListener('playing', ()=>{
			setStatus('Live');
			hadFirstPlaying = true;
			reconnectAttempts = 0; 
			lastProgressTs = Date.now();
		});
		el.player.addEventListener('waiting', ()=> setStatus('Buffering…'));
		el.player.addEventListener('stalled', ()=> {
			
			const sinceSrcSet = Date.now() - lastSrcSetTs;
			const threshold = hadFirstPlaying ? STALL_AFTER_PLAYING_MS : STARTUP_GRACE_MS;
			if (sinceSrcSet > threshold) scheduleReconnect();
		});
		el.player.addEventListener('error', ()=> { setStatus('Error…'); scheduleReconnect(); });
		el.player.addEventListener('ended', ()=> { setStatus('Ended'); scheduleReconnect(); });

	
	async function fetchNowPlaying(){
		try {
			const res = await fetch(NOWPLAYING_URL, { cache: 'no-store' });
			if (!res.ok) throw new Error('HTTP '+res.status);
			const data = await res.json();
			renderNowPlaying(data);
		} catch (err) {
			
			setStatus('Updating…');
		}
	}

	function setText(elm, text){
		if (!elm) return;
		if (elm.textContent !== text) {
			elm.textContent = text;
			elm.classList.remove('fade');
			
			void elm.offsetWidth; 
			elm.classList.add('fade');
		}
	}

		let lastTrackId = null;
		function renderNowPlaying(payload){
		if (!payload) return;
		const np = payload.now_playing || {};
		const song = np.song || {};
			const shId = np.sh_id || np.song?.id || null;
		const title = song.title || (song.text || 'Unknown Title');
		
		const artist = song.artist || '';
			let art = song.art || '';
			if (art.startsWith('http://radio.enzomtp.party/')) {
				art = art.replace('http://', 'https://');
			}
		const listeners = payload.listeners?.current ?? payload.listeners?.total ?? '';

			
			if (listeners !== '') setText(el.listeners, `${listeners} listening`);

			
			const trackChanged = shId && shId !== lastTrackId;
			if (trackChanged || lastTrackId === null) {
				setText(el.title, title);
				setText(el.artist, artist);
				if (art) {
					const artUrl = bust(art);
					if (el.art.getAttribute('src') !== artUrl) {
						el.art.src = artUrl;
						el.art.classList.remove('fade');
						void el.art.offsetWidth;
						el.art.classList.add('fade');
					}
				}
				lastTrackId = shId;
			}

			
			setupProgress(np);
	}

				
				let prog = { startMs: 0, durationMs: 0, raf: 0 };
		function setupProgress(np){
				cancelAnimationFrame(prog.raf);
			const playedAt = np.played_at || 0; 
			const duration = Math.round(np.duration || 0); 
			const elapsedApi = Math.max(0, Math.round(np.elapsed || 0));

			if (!duration || duration <= 0) {
			
				if (el.progress) {
					el.progress.classList.add('hidden');
					el.progressBar.style.transform = 'scaleX(0)';
				}
				if (el.timecode) {
					el.timecode.classList.add('hidden');
					el.timecode.textContent = '';
				}
				return;
			}

			
			el.progress.classList.remove('hidden');
			if (el.timecode) el.timecode.classList.remove('hidden');
			prog.durationMs = duration * 1000;
			
			prog.startMs = playedAt > 0 ? (playedAt * 1000) : (Date.now() - elapsedApi * 1000);

			
				const tick = ()=>{
					updateProgress();
					prog.raf = requestAnimationFrame(tick);
				};
				updateProgress();
				prog.raf = requestAnimationFrame(tick);
		}

		function updateProgress(){
			if (!prog.durationMs) return;
			const elapsedMs = Math.max(0, Math.min(prog.durationMs, Date.now() - prog.startMs));
			const pct = Math.max(0, Math.min(1, elapsedMs / prog.durationMs));
				el.progressBar.style.transform = `scaleX(${pct})`;
			if (el.timecode) {
				el.timecode.textContent = `${fmt(elapsedMs)} / ${fmt(prog.durationMs)}`;
			}
			
			if (elapsedMs >= prog.durationMs) {
					cancelAnimationFrame(prog.raf);
			}
		}

		function fmt(ms){
			const total = Math.max(0, Math.floor(ms/1000));
			const m = Math.floor(total/60);
			const s = total % 60;
			return `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
		}

	
	ensurePlaying();
	fetchNowPlaying();
	setInterval(fetchNowPlaying, 10_000);

	
	document.addEventListener('visibilitychange', ()=>{
		if (!document.hidden) ensurePlaying();
	});
})();

