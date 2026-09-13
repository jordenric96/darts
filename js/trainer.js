// --- DATA & CONFIG ---
const KEY_PLAYERS = 'dartsPlayers';
const KEY_HISTORY = 'dartsHistoryV3';

let allPlayers = safeLoad(KEY_PLAYERS);
let history = safeLoad(KEY_HISTORY);
let activePlayers = [], curPIdx = 0, gameMode = '', keypadInput = "";

let selectedGameType = ""; 
let currentVariant = "";
let currentSessionIsRanked = false; 
let myChart = null;
let undoStack = [];

// UITGEBREIDE UITLEG PER SPEL
const desc = {
    doubles: "<b>DOEL:</b> Gooi alle dubbels uit (1-20 + Bull) met zo min mogelijk pijlen.<br><br><b>HOE:</b> Je begint bij D1 (of Random). Je mag 3 pijlen gooien. Raak je? Klik op 1, 2 of 3. Mis je? Klik op 'Mis'. Je gaat door tot de Bull.",
    singles: "<b>DOEL:</b> Train je precisie. Haal een zo hoog mogelijk percentage op de enkele getallen.<br><br><b>HOE:</b> De app geeft een getal. Gooi 3 pijlen. Geef aan hoeveel er in het juiste vak zaten (single, double of triple telt allemaal als raak).",
    bobs: "<b>DOEL:</b> Eindig met een zo hoog mogelijke score en zak niet onder 0.<br><br><b>HOE:</b> Je start met 27 punten. Gooi op volgorde (D1 t/m D20, Bull).<br>Raak = waarde erbij.<br>Mis (alle 3) = waarde eraf.",
    x01: "<b>DOEL:</b> Win de wedstrijd door als eerste het aantal legs te pakken.<br><br><b>HOE:</b> Klassiek 501/301. Gooi punten weg tot exact 0. Eindigen moet met een dubbel.",
    checkout: "<b>DOEL:</b> Train je finishes. Haal 10 finishes.<br><br><b>HOE:</b> Je krijgt een random getal (60-120). Je hebt 6 pijlen (2 beurten) om uit te gooien. Lukt het niet? Dan heb je gefaald.",
    p100: "<b>DOEL:</b> Zet een topscore neer in 100 worpen.<br><br><b>HOE:</b> Kies 'Hoog' (bvb Triple 20 trainen) of 'Laag' (bvb T1 trainen). Gooi 100 pijlen en voer telkens je score in.",
    bull: "<b>DOEL:</b> Een zo lang mogelijke reeks (streak) neerzetten.<br><br><b>HOE:</b> Gooi 3 pijlen per beurt. Je MOET minstens één Bull (groen of rood) raken om in het spel te blijven."
};

// Game States
let doublesState = {}, singlesState = {}, x01State = {}, checkoutState = {}, state100 = {}, stateBull = {}, bobsState = {};
const standardTargets = [...Array(20).keys()].map(i=>i+1).concat([25]); 
const boardOrder = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5, 25];
const bobsTargets = Array.from({length:20}, (_,i)=>i+1).concat([25]);

// SOUND (Simple Synth, requires interaction)
const sfx = { 
    ctx: null,
    init: () => {
        if(!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    },
    play: (freq, type, duration) => {
        sfx.init();
        if(this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = type; osc.frequency.value = freq;
            osc.connect(gain); gain.connect(this.ctx.destination);
            osc.start(); 
            gain.gain.exponentialRampToValueAtTime(0.00001, this.ctx.currentTime + duration);
            osc.stop(this.ctx.currentTime + duration);
        } catch(e){}
    },
    click: () => sfx.play(600, 'sine', 0.1),
    confirm: () => { sfx.play(400, 'square', 0.1); setTimeout(()=>sfx.play(600, 'square', 0.2), 100); },
    error: () => sfx.play(150, 'sawtooth', 0.3),
    win: () => { 
        sfx.play(500, 'triangle', 0.1); 
        setTimeout(()=>sfx.play(600, 'triangle', 0.1), 100); 
        setTimeout(()=>sfx.play(800, 'triangle', 0.2), 200); 
    }
};

document.addEventListener('click', function() { sfx.init(); }, {once:true});

// INIT
window.onload = function() {
    renderPlayerList();
    const inp = document.getElementById('new-player-name');
    if(inp) inp.addEventListener("keypress", function(e) { if(e.key==="Enter") handleAddPlayer(); });
};

// --- CORE FUNCTIONS ---
function triggerConfetti() { try { confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: ['#00f3ff', '#ff00aa', '#ffee00'] }); } catch(e){} }
function safeLoad(key) { try { return JSON.parse(localStorage.getItem(key)) || []; } catch(e){ return []; } }

function renderPlayerList() {
    const l = document.getElementById('player-list');
    if(!l) return; l.innerHTML = "";
    if(allPlayers.length === 0) { l.innerHTML = "<p style='text-align:center;opacity:0.5'>Nog geen spelers.</p>"; return; }
    allPlayers.forEach(n => {
        l.innerHTML += `<div class="player-row"><div style="display:flex;align-items:center;"><input type="checkbox" class="player-select-checkbox cb" value="${n}"><span style="font-weight:bold;font-size:1.1rem;color:var(--c-cyan)">${n}</span></div><button class="btn-delete" onclick="handleDeletePlayer('${n}')">✕</button></div>`;
    });
}

function handleAddPlayer() {
    const input = document.getElementById('new-player-name');
    const name = input.value.trim().toUpperCase();
    if(name && !allPlayers.includes(name)) {
        allPlayers.push(name);
        localStorage.setItem(KEY_PLAYERS, JSON.stringify(allPlayers));
        renderPlayerList();
    }
    input.value = ""; input.focus();
}

function handleDeletePlayer(name) {
    if(confirm("Verwijder " + name + "?")) {
        allPlayers = allPlayers.filter(p => p !== name);
        localStorage.setItem(KEY_PLAYERS, JSON.stringify(allPlayers));
        renderPlayerList();
    }
}

function confirmPlayers() {
    activePlayers = Array.from(document.querySelectorAll('.cb:checked')).map(c=>c.value);
    if(!activePlayers.length) return alert("Kies speler(s)");
    document.getElementById('active-players-display').innerText = activePlayers.join(", ");
    showScreen('screen-menu');
}

// --- MENU & MODALS ---
function showScreen(id) {
    document.querySelectorAll('.screen').forEach(e => e.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    if(id === 'screen-players') renderPlayerList();
}

function toggleFullScreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            alert(`Error: ${err.message} (${err.name})`);
        });
    } else {
        if (document.exitFullscreen) document.exitFullscreen();
    }
}

function hasPlayedToday(player, gameType) {
    const today = new Date().toISOString().slice(0,10);
    const key = getSaveKey(selectedGameType, currentVariant); 
    return history.some(h => h.player === player && h.date.startsWith(today) && (h.gameType === key));
}

function getSaveKey(type, variant) {
    if(type === 'doubles' || type === 'singles') return type + '_' + variant;
    if(type === '100') return '100' + variant;
    if(type === 'bull' || type === 'bullstreak') return 'bullstreak'; 
    if(type === 'checkout') return 'checkout_wins';
    if(type === 'x01') return 'x01_throw';
    return type; 
}

function preSelectVariant(gameType, title, variant, description) {
    selectedGameType = gameType;
    currentVariant = variant;
    
    document.getElementById('opt-title').innerText = title;
    document.getElementById('opt-desc').innerHTML = description;
    
    const rankedBtn = document.getElementById('btn-ranked');
    const msgDiv = document.getElementById('play-limit-msg');
    let played = false; let who = "";
    
    if(activePlayers.length > 0) {
        activePlayers.forEach(p => {
            if(hasPlayedToday(p, gameType)) { played = true; who = p; }
        });
    }

    if(played) {
        rankedBtn.disabled = true;
        msgDiv.style.display = 'block';
        msgDiv.innerText = `⛔ ${who} heeft dit vandaag al voor het 'echt' gespeeld.`;
    } else {
        rankedBtn.disabled = false;
        msgDiv.style.display = 'none';
    }

    const modal = document.getElementById('modal-options');
    modal.style.display = 'flex'; setTimeout(() => modal.classList.add('show'), 10);
}

function closeModal(id) {
    const m = document.getElementById(id);
    m.classList.remove('show');
    setTimeout(() => m.style.display = 'none', 300);
}

function launchGame(isRanked) {
    closeModal('modal-options');
    currentSessionIsRanked = isRanked;
    
    const badgeClass = isRanked ? 'badge-ranked' : 'badge-practice';
    const badgeText = isRanked ? '🏆 RANKED' : '🛡️ PRACTICE';
    document.querySelectorAll('.status-badge').forEach(b => {
        b.className = 'status-badge ' + badgeClass; b.innerText = badgeText;
    });

    const t = selectedGameType;
    if(t === 'doubles') startDoublesGame();
    else if(t === 'singles') startSinglesGame();
    else if(t === 'bobs27') startBobs27();
    else if(t === 'x01') startX01();
    else if(t === 'checkout') startCheckoutGame();
    else if(t === '100') start100Game();
    else if(t === 'bull') startBullstreak();
    else if(t === 'bullstreak') startBullstreak(); 
}

function restartGame() {
    closeModal('modal-summary');
    launchGame(currentSessionIsRanked);
}

// --- STATS MODAL ---
function launchStats() {
    closeModal('modal-options');
    const s = document.getElementById('stats-modal-player'); s.innerHTML = "";
    if(allPlayers.length===0) s.innerHTML="<option>Geen spelers</option>"; else allPlayers.forEach(p=>s.innerHTML+=`<option value="${p}">${p}</option>`);
    document.getElementById('stats-modal-title').innerText = document.getElementById('opt-title').innerText + " Stats";
    const m = document.getElementById('modal-stats'); m.style.display='flex'; setTimeout(()=>m.classList.add('show'),10);
    refreshGameStats();
}

function refreshGameStats() {
    const player = document.getElementById('stats-modal-player').value;
    let dbType = getSaveKey(selectedGameType, currentVariant);
    
    const recs = history.filter(h => h.player === player && h.gameType === dbType).sort((a,b) => new Date(a.date) - new Date(b.date));
    const labels = recs.map(r => new Date(r.date).toLocaleDateString());
    let dataPoints = recs.map(r => parseInt(r.result.score || r.result)).filter(n => !isNaN(n));

    const ctx = document.getElementById('gameChart').getContext('2d');
    if(myChart) myChart.destroy();
    
    myChart = new Chart(ctx, {
        type: 'line',
        data: { labels: labels, datasets: [{ label: 'Score', data: dataPoints, borderColor: '#00f3ff', backgroundColor: 'rgba(0,243,255,0.1)', tension: 0.3, fill: true }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#aaa' } } } }
    });
    
    const best = dataPoints.length ? Math.max(...dataPoints) : "-";
    const avg = dataPoints.length ? (dataPoints.reduce((a,b)=>a+b,0)/dataPoints.length).toFixed(1) : "-";
    document.getElementById('stats-text-summary').innerHTML = `Beste: <strong>${best}</strong> | Gem: <strong>${avg}</strong>`;
}

// --- SUMMARY ---
function showSummary(player, score, gameType, metric='max', details="") {
    document.getElementById('sum-player').innerText = player;
    document.getElementById('sum-score').innerText = score;
    document.getElementById('sum-details').innerText = details;
    
    let oldBest = "-"; let msg = ""; let diff = "-";
    const controlsDiv = document.getElementById('sum-controls');
    
    if(currentSessionIsRanked) {
        controlsDiv.innerHTML = `<button onclick="closeModal('modal-summary'); showScreen('screen-menu');" style="background:transparent; border:1px solid #555;">MENU 🏠</button>`;
        const dbType = gameType; 
        const recs = history.filter(h => h.player === player && h.gameType === dbType).map(r => parseInt(r.result.score || r.result));
        
        if(recs.length > 1) {
            const currentVal = recs.pop(); 
            oldBest = metric==='max' ? Math.max(...recs) : Math.min(...recs);
            
            if (metric === 'min') {
                if (currentVal < oldBest) { msg = "🎉 NIEUW RECORD!"; diff = "Verbeterd!"; sfx.win(); triggerConfetti(); }
                else { msg = "Game Voltooid"; diff = `+${currentVal - oldBest}`; }
            } else {
                if (currentVal > oldBest) { msg = "🎉 NIEUW RECORD!"; diff = "Verbeterd!"; sfx.win(); triggerConfetti(); }
                else { msg = "Game Voltooid"; diff = `${currentVal - oldBest}`; }
            }
        } else { msg = "Eerste Ranked Game!"; }
    } else {
        msg = "Oefenmodus (Niet opgeslagen)";
        controlsDiv.innerHTML = `
            <button class="btn-cyan" onclick="restartGame()">SPEEL OPNIEUW ↻</button>
            <button onclick="closeModal('modal-summary'); showScreen('screen-menu');" style="background:transparent; border:1px solid #555;">MENU 🏠</button>
        `;
    }

    document.getElementById('sum-pb').innerText = oldBest;
    document.getElementById('sum-diff').innerText = diff;
    document.getElementById('sum-msg').innerText = msg;

    const modal = document.getElementById('modal-summary');
    modal.style.display = 'flex'; setTimeout(() => modal.classList.add('show'), 10);
}

// --- RECORDS SCREEN ---
function showRecords() {
    const div = document.getElementById('records-content'); div.innerHTML = "";
    if(allPlayers.length === 0) { div.innerHTML = "Geen spelers."; return; }

    const getGlobalBest = (type, mode='max') => {
        let bestVal = mode==='min' ? 9999 : -9999; let bestPlayer = "-";
        allPlayers.forEach(p => {
            const rs = history.filter(h => h.player === p && h.gameType === type).map(r => parseInt(r.result.score || r.result));
            if(rs.length > 0) {
                const pBest = mode==='min' ? Math.min(...rs) : Math.max(...rs);
                if(mode==='max' && pBest > bestVal) { bestVal = pBest; bestPlayer = p; }
                if(mode==='min' && pBest < bestVal) { bestVal = pBest; bestPlayer = p; }
            }
        });
        return bestPlayer === "-" ? "-" : `${bestVal} (${bestPlayer})`;
    };

    const recs = [
        {t: '100high', l: '100 Pijlen (High)', c: 'var(--c-yellow)'},
        {t: '100low', l: '100 Pijlen (Low)', c: 'var(--c-pink)', m: 'min'},
        {t: 'bullstreak', l: 'Bullstreak', c: 'var(--c-cyan)'},
        {t: 'bobs27', l: 'Bob\'s 27', c: 'var(--c-green)'}
    ];

    recs.forEach(r => {
        div.innerHTML += `<div style="background:rgba(255,255,255,0.05); padding:15px; border-radius:10px; margin-bottom:10px;">
            <h3 style="color:${r.c}">${r.l}</h3>
            <div style="font-size:1.5rem; font-weight:bold;">${getGlobalBest(r.t, r.m || 'max')}</div>
        </div>`;
    });
    showScreen('screen-records');
}

// --- GAME LOGIC ---
function saveRec(type, player, res) {
    if(currentSessionIsRanked) {
        history.push({ date: new Date().toISOString(), gameType: type, player: player, result: res });
        localStorage.setItem(KEY_HISTORY, JSON.stringify(history));
    }
}
function quitGame() { if(confirm("Stoppen?")) showScreen('screen-menu'); }
function hardReset() { if(confirm("ALLES WISSEN?")) { localStorage.clear(); location.reload(); } }
function kp(v) { if (v==='BACK') keypadInput = keypadInput.slice(0,-1); else if (keypadInput.length < 3) keypadInput += v; ['x01-display', 'checkout-display', '100-display'].forEach(id => { const el = document.getElementById(id); if(el) el.innerText = keypadInput || "0"; }); }
function nextTurn() { curPIdx = (curPIdx + 1) % activePlayers.length; }

function snapshotState() {
    undoStack.push(JSON.stringify({ 
        gameMode, curPIdx, keypadInput, doublesState, singlesState, x01State, checkoutState, state100, stateBull, bobsState, historyLen: history.length 
    }));
    if(undoStack.length > 5) undoStack.shift();
}
function undoLastMove() {
    if(!undoStack.length) return alert("Kan niet terug.");
    const s = JSON.parse(undoStack.pop());
    gameMode=s.gameMode; curPIdx=s.curPIdx; keypadInput=s.keypadInput;
    doublesState=s.doublesState; singlesState=s.singlesState; x01State=s.x01State; checkoutState=s.checkoutState; state100=s.state100; stateBull=s.stateBull; bobsState=s.bobsState;
    if(history.length > s.historyLen) { history = history.slice(0, s.historyLen); localStorage.setItem(KEY_HISTORY, JSON.stringify(history)); }
    
    if(gameMode==='doubles') updateDoublesUI();
    if(gameMode==='singles') updateSinglesUI();
    if(gameMode==='x01') updateX01UI();
    if(gameMode==='checkout') updateCheckoutUI();
    if(gameMode==='100') update100UI();
    if(gameMode==='bull') updateBullUI();
    if(gameMode==='bobs') updateBobsUI();
    ['x01-display', 'checkout-display', '100-display'].forEach(id => { const el = document.getElementById(id); if(el) el.innerText = keypadInput || "0"; });
}

// DOUBLES
function startDoublesGame() {
    undoStack = [];
    activePlayers.forEach(p => {
        let queue = [...standardTargets];
        if(currentVariant === 'random') queue.sort(() => Math.random() - 0.5);
        doublesState[p] = { idx:0, curDarts:0, totalGameDarts:0, queue: queue };
    });
    gameMode='doubles'; curPIdx=0; updateDoublesUI(); showScreen('screen-game-doubles');
}
function updateDoublesUI() {
    const sb=document.getElementById('doubles-scoreboard'); sb.innerHTML='';
    const p = activePlayers[curPIdx], s = doublesState[p];
    const targetVal = s.queue[s.idx];
    const target = s.idx >= s.queue.length ? "WIN" : (targetVal === 25 ? "BULL" : "D" + targetVal);
    document.getElementById('doubles-instruction').innerText = `Doel: ${target}`;
    activePlayers.forEach((p,i) => {
        const s=doublesState[p]; const tv=s.queue[s.idx]; const txt=s.idx>=s.queue.length?"WIN":(tv===25?"BULL":"D"+tv);
        sb.innerHTML+=`<div class="p-card ${i===curPIdx?'active-turn':''}"><div class="p-name">${p}</div><div class="p-score">${txt}</div></div>`;
    });
    document.getElementById('doubles-darts-count').innerText=s.totalGameDarts + s.curDarts;
}
function handleDoublesInput(d) {
    snapshotState(); const p=activePlayers[curPIdx], s=doublesState[p];
    s.totalGameDarts += (s.curDarts + d); 
    
    if(currentSessionIsRanked) {
        history.push({ date: new Date().toISOString(), gameType: 'doubles_stat', player: p, result: {target:s.queue[s.idx], darts:s.curDarts+d} });
        localStorage.setItem(KEY_HISTORY, JSON.stringify(history));
    }
    s.idx++; s.curDarts=0;
    if(s.idx >= s.queue.length) {
        let saveKey = 'doubles_'+currentVariant;
        saveRec(saveKey, p, s.totalGameDarts);
        showSummary(p, s.totalGameDarts + " Pijlen", saveKey, 'min', "Totaal aantal pijlen");
        return;
    }
    nextTurn(); updateDoublesUI();
}
function handleDoublesMiss() { snapshotState(); doublesState[activePlayers[curPIdx]].curDarts+=3; nextTurn(); updateDoublesUI(); }

// SINGLES
function startSinglesGame() {
    undoStack=[]; gameMode='singles'; 
    activePlayers.forEach(p=> singlesState[p]={ queue: (currentVariant==='random'?[...standardTargets].sort(()=>Math.random()-0.5):[...standardTargets]), idx:0, score:0, totalThrows:0 });
    curPIdx=0; updateSinglesUI(); showScreen('screen-game-singles');
}
function updateSinglesUI() {
    const sb=document.getElementById('singles-scoreboard'); sb.innerHTML='';
    const p = activePlayers[curPIdx], s = singlesState[p];
    const target = s.idx >= s.queue.length ? "KLAAR" : (s.queue[s.idx]===25?'BULL':s.queue[s.idx]);
    document.getElementById('singles-instruction').innerText = `Doel: ${target}`;
    activePlayers.forEach((p,i)=>{
        const s=singlesState[p]; const tv=s.queue[s.idx]; const txt=s.idx>=s.queue.length?"FIN":(tv===25?'BULL':tv);
        sb.innerHTML+=`<div class="p-card ${i===curPIdx?'active-turn':''}"><div class="p-name">${p}</div><div class="p-score">${txt}</div><div style="font-size:0.8rem">Hits: ${s.score}</div></div>`;
    });
    if(singlesState[activePlayers[curPIdx]].idx>=singlesState[activePlayers[curPIdx]].queue.length) {
        const fs = singlesState[activePlayers[curPIdx]].score;
        const tt = singlesState[activePlayers[curPIdx]].totalThrows;
        const pct = tt>0 ? ((fs/tt)*100).toFixed(1) : 0;
        saveRec('singles_'+currentVariant, activePlayers[curPIdx], fs);
        showSummary(activePlayers[curPIdx], fs, 'singles_'+currentVariant, 'max', `Hitrate: ${pct}%`);
    }
}
function handleSinglesInput(h) {
    snapshotState(); const p = activePlayers[curPIdx], s = singlesState[p];
    if(currentSessionIsRanked) {
        history.push({ date: new Date().toISOString(), gameType: 'singles_stat', player: p, result: {target:s.queue[s.idx], hits:h} });
        localStorage.setItem(KEY_HISTORY, JSON.stringify(history));
    }
    s.score+=h; s.totalThrows+=3; s.idx++; nextTurn(); updateSinglesUI();
}

// BOBS 27
function startBobs27() { undoStack=[]; gameMode='bobs'; activePlayers.forEach(p => bobsState[p] = {score: 27, idx: 0, alive: true}); curPIdx = 0; updateBobsUI(); showScreen('screen-game-bobs27'); }
function updateBobsUI() {
    const sb = document.getElementById('bobs-scoreboard'); sb.innerHTML = '';
    const p = activePlayers[curPIdx];
    let attempts = 0; while(!bobsState[p].alive && attempts < activePlayers.length) { curPIdx = (curPIdx + 1) % activePlayers.length; attempts++; }
    if(attempts >= activePlayers.length) { alert("Game Over!"); showScreen('screen-menu'); return; }
    const s = bobsState[activePlayers[curPIdx]];
    const tVal = bobsTargets[s.idx]; const tTxt = tVal === 25 ? "BULL" : "D" + tVal;
    document.getElementById('bobs-instruction').innerText = `Target: ${tTxt}`;
    activePlayers.forEach((pl, i) => {
        const st = bobsState[pl]; const cls = !st.alive ? 'opacity:0.3' : (i===curPIdx?'active-turn':'');
        sb.innerHTML += `<div class="p-card ${cls}"><div class="p-name">${pl}</div><div class="p-score">${st.score}</div></div>`;
    });
}
function handleBobsInput(hits) {
    snapshotState(); const p = activePlayers[curPIdx], s = bobsState[p];
    const targetVal = bobsTargets[s.idx] === 25 ? 25 : bobsTargets[s.idx]; const points = targetVal * 2;
    if(hits > 0) s.score += (points * hits); else { s.score -= points; document.getElementById('screen-game-bobs27').classList.add('flash-red'); setTimeout(()=>document.getElementById('screen-game-bobs27').classList.remove('flash-red'), 500); }
    if(s.score < 0) { 
        s.alive = false; sfx.win(); alert(`${p} is AF!`); 
        if(activePlayers.every(pl => !bobsState[pl].alive)) { showScreen('screen-menu'); }
    } 
    else if(s.idx >= bobsTargets.length - 1) { 
        saveRec('bobs27', p, s.score); 
        showSummary(p, s.score, 'bobs27', 'max', "Score"); 
        return; 
    } 
    else s.idx++;
    nextTurn(); updateBobsUI();
}

// X01
function startX01() { undoStack=[]; gameMode='x01'; let l=parseInt(prompt("Legs?","1"))||1; let st=parseInt(prompt("Start?","501"))||501; activePlayers.forEach(p=>x01State[p]={score:st,start:st,legs:0,req:l}); curPIdx=0; keypadInput=""; updateX01UI(); showScreen('screen-game-x01'); }
function updateX01UI() {
    const sb=document.getElementById('x01-scoreboard'); sb.innerHTML='';
    activePlayers.forEach((p,i)=>{ sb.innerHTML+=`<div class="p-card ${i===curPIdx?'active-turn':''}"><div class="p-name">${p}</div><div class="p-score">${x01State[p].score}</div><div class="leg-indicator">L:${x01State[p].legs}</div></div>`; });
    document.getElementById('x01-display').innerText=keypadInput||"0";
}
function submitX01() {
    const v=parseInt(keypadInput); if(isNaN(v)||v>180) return alert("Fout");
    snapshotState(); const p=activePlayers[curPIdx], s=x01State[p], r=s.score-v;
    if(currentSessionIsRanked) { history.push({ date: new Date().toISOString(), gameType: 'x01_throw', player: p, result: v }); localStorage.setItem(KEY_HISTORY, JSON.stringify(history)); }
    if(r===0){ s.legs++; if(s.legs>=s.req){ showSummary(p, s.legs + " LEGS", 'x01', 'max', "Wedstrijd gewonnen"); return; }else{sfx.win(); alert("Leg win!"); activePlayers.forEach(pl=>x01State[pl].score=x01State[pl].start);} }
    else if(r<=1) alert("BUST"); else s.score=r;
    keypadInput=""; nextTurn(); updateX01UI();
}

// CHECKOUT
function startCheckoutGame() {
    let mn=60, mx=120; // FIXED RANGE
    undoStack=[]; gameMode='checkout'; activePlayers.forEach(p=>checkoutState[p]={r:1,wins:0,t:Math.floor(Math.random()*(mx-mn+1)+mn),cur:0,tr:0,mn:mn,mx:mx}); activePlayers.forEach(p=>checkoutState[p].cur=checkoutState[p].t); curPIdx=0; updateCheckoutUI(); showScreen('screen-game-checkout');
}
function updateCheckoutUI() {
    const p=activePlayers[curPIdx], s=checkoutState[p]; if(s.r>10) { saveRec('checkout_wins',p,s.wins); showSummary(p, s.wins + "/10", 'checkout_wins', 'max', "Challenges Voltooid"); return; }
    const sb=document.getElementById('checkout-scoreboard'); sb.innerHTML='';
    activePlayers.forEach((pl,i)=>{ sb.innerHTML+=`<div class="p-card ${i===curPIdx?'active-turn':''}"><div class="p-name">${pl}</div><div class="p-score">${checkoutState[pl].wins}/10</div></div>`; });
    document.getElementById('co-target').innerText=s.cur; document.getElementById('checkout-display').innerText=keypadInput||"0";
}
function submitCheckout() {
    const v=parseInt(keypadInput); if(isNaN(v)) return;
    snapshotState(); const p=activePlayers[curPIdx], s=checkoutState[p], r=s.cur-v;
    if(r===0){ s.wins++; nextCO(s); } else if(r<=1){ s.tr++; checkFailCO(s); } else { s.cur=r; s.tr++; checkFailCO(s); }
    keypadInput=""; if(s.cur>0) nextTurn(); updateCheckoutUI();
}
function checkFailCO(s) { if(s.tr>=2 && s.cur>0) nextCO(s); }
function nextCO(s) { s.r++; s.tr=0; s.t=Math.floor(Math.random()*(s.mx-s.mn+1)+s.mn); s.cur=s.t; }

// 100 PIJLEN
function start100Game() { undoStack=[]; gameMode='100'; activePlayers.forEach(p=>state100[p]={score:0,darts:0}); curPIdx=0; update100UI(); showScreen('screen-game-100'); }
function update100UI(){
    const sb=document.getElementById('100-scoreboard'); sb.innerHTML='';
    activePlayers.forEach((p,i)=>{ sb.innerHTML+=`<div class="p-card ${i===curPIdx?'active-turn':''}"><div class="p-name">${p}</div><div class="p-score">${state100[p].score}</div></div>`; });
    document.getElementById('100-counter').innerText=state100[activePlayers[curPIdx]].darts; document.getElementById('100-display').innerText=keypadInput||"0";
}
function submit100(){
    const v=parseInt(keypadInput); if(isNaN(v)||v>180) return;
    snapshotState(); const p=activePlayers[curPIdx], s=state100[p];
    let dTurn = (100-s.darts===1)?1:3; if(dTurn===1&&v>60) return alert("Max 60");
    s.score+=v; s.darts+=dTurn; keypadInput="";
    if(s.darts>=100){ 
        const saveKey = '100'+currentVariant;
        saveRec(saveKey,p,s.score); showSummary(p, s.score, saveKey, currentVariant==='high'?'max':'min', "Score"); 
        if(curPIdx===activePlayers.length-1) return;
    }
    nextTurn(); update100UI();
}

// BULL
function startBullstreak(){ undoStack=[]; gameMode='bull'; activePlayers.forEach(p=>stateBull[p]={streak:0,alive:true}); curPIdx=0; updateBullUI(); showScreen('screen-game-bullstreak'); }
function updateBullUI(){
    let att=0; while(!stateBull[activePlayers[curPIdx]].alive && att<activePlayers.length){ curPIdx=(curPIdx+1)%activePlayers.length; att++; }
    if(att>=activePlayers.length){ showScreen('screen-menu'); return; }
    const sb=document.getElementById('bull-scoreboard'); sb.innerHTML='';
    activePlayers.forEach((p,i)=>{ sb.innerHTML+=`<div class="p-card ${i===curPIdx?'active-turn':''} ${!stateBull[p].alive?'opacity:0.3':''}"><div class="p-name">${p}</div><div class="p-score">${stateBull[p].streak}</div></div>`; });
    document.getElementById('bull-streak-val').innerText=stateBull[activePlayers[curPIdx]].streak;
}
function handleBullResult(h){
    snapshotState(); const p=activePlayers[curPIdx]; 
    if(h) { sfx.win(); stateBull[p].streak++; } 
    else { 
        saveRec('bullstreak',p,stateBull[p].streak); stateBull[p].alive=false; 
        showSummary(p, stateBull[p].streak + " Beurten", 'bullstreak', 'max', "Streak");
    }
    curPIdx=(curPIdx+1)%activePlayers.length; updateBullUI();
}
