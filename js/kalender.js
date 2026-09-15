// js/kalender.js

const urlParams = new URLSearchParams(window.location.search);
const compId = urlParams.get('id');

let alleMatchen = [];
let alleTeams = [];
let teamNamen = {};

let huidigeDivisie = "";
let maxSpeeldag = 1;
let actieveSpeeldag = 1; 

let vorigeSpeeldagNum = 0;
let volgendeSpeeldagNum = 0;
let viewMode = 'DASHBOARD'; // Of 'ALL'

window.addEventListener('DOMContentLoaded', async () => {
    if (!compId) {
        document.getElementById('dashboard-view').innerHTML = "<p style='color:red;'>Fout: Geen competitie geselecteerd.</p>";
        return;
    }
    document.getElementById('btn-back-hub').onclick = () => window.location.href = `competitie.html?id=${compId}`;
    
    await laadData();
});

async function laadData() {
    try {
        const { data: teams } = await supabaseClient.from('teams').select('id, name, division').eq('competition_id', compId).order('name');
        alleTeams = teams || [];
        teams.forEach(t => teamNamen[t.id] = t.name);

        const { data: matches } = await supabaseClient.from('matches').select('*').eq('competition_id', compId);
        alleMatchen = matches || [];

        if (alleMatchen.length === 0) {
            document.getElementById('dashboard-view').innerHTML = "<p style='text-align:center; color:#aaa;'>De kalender is nog niet opgemaakt.</p>";
            return;
        }

        const divisies = [...new Set(alleMatchen.map(m => m.division))].sort();
        document.getElementById('select-divisie').innerHTML = divisies.map(d => `<option value="${d}">${d}</option>`).join('');
        huidigeDivisie = divisies[0];

        vulPloegenDropdown();
        veranderDivisie(); // Start de berekeningen

    } catch (err) {
        console.error(err);
    }
}

function vulPloegenDropdown() {
    const selectPloeg = document.getElementById('select-ploeg');
    const ploegenInDiv = alleTeams.filter(t => t.division === huidigeDivisie);
    
    let optionsHtml = `<option value="ALL">Alle ploegen</option>`;
    ploegenInDiv.forEach(p => optionsHtml += `<option value="${p.id}">${p.name}</option>`);
    selectPloeg.innerHTML = optionsHtml;

    const opgeslagen = localStorage.getItem(`mijnPloeg_${compId}`);
    if (opgeslagen && ploegenInDiv.some(p => p.id === opgeslagen)) {
        selectPloeg.value = opgeslagen;
    }
}

function veranderDivisie() {
    huidigeDivisie = document.getElementById('select-divisie').value;
    vulPloegenDropdown(); // Update lijst met ploegen voor deze reeks
    bepaalDashboardSpeeldagen();
    renderActueleView();
}

function bepaalDashboardSpeeldagen() {
    const matchenInDivisie = alleMatchen.filter(m => m.division === huidigeDivisie);
    const speeldagen = [...new Set(matchenInDivisie.map(m => m.matchday))].sort((a,b) => a - b);
    maxSpeeldag = speeldagen[speeldagen.length - 1];
    
    const vandaag = new Date().toISOString().split('T')[0];
    let nextDay = null;

    // Zoek de eerste speeldag in de toekomst (of vandaag)
    for (let day of speeldagen) {
        const mDag = matchenInDivisie.filter(m => m.matchday === day);
        if (mDag[0] && mDag[0].play_date >= vandaag) {
            nextDay = day;
            break;
        }
    }

    if (nextDay === null) {
        // Alles is al gespeeld (Seizoen ten einde)
        volgendeSpeeldagNum = 0;
        vorigeSpeeldagNum = maxSpeeldag;
    } else if (nextDay === 1) {
        // Seizoen moet nog beginnen
        volgendeSpeeldagNum = 1;
        vorigeSpeeldagNum = 0;
    } else {
        // Midden in het seizoen
        volgendeSpeeldagNum = nextDay;
        vorigeSpeeldagNum = nextDay - 1;
    }
    
    actieveSpeeldag = volgendeSpeeldagNum || vorigeSpeeldagNum;
}

// --- RENDERING FUNCTIES ---

function renderMatchRow(match, mijnPloegId) {
    const homeName = teamNamen[match.home_team_id] || 'Onbekend';
    const awayName = teamNamen[match.away_team_id] || 'Onbekend';
    const isMyMatch = (mijnPloegId === match.home_team_id || mijnPloegId === match.away_team_id);
    const rowClass = isMyMatch ? "match-row my-team-row" : "match-row";

    // Als de match een score heeft, toon die in een badge. Anders het startuur.
    const hasScore = match.home_score !== null && match.away_score !== null;
    let badgeHtml = '';
    
    if (hasScore) {
        badgeHtml = `<div class="score-badge">${match.home_score} - ${match.away_score}</div>`;
    } else {
        const time = match.play_time ? match.play_time.substring(0, 5) : 'VS';
        badgeHtml = `<div class="time-badge">${time}</div>`;
    }

    return `
        <div class="${rowClass}">
            <span class="team-name team-home ${mijnPloegId === match.home_team_id ? 'my-team-text' : ''}">${homeName}</span>
            <div class="badge-container">${badgeHtml}</div>
            <span class="team-name team-away ${mijnPloegId === match.away_team_id ? 'my-team-text' : ''}">${awayName}</span>
        </div>
    `;
}

function haalDatumTekst(speeldagNum) {
    const m = alleMatchen.find(x => x.division === huidigeDivisie && x.matchday === speeldagNum);
    if (!m || !m.play_date) return '';
    return m.play_date.split('-').reverse().join('-');
}

function renderActueleView() {
    const mijnPloegId = document.getElementById('select-ploeg').value;
    if (mijnPloegId !== "ALL") localStorage.setItem(`mijnPloeg_${compId}`, mijnPloegId);
    else localStorage.removeItem(`mijnPloeg_${compId}`);

    if (viewMode === 'DASHBOARD') {
        // VORIGE SPEELDAG (Uitslagen)
        const containerVorige = document.getElementById('container-vorige');
        if (vorigeSpeeldagNum > 0) {
            document.getElementById('titel-vorige').innerText = `Speeldag ${vorigeSpeeldagNum} (${haalDatumTekst(vorigeSpeeldagNum)})`;
            const matchen = alleMatchen.filter(m => m.division === huidigeDivisie && m.matchday === vorigeSpeeldagNum);
            containerVorige.innerHTML = matchen.map(m => renderMatchRow(m, mijnPloegId)).join('');
            containerVorige.style.display = 'block';
        } else {
            document.getElementById('titel-vorige').innerText = '';
            containerVorige.innerHTML = `<p style="text-align:center; padding: 15px; color:#aaa; margin:0;">Het seizoen is nog niet gestart.</p>`;
        }

        // VOLGENDE SPEELDAG (Programma)
        const containerVolgende = document.getElementById('container-volgende');
        if (volgendeSpeeldagNum > 0) {
            document.getElementById('titel-volgende').innerText = `Speeldag ${volgendeSpeeldagNum} (${haalDatumTekst(volgendeSpeeldagNum)})`;
            const matchen = alleMatchen.filter(m => m.division === huidigeDivisie && m.matchday === volgendeSpeeldagNum);
            containerVolgende.innerHTML = matchen.map(m => renderMatchRow(m, mijnPloegId)).join('');
            containerVolgende.style.display = 'block';
        } else {
            document.getElementById('titel-volgende').innerText = '';
            containerVolgende.innerHTML = `<p style="text-align:center; padding: 15px; color:#aaa; margin:0;">Het seizoen is afgelopen!</p>`;
        }
    } else {
        renderAlleSpeeldagenView();
    }
}

// --- VOLLEDIGE KALENDER WEERGAVE ---

function toggleViewMode() {
    viewMode = viewMode === 'DASHBOARD' ? 'ALL' : 'DASHBOARD';
    document.getElementById('dashboard-view').style.display = viewMode === 'DASHBOARD' ? 'block' : 'none';
    document.getElementById('all-view').style.display = viewMode === 'ALL' ? 'block' : 'none';
    renderActueleView();
}

function vorigeSpeeldag() { if (actieveSpeeldag > 1) { actieveSpeeldag--; renderAlleSpeeldagenView(); } }
function volgendeSpeeldag() { if (actieveSpeeldag < maxSpeeldag) { actieveSpeeldag++; renderAlleSpeeldagenView(); } }

function renderAlleSpeeldagenView() {
    const mijnPloegId = document.getElementById('select-ploeg').value;
    
    document.getElementById('btn-prev').disabled = (actieveSpeeldag === 1);
    document.getElementById('btn-next').disabled = (actieveSpeeldag === maxSpeeldag);
    document.getElementById('titel-speeldag').innerText = `Speeldag ${actieveSpeeldag}`;
    document.getElementById('titel-datum').innerText = `📅 ${haalDatumTekst(actieveSpeeldag)}`;

    const matchen = alleMatchen.filter(m => m.division === huidigeDivisie && m.matchday === actieveSpeeldag);
    document.getElementById('container-all').innerHTML = matchen.map(m => renderMatchRow(m, mijnPloegId)).join('');
}
