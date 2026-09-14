// js/app.js

window.addEventListener('DOMContentLoaded', laadCompetities);

async function laadCompetities() {
    const container = document.getElementById('competitie-lijst');
    container.innerHTML = '<p style="color: #aaa;">Competities ophalen...</p>';

    try {
        // Haal alle competities op, de nieuwste bovenaan
        const { data, error } = await supabaseClient
            .from('competitions')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (!data || data.length === 0) {
            container.innerHTML = '<p style="color: #aaa;">Er zijn nog geen competities aangemaakt.</p>';
            return;
        }

        // Bouw de lijst op met knoppen direct op het startscherm
        container.innerHTML = data.map(comp => `
            <div style="background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 15px; margin-bottom: 15px; display: flex; flex-direction: column; gap: 10px;">
                
                <div style="font-weight: bold; font-size: 1.1rem; color: white;">
                    🏆 ${comp.name}
                </div>
                
                <div style="display: flex; gap: 8px;">
                    <!-- Spelers knop -->
                    <button onclick="window.location.href='competitie.html?id=${comp.id}'" style="flex: 1; background: rgba(255,255,255,0.1); color: white; border: none; padding: 10px; border-radius: 8px; font-weight: bold; cursor: pointer;">
                        👉 Bekijken
                    </button>
                    
                    <!-- Admin knop -->
                    <button onclick="window.location.href='beheer-hub.html?id=${comp.id}'" style="flex: 1; background: var(--c-cyan); color: black; border: none; padding: 10px; border-radius: 8px; font-weight: bold; cursor: pointer;">
                        ⚙️ Beheren
                    </button>
                    
                    <!-- Verwijder knop -->
                    <button onclick="verwijderCompetitie('${comp.id}', '${comp.name}')" style="background: rgba(255, 59, 59, 0.2); border: 1px solid #ff3b3b; color: #ff3b3b; padding: 10px; border-radius: 8px; cursor: pointer;">
                        🗑️
                    </button>
                </div>

            </div>
        `).join('');

    } catch (err) {
        console.error(err);
        container.innerHTML = `<p style="color: #ff3b3b;">Fout bij laden: ${err.message}</p>`;
    }
}

// Functie om direct vanaf het startscherm te verwijderen
async function verwijderCompetitie(id, naam) {
    // Vraag altijd om bevestiging zodat je niet per ongeluk klikt
    const bevestiging = confirm(`🚨 OPGELET!\n\nBen je absoluut zeker dat je "${naam}" wil verwijderen?\n\nAlle ploegen en spelers in deze competitie worden gewist.`);
    
    if (!bevestiging) return; // Stop als we op annuleren klikken

    try {
        const { error } = await supabaseClient
            .from('competitions')
            .delete()
            .eq('id', id);

        if (error) throw error;

        // Als het gelukt is, herlaad dan onmiddellijk de lijst op je scherm
        laadCompetities();

    } catch (err) {
        alert("Fout bij verwijderen: " + err.message);
    }
}
