import React, { useState, useEffect } from 'react';
// Importeer de service die we net gemaakt hebben
import { fetchIntervalsData } from '../services/intervalsService';
// Importeer eventuele andere componenten die je al had, zoals de Chart
// import MyChartComponent from './MyChartComponent'; 

const Dashboard = () => {
  // State voor de grafiek data
  const [chartData, setChartData] = useState([]);
  
  // State om bij te houden of we nog aan het laden zijn (handig voor een spinner)
  const [loading, setLoading] = useState(true);
  
  // State voor eventuele foutmeldingen
  const [error, setError] = useState(null);

  useEffect(() => {
    // We definiëren een async functie binnen de useEffect
    const loadData = async () => {
      try {
        setLoading(true);
        
        // We halen data op van begin dit jaar tot eind dit jaar (pas aan indien nodig)
        const startDate = '2025-01-01';
        const endDate = '2026-12-31';
        
        const data = await fetchIntervalsData(startDate, endDate);
        
        // Update de state met de opgehaalde data
        setChartData(data);
        setError(null);
      } catch (err) {
        setError('Kon data niet ophalen van Intervals.icu');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    // Voer de functie uit
    loadData();
  }, []); // De lege array [] zorgt dat dit alleen bij het mounten (laden) gebeurt

  // Render logica
  if (loading) {
    return <div>Data aan het laden...</div>;
  }

  if (error) {
    return <div style={{ color: 'red' }}>Error: {error}</div>;
  }

  return (
    <div className="dashboard-container">
      <h1>Performance Dashboard</h1>
      
      {/* Hier geef je de dynamische chartData door aan je grafiek component */}
      {/* Vervang <MyChartComponent /> door jouw eigen grafiek component */}
      {/* <MyChartComponent data={chartData} /> */}
      
      {/* Ter controle (debug): toon de eerste paar regels data */}
      <pre>
        {JSON.stringify(chartData.slice(0, 3), null, 2)}
        {chartData.length > 0 && `\n...en nog ${chartData.length - 3} items`}
      </pre>
    </div>
  );
};

export default Dashboard;