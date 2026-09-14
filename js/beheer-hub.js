// js/beheer-hub.js

const urlParams = new URLSearchParams(window.location.search);
const compId = urlParams.get('id');

async function laadBeheerMenu() {
    if (!compId) {
        document.getElementById('comp-titel').innerText = "Fout: Geen competitie geselecteerd";
        return;
    }

    try {
        const { data: compInfo, error } = await supabaseClient
            .from('competitions')
            .select('name')
            .eq('id', compId)
            .single();
            
        if (error) throw error;

        if (compInfo) {
            document.getElementById('comp-titel').innerText = compInfo.name;
            document.getElementById('menu-grid').style.display = 'grid'; 
            document.getElementById('danger-zone').style.display = 'block'; // Toon de gevaarzone
        }

        // Koppel de juiste beheer-pagina's
        document.getElementById('link-instellingen').href = `edit-competitie.html?id=${compId}`;
        document.getElementById('link-ploegen').href = `beheer-ploegen.html?id=${compId}`;
        document.getElementById('link-spelers').href = `beheer-spelers.html?id=${compId}`;
        document.getElementById('link-nieuws').href = `beheer-nieuws.html?id=${compId}`;
        document.getElementById('link-kalender-maken').href = `beheer-kalender.html?id=${compId}`;

    } catch (err) {
        console.error("Fout bij het laden:", err);
        document.getElementById('comp-titel').innerText = "Oeps, er ging iets mis.";
    }
}

// --- FUNCTIE OM COMPETITIE TE VERWIJDEREN ---
async function verwijderCompetitie() {
    // Vraag extra bevestiging aan de gebruiker
    const bevestiging = confirm("🚨 OPGELET!\n\nBen je absoluut zeker dat je deze competitie wil verwijderen?\nAlle ploegen, spelers en data gaan onherroepelijk verloren.\n\nKlik op OK om definitief te wissen.");
    
    if (!bevestiging) return; // Als ze op 'Annuleren' klikken, stoppen we hier.

    try {
        // Supabase query om de competitie te wissen
        const { error } = await supabaseClient
            .from('competitions')
            .delete()
            .eq('id', compId);

        if (error) throw error;

        alert("De competitie is succesvol verwijderd.");
        
        // Stuur terug naar het hoofdmenu
        window.location.href = 'index.html';

    } catch (err) {
        console.error("Fout bij verwijderen:", err);
        alert("Er is een fout opgetreden bij het verwijderen: " + err.message);
    }
}

window.addEventListener('DOMContentLoaded', laadBeheerMenu);
