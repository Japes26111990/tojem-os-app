import React, { useState, useEffect } from 'react';
import { Sun, Cloud, CloudRain, Wind, Thermometer, ArrowDown, ArrowUp } from 'lucide-react';
import Button from '../../ui/Button';

// A small component to display a single weather detail
const WeatherDetail = ({ icon, value, unit }) => (
    <div className="flex items-center text-sm text-gray-300">
        {icon}
        <span className="ml-2">{value}{unit}</span>
    </div>
);

const WeatherApplet = () => {
    const [weather, setWeather] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchWeather = async () => {
            // API URL for Cape Town's coordinates with the specific data we want
            const apiUrl = "https://api.open-meteo.com/v1/forecast?latitude=-33.92&longitude=18.42&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,windspeed_10m_max&timezone=auto";
            
            try {
                const response = await fetch(apiUrl);
                const data = await response.json();
                // We only need today's data, which is the first item in the arrays
                setWeather({
                    maxTemp: Math.round(data.daily.temperature_2m_max[0]),
                    minTemp: Math.round(data.daily.temperature_2m_min[0]),
                    rainProb: data.daily.precipitation_probability_max[0],
                    windSpeed: Math.round(data.daily.windspeed_10m_max[0]),
                });
            } catch (error) {
                console.error("Failed to fetch weather data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchWeather();
    }, []);

    if (loading) {
        return <div className="p-2 text-sm text-gray-400">Loading Weather...</div>;
    }

    if (!weather) {
        return <div className="p-2 text-sm text-red-400">Could not load weather.</div>;
    }

    return (
        <div className="p-2 space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center">
                    <CloudRain size={32} className="text-blue-400" />
                    <div className="ml-3">
                        <p className="font-bold text-white">Cape Town</p>
                        <p className="text-xs text-gray-400">Today's Forecast</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <WeatherDetail icon={<ArrowUp size={16} className="text-red-400"/>} value={weather.maxTemp} unit="°C" />
                <WeatherDetail icon={<ArrowDown size={16} className="text-blue-400"/>} value={weather.minTemp} unit="°C" />
                <WeatherDetail icon={<CloudRain size={16} className="text-sky-300"/>} value={weather.rainProb} unit="%" />
                <WeatherDetail icon={<Wind size={16} className="text-gray-300"/>} value={weather.windSpeed} unit=" km/h" />
            </div>

            <a href="https://www.google.com/search?q=weather+cape+town" target="_blank" rel="noopener noreferrer">
                 <Button variant="secondary" className="w-full text-xs py-1">
                    View 7-Day Forecast
                 </Button>
            </a>
        </div>
    );
};

export default WeatherApplet;