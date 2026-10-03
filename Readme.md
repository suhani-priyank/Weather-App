# SkyCast — Personal Weather Dashboard

A responsive weather dashboard built with HTML, CSS, and vanilla JavaScript using the OpenWeatherMap API.

## Features
- **Live weather search** by city and browser geolocation
- **5-day forecast** with high/low temperatures and precipitation probability
- **Hourly outlook** for the next 24 hours (3-hour intervals from the forecast API)
- **Air quality dashboard** with AQI category plus PM2.5, PM10 and ozone
- **Weather-aware daily insight** with practical tips and condition alerts
- **Sunrise, sunset and daylight duration**
- **Saved favorite cities** persisted in local storage
- **Celsius/Fahrenheit switch** and persistent dark mode
- **Responsive dashboard UI** with loading feedback, clear errors and empty states

## Tech stack
- HTML5
- CSS3 (responsive layout, CSS variables, light/dark themes)
- JavaScript (ES6+, async/await, Fetch API, Geolocation API, localStorage)
- OpenWeatherMap Current Weather, 5 Day / 3 Hour Forecast and Air Pollution APIs

## Run locally
1. Open this folder in VS Code.
2. Make sure `apiKey` in `script.js` contains your active OpenWeatherMap API key.
3. Run `index.html` with the VS Code Live Server extension.
4. Search for a city or choose **Use my location**. Browser geolocation generally requires localhost or HTTPS.

## API key note
The project includes the API key that was already present in the uploaded version. For a public repository, use your own OpenWeatherMap key and avoid committing secrets to GitHub. OpenWeatherMap may take time to activate new keys.

## Project structure
```text
Weather App/
├── index.html
├── style.css
├── script.js
└── Readme.md
```

## Resume-ready project description
Built SkyCast, a responsive weather intelligence dashboard using JavaScript and OpenWeatherMap APIs, featuring multi-day and hourly forecasts, air-quality monitoring, geolocation, saved cities, daylight tracking, theme persistence, and rule-based weather insights.

## Important limitations
- The daily insight and weather alerts are rule-based suggestions, not official emergency warnings or medical advice.
- Forecast API returns data in 3-hour intervals; the hourly section displays the next eight forecast points.
- Air-quality data availability and precision depend on the provider and selected location.
