// js/competitie.js

const urlParams = new URLSearchParams(window.location.search);
const compId = urlParams.get('id');

async function laadCompetitieMenu() {
    if (!compId) {
        document.getElementById('comp-titel').innerText = "Fout: Geen competitie geselecteerd";
        return;
    }

    try {
        // Haal alle data van de competitie op
        const { data: compInfo, error } = await supabaseClient
            .from('competitions')
            .select('*')
            .eq('id', compId)
            .single();
            
        if (error) throw error;

        if (compInfo) {
            document.getElementById('comp-titel').innerText = compInfo.name;
            document.getElementById('menu-grid').style.display = 'grid'; // Toon de blokken

            // 1. Laatste nieuws tonen (als het is ingevuld)
            if (compInfo.latest_news && compInfo.latest_news.trim() !== '') {
                document.getElementById('news-content').innerText = compInfo.latest_news;
                document.getElementById('news-section').style.display = 'block';
            }

            // 2. Modulair: Verberg de beker als deze uit staat
            if (compInfo.has_cup === false) {
                document.getElementById('link-beker').style.display = 'none';
            }
        }

        // 3. Vul alle knoppen in met de juiste link
        document.getElementById('link-klassement').href = `klassement.html?id=${compId}`;
        document.getElementById('link-kalender').href = `kalender.html?id=${compId}`;
        document.getElementById('link-ploegen').href = `ploegen.html?id=${compId}`;
        document.getElementById('link-stats').href = `statistieken.html?id=${compId}`;
        
        // Voor het bestuur en de beker geven we het ID ook mee
        if(compInfo.has_cup) document.getElementById('link-beker').href = `beker.html?id=${compId}`;
        document.getElementById('link-bestuur').href = `bestuur.html?id=${compId}`;

    } catch (err) {
        console.error("Fout bij het laden:", err);
        document.getElementById('comp-titel').innerText = "Oeps, er ging iets mis.";
    }
}

window.addEventListener('DOMContentLoaded', laadCompetitieMenu);
