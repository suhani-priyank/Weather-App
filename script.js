// SkyCast weather dashboard — OpenWeatherMap API
// Keep your API key private when publishing a public repository.
const apiKey = "17c2222e183af47a0183663124b6b66e";
const $ = (id) => document.getElementById(id);
let currentWeather = null;
let currentCoords = null;
let unit = localStorage.getItem("skycast-unit") || "metric";
let favorites = JSON.parse(localStorage.getItem("skycast-favorites") || "[]");
let recentCities = JSON.parse(localStorage.getItem("skycast-recents") || "[]");

const unitSymbol = () => unit === "metric" ? "°C" : "°F";
const temperature = (celsius) => {
  const value = unit === "metric" ? celsius : (celsius * 9 / 5) + 32;
  return `${Math.round(value)}°`;
};
const windUnit = () => unit === "metric" ? "m/s" : "mph";
const windValue = (mps) => unit === "metric" ? mps : mps * 2.23694;
const iconUrl = (icon) => `https://openweathermap.org/img/wn/${icon}@2x.png`;

function setLoading(loading) {
  $("loader").classList.toggle("active", loading);
  $("searchBtn").disabled = loading;
  $("searchBtn").innerHTML = loading ? "Loading…" : 'Search <span>↗</span>';
}
function showError(message) { $("error").textContent = message || ""; }

async function api(url) {
  const response = await fetch(url);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) throw new Error("Weather API key is invalid or not activated. Check the API key in script.js.");
    if (response.status === 404) throw new Error("We couldn't find that city. Check the spelling and try again.");
    if (response.status === 429) throw new Error("Weather API rate limit reached. Please try again in a little while.");
    throw new Error(data.message || "Weather data couldn't be loaded. Please try again.");
  }
  return data;
}

async function getWeatherByCity() {
  const cityName = $("cityInput").value.trim();
  if (!cityName) { showError("Enter a city name to search."); $("cityInput").focus(); return; }
  setLoading(true); showError("");
  try {
    const query = encodeURIComponent(cityName);
    const weather = await api(`https://api.openweathermap.org/data/2.5/weather?q=${query}&units=metric&appid=${apiKey}`);
    currentCoords = { lat: weather.coord.lat, lon: weather.coord.lon };
    await loadDashboard(weather, cityName);
  } catch (error) { showError(error.message); }
  finally { setLoading(false); }
}

async function getCurrentLocation() {
  showError("");
  if (!navigator.geolocation) { showError("Location isn't supported by this browser. Search for a city instead."); return; }
  setLoading(true);
  navigator.geolocation.getCurrentPosition(async position => {
    try {
      const { latitude: lat, longitude: lon } = position.coords;
      currentCoords = { lat, lon };
      const weather = await api(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`);
      await loadDashboard(weather, weather.name);
    } catch (error) { showError(error.message); }
    finally { setLoading(false); }
  }, () => {
    setLoading(false);
    showError("Location permission was denied or unavailable. You can still search by city.");
  }, { enableHighAccuracy: false, timeout: 10000 });
}

async function loadDashboard(weather, searchedName) {
  currentWeather = weather;
  $("cityInput").value = searchedName || weather.name;
  const forecastPromise = api(`https://api.openweathermap.org/data/2.5/forecast?lat=${weather.coord.lat}&lon=${weather.coord.lon}&units=metric&appid=${apiKey}`);
  const airPromise = api(`https://api.openweathermap.org/data/2.5/air_pollution?lat=${weather.coord.lat}&lon=${weather.coord.lon}&appid=${apiKey}`).catch(() => null);
  const [forecast, air] = await Promise.all([forecastPromise, airPromise]);
  displayCurrent(weather, forecast);
  displayForecast(forecast);
  displayHourly(forecast);
  displaySun(weather);
  displayAir(air);
  displayInsight(weather);
  addRecent(weather.name);
  renderFavorites();
}

function displayCurrent(data, forecast) {
  const today = forecast.list.filter(item => item.dt_txt.startsWith(new Date().toISOString().slice(0,10)));
  const temps = (today.length ? today : forecast.list.slice(0,8)).map(item => item.main.temp);
  $("cityName").textContent = `${data.name}, ${data.sys.country || ""}`;
  $("currentDate").textContent = new Date().toLocaleDateString(undefined, { weekday:"long", month:"long", day:"numeric" });
  $("temperature").innerHTML = `${temperature(data.main.temp).replace("°","")}<sup>°</sup>`;
  $("condition").textContent = data.weather[0].description;
  $("weatherEmoji").textContent = weatherEmoji(data.weather[0].id, data.weather[0].icon);
  $("highTemp").textContent = temperature(Math.max(...temps));
  $("lowTemp").textContent = temperature(Math.min(...temps));
  $("feelsLike").textContent = `Feels like ${temperature(data.main.feels_like)}`;
  $("weatherDescription").textContent = `Cloud cover ${data.clouds?.all ?? 0}%`;
  $("humidity").innerHTML = `${data.main.humidity}<small>%</small>`;
  $("wind").innerHTML = `${Math.round(windValue(data.wind.speed))}<small> ${windUnit()}</small>`;
  $("windDirection").textContent = `Direction ${compass(data.wind.deg || 0)}`;
  $("pressure").innerHTML = `${data.main.pressure}<small> hPa</small>`;
  $("visibility").innerHTML = `${(data.visibility / 1000).toFixed(1)}<small> km</small>`;
}
function weatherEmoji(id, icon) {
  if (id >= 200 && id < 300) return "⛈️";
  if (id >= 300 && id < 600) return "🌧️";
  if (id >= 600 && id < 700) return "❄️";
  if (id >= 700 && id < 800) return "🌫️";
  if (id === 800) return icon?.includes("n") ? "🌙" : "☀️";
  if (id === 801 || id === 802) return "🌤️";
  return "☁️";
}
function compass(deg) { return ["N","NE","E","SE","S","SW","W","NW"][Math.round(deg / 45) % 8]; }
function displayForecast(data) {
  const daily = new Map();
  data.list.forEach(item => {
    const date = item.dt_txt.split(" ")[0];
    if (!daily.has(date)) daily.set(date, []);
    daily.get(date).push(item);
  });
  const days = [...daily.values()].slice(0, 5);
  $("forecast").innerHTML = days.map((items, index) => {
    const midday = items.reduce((best, item) => Math.abs(Number(item.dt_txt.slice(11,13))-12) < Math.abs(Number(best.dt_txt.slice(11,13))-12) ? item : best, items[0]);
    const high = Math.max(...items.map(i => i.main.temp_max));
    const low = Math.min(...items.map(i => i.main.temp_min));
    const day = new Date(`${midday.dt_txt.slice(0,10)}T12:00:00`);
    const label = index === 0 ? "Today" : day.toLocaleDateString(undefined,{weekday:"short"});
    return `<div class="forecast-row"><span class="forecast-day">${label}</span><span class="forecast-weather"><img src="${iconUrl(midday.weather[0].icon)}" alt=""><span>${midday.weather[0].main}</span></span><span class="forecast-temp">${temperature(high)} <span>${temperature(low)}</span></span><span class="rain-chance">☂ ${Math.round((midday.pop || 0)*100)}%</span></div>`;
  }).join("");
}
function displayHourly(data) {
  const upcoming = data.list.slice(0, 8);
  $("hourlyForecast").innerHTML = upcoming.map(item => {
    const date = new Date(item.dt * 1000);
    const label = date.toLocaleTimeString(undefined,{hour:"numeric"});
    return `<div class="hour-card"><p>${label}</p><img src="${iconUrl(item.weather[0].icon)}" alt="${item.weather[0].description}"><strong>${temperature(item.main.temp)}</strong><small>☂ ${Math.round((item.pop || 0)*100)}%</small></div>`;
  }).join("");
}
function displaySun(data) {
  const sunrise = new Date(data.sys.sunrise * 1000);
  const sunset = new Date(data.sys.sunset * 1000);
  const format = d => d.toLocaleTimeString(undefined,{hour:"numeric",minute:"2-digit"});
  $("sunrise").textContent = format(sunrise);
  $("sunset").textContent = format(sunset);
  const daylight = Math.max(0, data.sys.sunset - data.sys.sunrise);
  const hours = Math.floor(daylight / 3600);
  const mins = Math.round((daylight % 3600) / 60);
  $("daylightText").textContent = `About ${hours}h ${mins}m of daylight today.`;
  const now = Date.now()/1000;
  const progress = Math.min(1, Math.max(0, (now-data.sys.sunrise)/(data.sys.sunset-data.sys.sunrise)));
  $("sunPosition").style.left = `${5 + progress*90}%`;
  $("sunPosition").style.top = `${8 + Math.sin(progress*Math.PI)*46}px`;
}
function displayAir(data) {
  if (!data?.list?.[0]) {
    $("aqiNumber").textContent = "--"; $("aqiLabel").textContent = "Unavailable";
    $("aqiSummary").textContent = "Air quality data is not available for this location right now.";
    $("pm25").textContent = "--"; $("pm10").textContent = "--"; $("ozone").textContent = "--"; return;
  }
  const item = data.list[0], c = item.components, levels = ["Good","Fair","Moderate","Poor","Very poor"];
  const labels = ["Good","Fair","Moderate","Poor","Very poor"];
  const descriptions = ["Air quality is good. Enjoy outdoor activities.","Air quality is acceptable for most people.","Sensitive people may want to reduce prolonged outdoor exertion.","Consider limiting extended outdoor activity.","Consider limiting outdoor activity, especially if sensitive."];
  const index = item.main.aqi - 1;
  $("aqiNumber").textContent = item.main.aqi;
  $("aqiLabel").textContent = labels[index] || "Unknown";
  $("aqiSummary").textContent = descriptions[index] || "Air quality index returned by the provider.";
  $("pm25").textContent = `${Number(c.pm2_5).toFixed(1)} µg/m³`;
  $("pm10").textContent = `${Number(c.pm10).toFixed(1)} µg/m³`;
  $("ozone").textContent = `${Number(c.o3).toFixed(1)} µg/m³`;
  $("aqiNumber").style.color = ["#35b980","#a5bf3d","#d6a52f","#e78b4c","#d95e70"][index] || "var(--ink)";
}
function displayInsight(data) {
  const id = data.weather[0].id, temp = data.main.temp, wind = data.wind.speed;
  let title = "A good day to get things done", text = "Conditions look fairly settled. Check the hourly outlook before heading out.", icon = "✧";
  if (id >= 200 && id < 600) { title = "Keep a rain plan handy"; text = "Rain or storm conditions are reported. Consider carrying an umbrella and allow extra travel time."; icon = "☂"; }
  else if (id >= 600 && id < 700) { title = "Bundle up before heading out"; text = "Snow conditions are reported. Dress for the cold and check local travel updates."; icon = "❄"; }
  else if (temp >= 35) { title = "Take the heat seriously"; text = "It is very warm. Drink water, seek shade and avoid intense activity during the hottest hours."; icon = "☀"; }
  else if (temp <= 8) { title = "A colder day outside"; text = "Layer up and plan for cooler conditions, especially early and late in the day."; icon = "❄"; }
  else if (wind >= 10) { title = "A breezy day ahead"; text = "Winds are strong enough to notice. Secure loose outdoor items and take care when cycling."; icon = "↗"; }
  $("insightIcon").textContent = icon; $("insightTitle").textContent = title; $("insightText").textContent = text;
  const alert = $("weatherAlert");
  if (id >= 200 && id < 600) { alert.classList.remove("hidden"); $("alertText").textContent = "Rain/storm conditions reported. Check local official alerts for severe weather."; }
  else if (temp >= 38) { alert.classList.remove("hidden"); $("alertText").textContent = "High temperature detected. Stay hydrated and limit heat exposure."; }
  else { alert.classList.add("hidden"); }
}
function addRecent(city) {
  recentCities = [city, ...recentCities.filter(c => c.toLowerCase() !== city.toLowerCase())].slice(0, 6);
  localStorage.setItem("skycast-recents", JSON.stringify(recentCities));
}
function renderFavorites() {
  const root = $("favoritesList");
  if (!favorites.length) { root.innerHTML = '<p class="muted small">Save a city to find it here.</p>'; return; }
  root.innerHTML = favorites.map(city => `<button class="favorite-city" data-city="${escapeHtml(city)}"><span>⌖ &nbsp;${escapeHtml(city)}</span><small>↗</small></button>`).join("");
  root.querySelectorAll("[data-city]").forEach(button => button.addEventListener("click", () => {
    $("cityInput").value = button.dataset.city; getWeatherByCity();
  }));
}
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[char]));
}
function toggleFavorite() {
  if (!currentWeather) { showError("Search for a city before saving it."); return; }
  const city = currentWeather.name;
  if (favorites.some(c => c.toLowerCase() === city.toLowerCase())) {
    favorites = favorites.filter(c => c.toLowerCase() !== city.toLowerCase());
  } else {
    favorites = [...favorites, city].slice(-8);
  }
  localStorage.setItem("skycast-favorites", JSON.stringify(favorites));
  renderFavorites();
  $("addCurrentFavorite").textContent = favorites.some(c => c.toLowerCase() === city.toLowerCase()) ? "✓" : "+";
}
function clearDashboard() {
  currentWeather = null; currentCoords = null;
  $("cityInput").value = ""; showError("");
  $("cityName").textContent = "Search for a city";
  $("currentDate").textContent = "Your local forecast starts here";
  $("temperature").innerHTML = '--<sup>°</sup>'; $("condition").textContent = "Waiting for weather data";
  $("weatherEmoji").textContent = "🌤️"; $("highTemp").textContent = "--°"; $("lowTemp").textContent = "--°";
  $("feelsLike").textContent = "Feels like --°"; $("weatherDescription").textContent = "Search any city to begin";
  ["humidity","wind","pressure","visibility"].forEach(id => $(id).innerHTML = "--");
  $("windDirection").textContent = "Current wind conditions";
  $("forecast").innerHTML = '<div class="empty-state">Your five-day forecast will appear here after a search.</div>';
  $("hourlyForecast").innerHTML = '<div class="empty-state">Hourly conditions appear after a search.</div>';
  $("sunrise").textContent = "--:--"; $("sunset").textContent = "--:--"; $("daylightText").textContent = "Check daylight hours for your selected city.";
  $("aqiNumber").textContent = "--"; $("aqiLabel").textContent = "Awaiting data"; $("aqiSummary").textContent = "Search a city to check its air quality.";
  $("pm25").textContent = "--"; $("pm10").textContent = "--"; $("ozone").textContent = "--";
  $("insightIcon").textContent = "☀"; $("insightTitle").textContent = "Ready when you are"; $("insightText").textContent = "Search for a city to receive a practical summary based on current conditions."; $("weatherAlert").classList.add("hidden");
}
function toggleTheme() {
  const dark = document.body.classList.toggle("dark");
  localStorage.setItem("skycast-theme", dark ? "dark" : "light");
  $("themeToggle").innerHTML = dark ? "<span>☼</span> Switch appearance" : "<span>◐</span> Switch appearance";
}
function applyUnits() {
  $("unitToggle").innerHTML = unit === "metric" ? '<strong>°C</strong> <span>/</span> °F' : '°C <span>/</span> <strong>°F</strong>';
  if (currentWeather) {
    // Refresh data from the stored metric response and convert for display.
    const weather = currentWeather;
    const fakeForecast = { list: [{dt_txt:new Date().toISOString().slice(0,10)+" 12:00:00", main:{temp:weather.main.temp,temp_min:weather.main.temp_min,temp_max:weather.main.temp_max}}] };
    $("temperature").innerHTML = `${temperature(weather.main.temp).replace("°","")}<sup>°</sup>`;
    $("condition").textContent = weather.weather[0].description;
    $("highTemp").textContent = temperature(weather.main.temp_max);
    $("lowTemp").textContent = temperature(weather.main.temp_min);
    $("feelsLike").textContent = `Feels like ${temperature(weather.main.feels_like)}`;
    $("wind").innerHTML = `${Math.round(windValue(weather.wind.speed))}<small> ${windUnit()}</small>`;
  }
}
$("searchBtn").addEventListener("click", getWeatherByCity);
$("cityInput").addEventListener("keydown", event => { if (event.key === "Enter") getWeatherByCity(); });
$("locationBtn").addEventListener("click", getCurrentLocation);
$("themeToggle").addEventListener("click", toggleTheme);
$("unitToggle").addEventListener("click", () => {
  unit = unit === "metric" ? "imperial" : "metric";
  localStorage.setItem("skycast-unit", unit);
  applyUnits();
  if (currentWeather) {
    // Update forecast rows from the metric data retained in the current forecast response on the next refresh.
    getWeatherByCity();
  }
});
$("addCurrentFavorite").addEventListener("click", toggleFavorite);
$("refreshBtn").addEventListener("click", () => currentWeather ? getWeatherByCity() : getCurrentLocation());
$("clearBtn").addEventListener("click", clearDashboard);
document.querySelectorAll("[data-scroll]").forEach(button => button.addEventListener("click", () => {
  const target = button.dataset.scroll === "top" ? $("top") : $(button.dataset.scroll);
  target?.scrollIntoView({ behavior:"smooth", block:"start" });
  document.querySelectorAll(".side-link").forEach(link => link.classList.toggle("active", link === button));
}));
if (localStorage.getItem("skycast-theme") === "dark") document.body.classList.add("dark");
renderFavorites();
applyUnits();
