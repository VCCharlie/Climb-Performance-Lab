// IMPORTANT SECURITY WARNING: Do NOT commit this file with your API key and ATHLETE ID directly to version control.
// For production environments, use environment variables or a secure secrets management system.
// For local development, consider using a .env file and a library like 'dotenv'.

const https = require('https');

// CONFIGURATIE
// Vervang deze waarden met jouw eigen Intervals.icu gegevens
const API_KEY = '6mdccprgilutn1uiokvf9nvsk';
const ATHLETE_ID = 'i34047'; // Vaak 'i' gevolgd door nummers, of gewoon je ID
const START_DATE = '2025-01-01'; // Pas aan naar wens
const END_DATE = '2026-12-31';   // Pas aan naar wens

/**
 * Functie om data van Intervals.icu op te halen
 * We gebruiken de native 'https' module zodat je geen externe packages hoeft te installeren.
 */
function fetchIntervalsData() {
    const options = {
        hostname: 'intervals.icu',
        path: `/api/v1/athlete/${ATHLETE_ID}/activities?oldest=${START_DATE}&newest=${END_DATE}`,
        method: 'GET',
        headers: {
            'Authorization': 'Basic ' + Buffer.from(`API_KEY:${API_KEY}`).toString('base64'),
            'Content-Type': 'application/json'
        }
    };

    console.log(`Verbinden met Intervals.icu voor atleet ${ATHLETE_ID}...`);

    const req = https.request(options, (res) => {
        let data = '';

        // Data ontvangen in chunks
        res.on('data', (chunk) => {
            data += chunk;
        });

        // Einde van de response
        res.on('end', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                try {
                    const activities = JSON.parse(data);
                    processActivities(activities);
                } catch (error) {
                    console.error('Fout bij het parsen van de JSON response:', error);
                }
            } else {
                console.error(`API verzoek mislukt. Status Code: ${res.statusCode}`);
                console.error('Response body:', data);
            }
        });
    });

    req.on('error', (e) => {
        console.error(`Probleem met het verzoek: ${e.message}`);
    });

    req.end();
}

/**
 * Functie om de ruwe activiteiten om te zetten naar het dashboard formaat
 * @param {Array} activities - De lijst met activiteiten van de API
 */
function processActivities(activities) {
    // 1. Map de data naar een tijdelijk formaat en filter activiteiten zonder eFTP
    const rawData = activities
        .map(activity => {
            // start_date_local is formaat "2026-01-21T10:00:00". We hebben alleen "2026-01-21" nodig.
            const dateStr = activity.start_date_local.split('T')[0];

            // Use icu_eftp for eFTP
            const eFTPValue = activity.icu_eftp;
            
            return {
                date: dateStr,
                eFTP: eFTPValue
            };
        })
        .filter(item => item.eFTP !== undefined && item.eFTP !== null);

    // 2. Ontdubbelen: Als er meerdere ritten op 1 dag zijn, pak de hoogste eFTP
    const dailyMap = new Map();

    rawData.forEach(item => {
        if (dailyMap.has(item.date)) {
            // Als de datum al bestaat, check of de nieuwe eFTP hoger is
            const existing = dailyMap.get(item.date);
            if (item.eFTP > existing.eFTP) {
                dailyMap.set(item.date, item);
            }
        } else {
            // Nieuwe datum, toevoegen
            dailyMap.set(item.date, item);
        }
    });

    // 3. Zet de Map terug om naar een Array en sorteer op datum (oud naar nieuw)
    const chartData = Array.from(dailyMap.values()).sort((a, b) => {
        return new Date(a.date) - new Date(b.date);
    });

    // 4. Output genereren
    console.log('
--- SUCCES: DATA GEGENEREERD ---');
    console.log(`Totaal aantal datapunten: ${chartData.length}`);
    console.log('
Kopieer onderstaande Array in je Dashboard chartData prop:
');

    // We gebruiken JSON.stringify met null, 2 voor leesbare indentatie
    console.log(JSON.stringify(chartData, null, 2));
}

// Start het script
fetchIntervalsData();