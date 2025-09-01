'use strict';

// 1. DOMContentLoaded 이벤트 리스너: HTML 문서가 준비되면 실행
document.addEventListener('DOMContentLoaded', () => {
   console.log('DOM 준비');
   if (typeof kakao !== 'undefined' && kakao.maps) {
      kakao.maps.load(() => {
         console.log('카카오맵 API 및 라이브러리 준비 완료');
         // 앱의 모든 기능을 초기화하고 실행하는 메인 함수 호출
         initializeApp();
      });
   } else {
      console.error(
         '카카오맵 API 스크립트가 로드되지 않았습니다. index.html 파일을 확인하세요.',
      );
      // API 스크립트가 없어도 지도 외의 기능은 동작하도록 처리
      initializeApp();
   }
});

/**
 * 앱의 모든 기능을 초기화하고 실행하는 메인 함수
 */
function initializeApp() {
   // ===================================================
   // 이벤트 리스너 및 초기 실행 함수
   // ===================================================

   // 모바일 메뉴 토글 이벤트 리스너 설정
   const mMenu = document.querySelector('.m-menu');
   const pcMenu = document.querySelector('.nav-menu ul');
   if (mMenu && pcMenu) {
      mMenu.addEventListener('click', () => {
         pcMenu.classList.toggle('active');
      });
   }

   updateClock();
   setInterval(updateClock, 1000);

   // 메인 날씨 정보 가져오기 실행
   navigator.geolocation.getCurrentPosition(onGeoOk, onGeoError);

   // ===================================================
   // API 키 설정
   // ===================================================
   const API_KEY = '6d37c03a327b0ee12edb5baa05994a28';

   // ===================================================
   // 메인 함수 정의
   // ===================================================

   /**
    * 위치 정보 가져오기 성공 시 실행되는 함수
    */
   function onGeoOk(position) {
      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;
      console.log(`현재 위치: 위도 ${latitude}, 경도 ${longitude}`);

      // kakao 객체가 있을 경우에만 지도 초기화
      if (typeof kakao !== 'undefined' && kakao.maps) {
         initializeWeatherMap(latitude, longitude);
      }

      const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${API_KEY}&units=metric&lang=kr`;
      const airPollutionUrl = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${latitude}&lon=${longitude}&appid=${API_KEY}`;
      const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&appid=${API_KEY}&units=metric&lang=kr`;
      const uvUrl = `https://api.openweathermap.org/data/2.5/uvi?lat=${latitude}&lon=${longitude}&appid=${API_KEY}`;

      Promise.all([
         fetch(weatherUrl),
         fetch(airPollutionUrl),
         fetch(forecastUrl),
         fetch(uvUrl),
      ])
         .then((responses) => Promise.all(responses.map((res) => res.json())))
         .then(([weatherData, airData, forecastData, uvDate]) => {
            // ----- 날씨 데이터 처리 -----
            if (weatherData && weatherData.main) {
               updateCurrentWeatherUI(weatherData);
            }

            // ----- 대기 질 데이터 처리 -----
            if (airData && airData.list) {
               updateAirQualityUI(airData);
            }

            // ----- 예보 데이터 처리 -----
            if (forecastData && forecastData.list) {
               updateHourlyForecast(forecastData.list);
               // Chart.js가 로드되었는지 확인 후 그래프 그리기
               if (typeof Chart !== 'undefined') {
                  drawTempChart(forecastData.list);
               } else {
                  console.error('Chart.js 라이브러리가 로드되지 않았습니다.');
               }
               updateWeeklyForecast(forecastData.list);
            }

            // ----- 생활 지수 데이터 처리 -----
            if (weatherData && uvDate) {
               updateLifestyleInfo(weatherData, uvDate);
            }
            if (weatherData && forecastData && uvDate) {
               updateLifestyleInfo(weatherData, uvDate);

               updateOutfitSuggestion(weatherData, forecastData, uvDate);
            }
         })

         .catch((error) => {
            console.error('데이터를 가져오는 중 오류 발생:', error);
            alert(
               '데이터를 불러오는 데 실패했습니다. 잠시 후 다시 시도해주세요.',
            );
         });
   }

   /**
    * 위치 정보 가져오기 실패 시 실행되는 함수
    */
   function onGeoError(err) {
      console.error('위치 정보 에러:', err);
      switch (err.code) {
         case err.PERMISSION_DENIED:
            alert(
               '위치 권한이 거부되었습니다. 브라우저 설정에서 허용해주세요.',
            );
            break;
         case err.POSITION_UNAVAILABLE:
            alert('위치 정보를 사용할 수 없습니다.');
            break;
         case err.TIMEOUT:
            alert('위치 정보를 가져오는데 시간이 초과되었습니다.');
            break;
         default:
            alert('알 수 없는 오류로 위치를 가져올 수 없습니다.');
      }
   }

   // ===================================================
   // 지도 기능 관련 함수
   // ===================================================
   function initializeWeatherMap(lat, lon) {
      const mapContainer = document.getElementById('map');
      if (!mapContainer) return;

      const mapOption = {
         center: new kakao.maps.LatLng(lat, lon),
         level: 9,
      };
      const map = new kakao.maps.Map(mapContainer, mapOption);
      map.addControl(
         new kakao.maps.MapTypeControl(),
         kakao.maps.ControlPosition.TOPRIGHT,
      );
      map.addControl(
         new kakao.maps.ZoomControl(),
         kakao.maps.ControlPosition.RIGHT,
      );

      let currentOverlay = null;

      function setImageOverlay(imgSrc) {
         if (currentOverlay) currentOverlay.setMap(null);
         if (!imgSrc) return;
         const overlayBounds = new kakao.maps.LatLngBounds(
            new kakao.maps.LatLng(32.5, 123.5),
            new kakao.maps.LatLng(39.5, 132.0),
         );
         currentOverlay = new kakao.maps.ImageOverlay(imgSrc, overlayBounds, {
            opacity: 0.7,
            zIndex: 3,
         });
         currentOverlay.setMap(map);
      }

      const btnRadar = document.getElementById('btn-radar');
      const btnSatellite = document.getElementById('btn-satellite');
      const btnNone = document.getElementById('btn-none');
      const mapBtns = document.querySelectorAll('.map-btn');

      function setActiveButton(activeBtn) {
         mapBtns.forEach((btn) => btn.classList.remove('active'));
         if (activeBtn) activeBtn.classList.add('active');
      }

      if (btnRadar)
         btnRadar.addEventListener('click', () => {
            const radarImgSrc =
               'https://www.weather.go.kr/DFS/MAP/NWP/H03/H03_H03_010_2000_F.png?t=' +
               new Date().getTime();
            setImageOverlay(radarImgSrc);
            setActiveButton(btnRadar);
         });

      if (btnSatellite)
         btnSatellite.addEventListener('click', () => {
            const satelliteImgSrc =
               'https://www.weather.go.kr/repositary/image/sat/amc/KOREA/amc_KOREA_rgb_10min.png?t=' +
               new Date().getTime();
            setImageOverlay(satelliteImgSrc);
            setActiveButton(btnSatellite);
         });

      if (btnNone)
         btnNone.addEventListener('click', () => {
            setImageOverlay(null);
            setActiveButton(btnNone);
         });

      if (btnRadar) btnRadar.click();
   }

   // ===================================================
   // ✅ [신규 추가] 옷차림 추천 기능 함수
   // ===================================================

   function updateOutfitSuggestion(weatherData, forecastData, uvData) {
      const maxTemp = weatherData.main.temp_max;
      const minTemp = weatherData.main.temp_min;
      const weatherStatus = weatherData.weather[0].main;
      const uvValue = uvData.value;
      const tempDiff = maxTemp - minTemp; // 일교차

      let summary = '';
      let imageSrc = '';
      let items = [];
      let timeTip = '';

      // 1. 기온 기반 기본 옷차림 결정
      if (maxTemp >= 28) {
         summary = '푹푹 찌는 더위! 시원한 여름 옷차림이 필수예요.';
         imageSrc = './assets/icons/uv-index.png';
         items.push({ icon: '👕', name: '반소매, 민소매' });
         items.push({ icon: '👖', name: '반바지, 얇은 바지' });
         items.push({ icon: '👡', name: '샌들, 슬리퍼' });
      } else if (maxTemp >= 23) {
         summary =
            '활동하기 좋은 따뜻한 날씨네요. \n 가벼운 옷차림을 준비하세요.';
         imageSrc = './assets/icons/uv-index.png';
         items.push({ icon: '👕', name: '반소매' });
         items.push({ icon: '👖', name: '면바지, 긴바지' });
         items.push({ icon: '👟', name: '운동화' });
      } else if (maxTemp >= 17) {
         summary = '선선한 봄가을 날씨! 얇은 긴팔 옷이 적당해요.';
         imageSrc = './assets/icons/uv-index.png';
         items.push({ icon: '👚', name: '얇은 니트, 맨투맨' });
         items.push({ icon: '👖', name: '청바지, 슬랙스' });
      } else if (maxTemp >= 10) {
         summary = '쌀쌀한 날씨, 여러 겹 겹쳐 입는 걸 추천해요.';
         imageSrc = './assets/icons/uv-index.png';
         items.push({ icon: '🧥', name: '자켓, 가디건' });
         items.push({ icon: '🧣', name: '스카프 (선택)' });
         items.push({ icon: '👖', name: '따뜻한 바지' });
      } else {
         summary = '두툼한 겨울 옷으로 완전 무장! 감기 조심하세요.';
         imageSrc = './assets/icons/uv-index.png';
         items.push({ icon: '🧥', name: '패딩, 두꺼운 코트' });
         items.push({ icon: '🧤', name: '목도리, 장갑' });
         items.push({ icon: '👢', name: '부츠' });
      }

      // 2. 추가 조건에 따른 아이템 추가
      if (tempDiff >= 10) {
         items.push({ icon: '겉옷', name: '가벼운 겉옷 챙기기' });
      }
      if (
         weatherStatus === 'Rain' ||
         weatherStatus === 'Drizzle' ||
         weatherStatus === 'Thunderstorm'
      ) {
         items.push({ icon: '☂️', name: '우산 필수!' });
         items.push({ icon: '👟', name: '젖어도 되는 신발' });
      }
      if (uvValue >= 6) {
         items.push({ icon: '🧴', name: '자외선 차단제' });
         items.push({ icon: '🧢', name: '모자, 선글라스' });
      }

      // 3. 시간대별 팁 생성
      const morningTemp = forecastData.list[0].main.temp; // 아침 기온
      const afternoonTemp = forecastData.list[3].main.temp; // 약 9시간 후 낮 기온
      if (afternoonTemp - morningTemp >= 7) {
         timeTip = `오전에는 ${Math.round(morningTemp)}°로 쌀쌀하지만, 낮에는 ${Math.round(afternoonTemp)}°까지 올라 더워져요. 속에 가벼운 옷을 입고 겉옷을 챙기세요.`;
      } else {
         timeTip = `오늘은 큰 기온 변화 없이 비슷한 날씨가 유지될 예정이에요. 활동 계획에 참고하세요!`;
      }

      // 4. HTML 요소에 데이터 업데이트
      document.getElementById('outfit-summary').innerText = summary;
      document.getElementById('outfit-image').src = imageSrc;
      document.getElementById('time-tip').innerText = timeTip;

      const itemListElement = document.getElementById('item-list');
      itemListElement.innerHTML = ''; // 기존 목록 비우기
      items.forEach((item) => {
         const li = document.createElement('li');
         li.innerHTML = `<span class="item-icon">${item.icon}</span> <span class="item-name">${item.name}</span>`;
         itemListElement.appendChild(li);
      });
   }

   // ===================================================
   // UI 업데이트 함수들 (가독성을 위해 기능별로 분리)
   // ===================================================

   function updateCurrentWeatherUI(weatherData) {
      const currentTemp = weatherData.main.temp;
      const feelsLikeTemp = weatherData.main.feels_like;
      const minTemp = weatherData.main.temp_min;
      const maxTemp = weatherData.main.temp_max;
      const humidity = weatherData.main.humidity;
      const precipitation = weatherData.rain ? weatherData.rain['1h'] : 0;
      const windSpeed = weatherData.wind.speed;
      const weatherStatus = weatherData.weather[0].main;
      const locationName = weatherData.name;
      const sunriseTimestamp = weatherData.sys.sunrise;
      const sunsetTimestamp = weatherData.sys.sunset;
      const customMessage = getCustomWeatherMessage(weatherStatus, currentTemp);

      console.log(
         `온도: ${currentTemp}°C, 날씨: ${weatherStatus}, 지역: ${locationName}`,
      );

      updateBackground(weatherStatus);
      updateSunriseSunset(sunriseTimestamp, sunsetTimestamp);

      document.querySelector('.current-temp').innerText =
         `${Math.round(currentTemp)}°`;
      document.querySelector('.feels-like').innerText =
         `체감 ${Math.round(feelsLikeTemp)}°`;
      document.querySelector('.minmax-temp').innerText =
         `최저 ${Math.round(minTemp)}° \n 최고 ${Math.round(maxTemp)}°`;
      document.querySelector('.wind-speed').innerText = `${windSpeed} m/s`;
      document.querySelector('.humidity').innerText = `${humidity}%`;
      document.querySelector('.precipitation').innerText =
         `${precipitation} mm`;
      document.querySelector('#weather-desc').innerText = weatherStatus;
      document.querySelector('.current-location').innerText = locationName;
      document.querySelector('.weather-description-detail').innerText =
         customMessage;

      const iconElement = document.querySelector('#weather-icon');
      if (weatherStatus === 'Clear') {
         iconElement.src = './assets/icons/uv-index.png';
      } else if (weatherStatus === 'Clouds') {
         iconElement.src = './assets/icons/weather-condition.png';
      } else if (weatherStatus === 'Rain' || weatherStatus === 'Drizzle') {
         iconElement.src = './assets/icons/hourly-forecast.png';
      } else if (weatherStatus === 'Thunderstorm') {
         iconElement.src = './assets/icons/weather-alert.png';
      } else if (weatherStatus === 'Snow') {
         iconElement.src = './assets/icons/snow.png';
      } else if (
         weatherStatus === 'Mist' ||
         weatherStatus === 'Haze' ||
         weatherStatus === 'Fog'
      ) {
         iconElement.src = './assets/icons/air-quality.png';
      } else {
         iconElement.src = './assets/icons/weather-condition.png';
      }
   }

   function updateAirQualityUI(airData) {
      const aqi = airData.list[0].main.aqi;
      let aqiText = '';
      let aqiAdvice = '';

      switch (aqi) {
         case 1:
            aqiText = '최고! 아주 좋아요 👍';
            aqiAdvice = '창문을 활짝 열고 \n 맑은 공기를 만끽하세요!';
            break;
         case 2:
            aqiText = '괜찮아요, 보통이에요 🙂';
            aqiAdvice = '큰 걱정 없이 편안하게 \n 야외 활동을 즐길 수 있어요.';
            break;
         case 3:
            aqiText = '조금 나쁨 😷';
            aqiAdvice =
               '민감하신 분들은 장시간 외출 시 마스크 착용을 고려해 보세요.';
            break;
         case 4:
            aqiText = '나쁨! 주의하세요 😠';
            aqiAdvice =
               '가급적 외출을 줄이고, \n 외출 시에는 KF80 이상 마스크를 꼭 착용하세요.';
            break;
         case 5:
            aqiText = '매우 나쁨! 위험해요 👿';
            aqiAdvice =
               '오늘은 실내에 머무르는 것이 가장 좋습니다. \n 창문은 꼭 닫아두세요!';
            break;
         default:
            aqiText = '정보 없음';
            aqiAdvice = '현재 대기 질 정보를 가져올 수 없어요.';
      }

      console.log(`대기 질: ${aqiText} (AQI: ${aqi})`);

      const airQualityTextElement = document.querySelector('.air-quality-text');
      const airQualityAdviceElement = document.querySelector(
         '.air-quality-advice',
      );

      if (airQualityTextElement && airQualityAdviceElement) {
         airQualityTextElement.innerText = aqiText;
         airQualityAdviceElement.innerText = aqiAdvice;
      }
   }

   // ===================================================
   // 기타 유틸리티 및 기능 함수들
   // ===================================================

   function getCustomWeatherMessage(status, temp) {
      switch (status) {
         case 'Clear':
            if (temp > 25)
               return '쨍한 햇살이 기분 좋은 날이에요! ☀️\n가벼운 옷차림으로 상쾌한 하루를 만끽해 보세요.';
            if (temp > 15)
               return '청명한 하늘 아래, 완벽한 산책 날씨네요.\n잠깐이라도 밖에서 가을 공기를 느껴보는 건 어떠세요?';
            return '하늘은 맑지만 공기가 제법 차가워요.\n따뜻한 외투 하나 꼭 챙겨서 감기 조심하세요!';
         case 'Clouds':
            if (temp > 20)
               return '구름이 햇살을 가려주어 활동하기 좋은 날입니다.\n가까운 공원에서 가볍게 걸으며 여유를 즐겨보세요.';
            return '조금 흐리지만, 오히려 차분한 분위기를 즐길 수 있어요.\n좋아하는 음악과 함께 사색에 잠겨보는 것도 좋겠네요.';
         case 'Rain':
         case 'Drizzle':
            return '촉촉하게 비가 내리는 감성적인 하루네요. ☔️\n따뜻한 커피 한 잔과 함께 빗소리를 즐겨보세요.';
         case 'Thunderstorm':
            return '천둥 번개가 치며 요란한 비가 내리고 있어요.\n오늘은 창밖 풍경을 즐기며 안전하게 실내에 머무르세요.';
         case 'Snow':
            return '하늘에서 아름다운 눈이 펑펑 내리고 있어요! ❄️\n창밖의 겨울 왕국을 감상하며 포근한 하루 보내세요.';
         case 'Mist':
         case 'Haze':
         case 'Fog':
            return '안개가 세상을 신비롭게 감싸고 있는 아침입니다.\n외출 시에는 주변을 잘 살피고, 안전 운전 잊지 마세요.';
         default:
            return '어떤 날씨든, 당신의 하루는 분명 특별할 거예요.\n오늘도 힘내세요!';
      }
   }

   function updateBackground(status) {
      const todayContainer = document.querySelector('.today-container');
      if (!todayContainer) return;
      let imageUrl = './assets/images/section02/default.png';
      if (status === 'Clear') imageUrl = './assets/images/section02/clear.jpg';
      else if (status === 'Clouds')
         imageUrl = './assets/images/section02/clouds.jpg';
      else if (
         status === 'Rain' ||
         status === 'Drizzle' ||
         status === 'Thunderstorm'
      )
         imageUrl = './assets/images/section02/rain.jpg';
      else if (status === 'Snow')
         imageUrl = './assets/images/section02/snow.jpg';
      else if (status === 'Mist' || status === 'Haze' || status === 'Fog')
         imageUrl = './assets/images/section02/fog.jpg';
      todayContainer.style.backgroundImage = `url(${imageUrl})`;
   }

   function updateSunriseSunset(sunriseTimestamp, sunsetTimestamp) {
      const sunriseTime = formatTime(sunriseTimestamp);
      const sunsetTime = formatTime(sunsetTimestamp);
      document.querySelector('.sunrise-time').innerText = sunriseTime;
      document.querySelector('.sunset-time').innerText = sunsetTime;
      const now = new Date().getTime() / 1000;
      const totalDaylight = sunsetTimestamp - sunriseTimestamp;
      let progress = ((now - sunriseTimestamp) / totalDaylight) * 100;
      if (progress < 0) progress = 0;
      if (progress > 100) progress = 100;
      document.querySelector('.sun-progress-bar').style.width = `${progress}%`;
   }

   function formatTime(timestamp) {
      const date = new Date(timestamp * 1000);
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
   }

   function updateClock() {
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');
      const seconds = now.getSeconds().toString().padStart(2, '0');
      const timeElement = document.querySelector('.current-time');
      if (timeElement) {
         timeElement.innerText = `${hours}:${minutes}:${seconds}`;
      }
   }

   function updateHourlyForecast(forecastList) {
      const sliderTrack = document.querySelector('.slider-track');
      if (!sliderTrack) return;
      const next24Hours = forecastList.slice(0, 8);
      let hourlyHtml = '';
      next24Hours.forEach((item, index) => {
         const date = new Date(item.dt * 1000);
         const hours = date.getHours();
         const timeString = `${hours}시`;
         const iconCode = item.weather[0].icon;
         const iconUrl = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
         const temp = Math.round(item.main.temp);
         const isNow = index === 0 ? 'now' : '';
         hourlyHtml += `
         <div class="hourly-item ${isNow}">
            <span class="item"> ${timeString}</span>
            <img src="${iconUrl}" alt="${item.weather[0].description}" class="weather-icon"> 
            <span class="temp">${temp}°</span>
         </div>`;
      });
      sliderTrack.innerHTML = hourlyHtml;
   }

   function drawTempChart(forecastList) {
      const ctx = document.querySelector('#temp-chart');
      if (!ctx) return;

      if (ctx.chart) {
         ctx.chart.destroy();
      }

      const next24Hours = forecastList.slice(0, 8);
      const labels = next24Hours.map(
         (item) => `${new Date(item.dt * 1000).getHours()}시`,
      );
      const temperatures = next24Hours.map((item) => item.main.temp);

      ctx.chart = new Chart(ctx, {
         type: 'line',
         data: {
            labels: labels,
            datasets: [
               {
                  label: '온도(°C)',
                  data: temperatures,
                  borderColor: '#ff6b6b',
                  backgroundColor: 'rgba(255, 107, 107, 0.2)',
                  tension: 0.4,
                  fill: true,
                  pointBackgroundColor: '#ff6b6b',
                  pointBorderColor: '#fff',
                  pointHoverRadius: 7,
               },
            ],
         },
         options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
               legend: { display: false },
               tooltip: { enabled: false },
            },
            onHover: (event, chartElement) => {
               document
                  .querySelectorAll('.hourly-item')
                  .forEach((item) => item.classList.remove('hover'));
               if (chartElement.length > 0) {
                  const dataIndex = chartElement[0].index;
                  const targetCard =
                     document.querySelectorAll('.hourly-item')[dataIndex];
                  if (targetCard) targetCard.classList.add('hover');
               }
            },
            scales: {
               x: { grid: { display: false } },
               y: { display: false, beginAtZero: false },
            },
         },
      });
   }

   function updateWeeklyForecast(forecastList) {
      const weeklyListElement = document.querySelector('.weekly-forecast-list');
      if (!weeklyListElement) return;
      weeklyListElement.innerHTML = '';

      const dailyData = {};
      forecastList.forEach((item) => {
         const date = new Date(item.dt * 1000).toLocaleDateString();
         if (!dailyData[date]) {
            dailyData[date] = [];
         }
         dailyData[date].push(item);
      });

      let dayCount = 0;
      for (const date in dailyData) {
         if (dayCount >= 5) break; // 5일치만 표시
         const dayForecast = dailyData[date];
         const minTemp = Math.min(
            ...dayForecast.map((item) => item.main.temp_min),
         );
         const maxTemp = Math.max(
            ...dayForecast.map((item) => item.main.temp_max),
         );
         const representativeWeather =
            dayForecast[Math.floor(dayForecast.length / 2)].weather[0];
         const iconUrl = `https://openweathermap.org/img/wn/${representativeWeather.icon}@2x.png`;
         const dayOfWeek = new Date(
            dayForecast[0].dt * 1000,
         ).toLocaleDateString('ko-KR', { weekday: 'long' });
         const detailHtml = dayForecast
            .map(
               (item) =>
                  `<p>${new Date(item.dt * 1000).getHours()}시: ${Math.round(item.main.temp)}° - ${item.weather[0].description}</p>`,
            )
            .join('');
         const weeklyItemHtml = `
            <div class="weekly-item">
               <div class="item-header">
                  <span class="day">${dayOfWeek}</span>
                  <img src="${iconUrl}" alt="${representativeWeather.description}" class="weather-icon">
                  <span class="temp-range">${Math.round(minTemp)}° / ${Math.round(maxTemp)}°</span>
               </div>
               <div class="item-details">${detailHtml}</div>
            </div>`;
         weeklyListElement.innerHTML += weeklyItemHtml;
         dayCount++;
      }

      document
         .querySelectorAll('.weekly-item .item-header')
         .forEach((header) => {
            header.addEventListener('click', () => {
               const currentItem = header.parentElement;
               document.querySelectorAll('.weekly-item').forEach((item) => {
                  if (item !== currentItem) item.classList.remove('active');
               });
               currentItem.classList.toggle('active');
            });
         });
   }

   function updateLifestyleInfo(weatherData, uvDate) {
      const uvValue = uvDate.value;
      const uvCard = document.getElementById('uv-card');
      const uvValueElement = uvCard.querySelector('.uv-value');
      const uvAdviceElement = uvCard.querySelector('.uv-advice');
      const humidity = weatherData.main.humidity;
      const windSpeed = weatherData.wind.speed;

      uvValueElement.innerText = uvValue;
      uvCard.className = 'lifestyle-card';

      const windAdviceElement = document.querySelector('.wind-advice');
      if (windSpeed > 10.8) {
         windAdviceElement.innerText = '강풍! 외출 시 주의하세요.';
      } else if (windSpeed > 5.5) {
         windAdviceElement.innerText = '산들바람이 불어요.';
      } else {
         windAdviceElement.innerText = '바람이 거의 없는 고요한 날입니다.';
      }

      if (uvValue >= 8) {
         uvAdviceElement.innerText =
            '매우 높음! 장시간 노출은 피하고, 외출 시 꼭 대비하세요.';
         uvCard.classList.add('uv-very-high');
      } else if (uvValue >= 6) {
         uvAdviceElement.innerText =
            '높음! 선크림을 꼭 바르고, 모자를 착용하는 것이 좋습니다.';
         uvCard.classList.add('uv-high');
      } else if (uvValue >= 3) {
         uvAdviceElement.innerText =
            '보통. 장시간 야외 활동 시 주의가 필요해요.';
         uvCard.classList.add('uv-moderate');
      } else {
         uvAdviceElement.innerText =
            '낮음. 자외선 걱정 없이 야외 활동을 즐기세요!';
      }

      document.querySelector('.feels-like-value').innerText =
         `${Math.round(weatherData.main.feels_like)}°`;
      document.querySelector('.wind-speed-value').innerText =
         `${weatherData.wind.speed} m/s`;
      document.querySelector('.humidity-value').innerText = `${humidity}%`;
      document.querySelector('.humidity-gauge').style.width = `${humidity}%`;
   }
}
