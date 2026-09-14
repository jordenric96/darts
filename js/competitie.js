// js/competitie.js

const urlParams = new URLSearchParams(window.location.search);
const compId = urlParams.get('id');

async function laadCompetitieMenu() {
    if (!compId) {
        document.getElementById('comp-titel').innerText = "Fout: Geen competitie geselecteerd";
        return;
    }

    try {
        // Haal de competitie info op uit de database
        const { data: compInfo, error } = await supabaseClient
            .from('competitions')
            .select('*')
            .eq('id', compId)
            .single();
            
        if (error) throw error;

        if (compInfo) {
            document.getElementById('comp-titel').innerText = compInfo.name;
            document.getElementById('menu-grid').style.display = 'grid'; // Toon de blokken

            // Toon de nieuwsbanner als het bestuur dit heeft ingevuld (wordt later gebouwd)
            if (compInfo.latest_news && compInfo.latest_news.trim() !== '') {
                document.getElementById('news-content').innerText = compInfo.latest_news;
                document.getElementById('news-section').style.display = 'block';
            }

            // Verberg de beker-knop als het bestuur dit had uitgevinkt bij aanmaak
            if (compInfo.has_cup === false) {
                document.getElementById('link-beker').style.display = 'none';
            }
        }

        // Vul alle knoppen in met de juiste link inclusief het ID
        document.getElementById('link-klassement').href = `klassement.html?id=${compId}`;
        document.getElementById('link-kalender').href = `kalender.html?id=${compId}`;
        document.getElementById('link-ploegen').href = `ploegen-info.html?id=${compId}`;
        document.getElementById('link-beker').href = `beker.html?id=${compId}`;
        document.getElementById('link-stats').href = `statistieken.html?id=${compId}`;
        document.getElementById('link-bestuur').href = `bestuur.html?id=${compId}`;

    } catch (err) {
        console.error("Fout bij het laden:", err);
        document.getElementById('comp-titel').innerText = "Oeps, er ging iets mis.";
    }
}

window.addEventListener('DOMContentLoaded', laadCompetitieMenu);
