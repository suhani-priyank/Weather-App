const apiKey = "17c2222e183af47a0183663124b6b66e";

function showLoader(show) {
  document.getElementById("loader").style.display = show ? "block" : "none";
}

async function fetchWeather(url) {
  showLoader(true);
  const res = await fetch(url);
  if (!res.ok) throw new Error("Error");
  const data = await res.json();
  showLoader(false);
  return data;
}


async function getWeatherByCity() {
  const city = cityInput.value;
  if (!city) return;

  try {
    const weather = await fetchWeather(
      `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${apiKey}`
    );
    displayWeather(weather);
    getForecast(weather.coord.lat, weather.coord.lon);
  } catch {
    error.textContent = "City not found";
    showLoader(false);
  }
}


function getCurrentLocation() {
  navigator.geolocation.getCurrentPosition(async pos => {
    const { latitude, longitude } = pos.coords;

    const weather = await fetchWeather(
      `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&units=metric&appid=${apiKey}`
    );
    displayWeather(weather);
    getForecast(latitude, longitude);
  });
}


function displayWeather(data) {
  error.textContent = "";
  city.textContent = data.name;
  temp.textContent = `🌡 ${data.main.temp}°C`;
  condition.textContent = data.weather[0].description;
  humidity.textContent = `💧 ${data.main.humidity}%`;
  icon.src = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;
}

// 📅 5-day forecast
async function getForecast(lat, lon) {
  const data = await fetchWeather(
    `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`
  );

  forecast.innerHTML = "";

  for (let i = 0; i < data.list.length; i += 8) {
    const day = data.list[i];
    forecast.innerHTML += `
      <div>
        <p>${new Date(day.dt_txt).toDateString().slice(0,3)}</p>
        <img src="https://openweathermap.org/img/wn/${day.weather[0].icon}.png">
        <p>${day.main.temp}°C</p>
      </div>
    `;
  }
}


function toggleDarkMode() {
  document.body.classList.toggle("dark");
}


function clearWeather() {
  cityInput.value = "";
  city.textContent = "";
  temp.textContent = "";
  condition.textContent = "";
  humidity.textContent = "";
  icon.src = "";
  forecast.innerHTML = "";
  error.textContent = "";
  showLoader(false);
}
