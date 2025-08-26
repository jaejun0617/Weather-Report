document.addEventListener('DOMContentLoaded', () => {
   console.log('DOM 준비');

   // ===================================================
   // 1. 이벤트 리스너 및 초기 실행 함수
   // ===================================================

   // 모바일 메뉴 토글 이벤트 리스너 설정
   const mMenu = document.querySelector('.m-menu');
   const pcMenu = document.querySelector('.nav-menu ul');
   mMenu.addEventListener('click', () => {
      pcMenu.classList.toggle('active');
   });

   // ✨ [핵심 기능 3] 실시간 시계 기능 실행
   // 1초마다 updateClock 함수를 호출하여 화면의 시간을 업데이트합니다.
   updateClock(); // 페이지 로드 시 즉시 한 번 실행하여 공백 방지
   setInterval(updateClock, 1000);

   // 메인 날씨 정보 가져오기 실행
   navigator.geolocation.getCurrentPosition(onGeoOk, onGeoError);

   // ===================================================
   // 2. API 키 설정
   // ===================================================
   const API_KEY = '6d37c03a327b0ee12edb5baa05994a28';

   // ===================================================
   // 3. 메인 함수 정의
   // ===================================================

   /**
    * 위치 정보 가져오기 성공 시 실행되는 함수
    * @param {GeolocationPosition} position - 사용자의 위치 정보 객체
    */
   function onGeoOk(position) {
      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;
      console.log(`현재 위치: 위도 ${latitude}, 경도 ${longitude}`);

      const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${API_KEY}&units=metric&lang=kr`;
      const airPollutionUrl = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${latitude}&lon=${longitude}&appid=${API_KEY}`;
      const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&appid=${API_KEY}&units=metric&lang=kr`;

      Promise.all([fetch(weatherUrl), fetch(airPollutionUrl), fetch(forecastUrl)])
         .then(responses =>
            Promise.all(
               responses.map(response => {
                  if (!response.ok) {
                     throw new Error(`HTTP error! status: ${response.status}`);
                  }
                  return response.json();
               }),
            ),
         )
         .then(([weatherData, airData, forecastData]) => {
            // ----- 3-1. 날씨 데이터 처리 -----
            if (weatherData && weatherData.main && weatherData.weather && weatherData.wind) {
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

               console.log(`온도: ${currentTemp}°C, 날씨: ${weatherStatus}, 지역: ${locationName}`);

               updateBackground(weatherStatus);
               updateSunriseSunset(sunriseTimestamp, sunsetTimestamp);

               document.querySelector('.current-temp').innerText = `${Math.round(currentTemp)}°`;
               document.querySelector('.feels-like').innerText = `체감 ${Math.round(feelsLikeTemp)}°`;
               document.querySelector('.minmax-temp').innerText =
                  `최저 ${Math.round(minTemp)}° \n 최고 ${Math.round(maxTemp)}°`;
               document.querySelector('.wind-speed').innerText = `${windSpeed} m/s`;
               document.querySelector('.humidity').innerText = `${humidity}%`;
               document.querySelector('.precipitation').innerText = `${precipitation} mm`;
               document.querySelector('#weather-desc').innerText = weatherStatus;
               document.querySelector('.current-location').innerText = locationName;
               document.querySelector('.weather-description-detail').innerText = customMessage;

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
               } else if (weatherStatus === 'Mist' || weatherStatus === 'Haze' || weatherStatus === 'Fog') {
                  iconElement.src = './assets/icons/air-quality.png';
               } else {
                  iconElement.src = './assets/icons/weather-condition.png';
               }
            } else {
               console.error('날씨 API 응답 데이터 형식이 올바르지 않습니다.', weatherData);
            }

            // ----- 3-2. 대기 질 데이터 처리 -----
            if (airData && airData.list && airData.list.length > 0) {
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
                     aqiAdvice = '민감하신 분들은 장시간 외출 시 마스크 착용을 고려해 보세요.';
                     break;
                  case 4:
                     aqiText = '나쁨! 주의하세요 😠';
                     aqiAdvice = '가급적 외출을 줄이고, \n 외출 시에는 KF80 이상 마스크를 꼭 착용하세요.';
                     break;
                  case 5:
                     aqiText = '매우 나쁨! 위험해요 👿';
                     aqiAdvice = '오늘은 실내에 머무르는 것이 가장 좋습니다. \n 창문은 꼭 닫아두세요!';
                     break;
                  default:
                     aqiText = '정보 없음';
                     aqiAdvice = '현재 대기 질 정보를 가져올 수 없어요.';
               }

               console.log(`대기 질: ${aqiText} (AQI: ${aqi})`);

               const airQualityTextElement = document.querySelector('.air-quality-text');
               const airQualityAdviceElement = document.querySelector('.air-quality-advice');

               if (airQualityTextElement && airQualityAdviceElement) {
                  airQualityTextElement.innerText = aqiText;
                  airQualityAdviceElement.innerText = aqiAdvice;
               }
            } else {
               console.error('대기 질 API 응답 데이터 형식이 올바르지 않습니다.', airData);
            }
            if (forecastData && forecastData.list) {
               // 슬라이더 함수 호출
               updateHourlyForecast(forecastData.list);

               // 그래프 함수 호출
               drawTempChart(forecastData.list);
            }
         })
         .catch(error => {
            console.error('데이터를 가져오는 중 오류 발생:', error);
            alert('데이터를 불러오는 데 실패했습니다. 잠시 후 다시 시도해주세요.');
         });
   }

   /**
    * 위치 정보 가져오기 실패 시 실행되는 함수
    */
   function onGeoError(err) {
      console.error('위치 정보 에러:', err);
      switch (err.code) {
         case err.PERMISSION_DENIED:
            alert('위치 권한이 거부되었습니다. 브라우저 설정에서 허용해주세요.');
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

   /**
    * '날씨 번역기' 함수
    */
   function getCustomWeatherMessage(status, temp) {
      switch (status) {
         case 'Clear':
            if (temp > 25) return '쨍한 햇살이 기분 좋은 날이에요! ☀️\n가벼운 옷차림으로 상쾌한 하루를 만끽해 보세요.';
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

   /**
    * 동적 배경 업데이트 함수
    */
   function updateBackground(status) {
      const todayContainer = document.querySelector('.today-container');
      let imageUrl = './assets/images/section02/default.png';
      if (status === 'Clear') imageUrl = './assets/images/section02/clear.jpg';
      else if (status === 'Clouds') imageUrl = './assets/images/section02/clouds.jpg';
      else if (status === 'Rain' || status === 'Drizzle' || status === 'Thunderstorm')
         imageUrl = './assets/images/section02/rain.jpg';
      else if (status === 'Snow') imageUrl = './assets/images/section02/snow.jpg';
      else if (status === 'Mist' || status === 'Haze' || status === 'Fog')
         imageUrl = './assets/images/section02/fog.jpg';
      todayContainer.style.backgroundImage = `url(${imageUrl})`;
   }

   /**
    * 일출/일몰 타임라인 업데이트 함수
    */
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

   /**
    * 타임스탬프 변환 도우미 함수
    */
   function formatTime(timestamp) {
      const date = new Date(timestamp * 1000);
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
   }

   // ===================================================
   // 5. [추가] 신규 기능 함수 정의 (실시간 시계)
   // ===================================================

   /**
    * ✨ [핵심 기능 3] 실시간 시계 업데이트 함수
    * 1초마다 현재 시간을 가져와 화면에 표시합니다.
    */
   function updateClock() {
      // 1. 현재 시간 정보를 가진 Date 객체를 생성합니다.
      const now = new Date();
      // 2. 시간, 분, 초를 가져옵니다. (숫자가 한 자리일 경우 '0'을 붙여줍니다)
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');
      const seconds = now.getSeconds().toString().padStart(2, '0');

      // 3. 시간을 표시할 HTML 요소를 선택합니다. (HTML에 .current-time 클래스가 있어야 합니다)
      const timeElement = document.querySelector('.current-time');

      // 4. 요소가 존재한다면, "HH:MM:SS" 형태로 텍스트를 업데이트합니다.
      if (timeElement) {
         timeElement.innerText = `${hours}:${minutes}:${seconds}`;
      }
   }

   /* 시간별 예보 */
   function updateHourlyForecast(forecastList) {
      const sliderTrack = document.querySelector('.slider-track');

      // 앞으로 24시간 예보를 위한 배열을 자르기
      const next24Hours = forecastList.slice(0, 8);

      let hourlyHtml = ''; // 카드 담을 빈 문자열

      next24Hours.forEach((item, index) => {
         // 1. 시간 데이터
         const date = new Date(item.dt * 1000);
         const hours = date.getHours();
         const timeString = `${hours}시`;

         // 2. 날씨 아이콘 url
         const iconCode = item.weather[0].icon;
         const iconUrl = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;

         // 3. 온도데이터
         const temp = Math.round(item.main.temp);

         // 시간대별 강조하기
         const isNow = index === 0 ? 'now' : '';

         // 4. 각 시간대별 카드
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
      // 1. 차트에 필요한 데이터 추출하고 새로운 배열 만들기
      const next24Hours = forecastList.slice(0, 8); // ㅇ슬라이더와 동일하게 24시간 데이터 사용하기위해

      // X축 라벨 시간 배열
      const labels = next24Hours.map(item => {
         const hours = new Date(item.dt * 1000).getHours();
         return `${hours}시`;
      });

      // y축 데이터 온도 배열
      const temperatures = next24Hours.map(item => item.main.temp);

      // 2. 차트를 그릴 canvas 요소
      const ctx = document.querySelector('#temp-chart');

      // 3. Chart.js를 사용하여 차트 생성

      new Chart(ctx, {
         type: 'line', // 차트 종류: 꺾은선 그래프
         data: {
            labels: labels, // x축 라벨
            datasets: [
               {
                  label: '온도(°C)', // 데이터의 이름 (툴팁에 표시됨)
                  data: temperatures, // y축 데이터
                  borderColor: '#ff6b6b', // 선 색상
                  backgroundColor: 'rgba(255, 107, 107, 0.2)', // 선 아래 영역 색상
                  tension: 0.4, // 선의 부드러운 곡선 정도 (0 ~ 1)
                  fill: true, // 선 아래 영역을 채울지 여부
                  pointBackgroundColor: '#ff6b6b', // 각 데이터 지점의 색상
                  pointBorderColor: '#fff', // 지점의 테두리 색상
                  pointHoverRadius: 10, // 마우스 올렸을 때 지점 크기
               },
            ],
         },
         options: {
            responsive: true, // 반응형으로 크기 조절
            plugins: {
               legend: {
                  display: false, // 데이터 라벨(범례) 숨기기
               },
            },
            onHover: (event, chartElement) => {
               document.querySelectorAll('.hourly-item').forEach(item => {
                  item.classList.remove('hover');
               });

               if (chartElement.length > 0) {
                  const dataIndex = chartElement[0].index;
                  const targetCard = document.querySelectorAll('.hourly-item')[dataIndex];
                  if (targetCard) {
                     targetCard.classList.add('hover');
                  }
               }
            },
            scales: {
               x: {
                  grid: {
                     display: false, // x축 격자선 숨기기
                  },
               },
               y: {
                  grid: {
                     display: false, // y축 격자선 숨기기
                  },
                  ticks: {
                     display: false, // y축 눈금 숫자 숨기기
                  },
               },
            },
         },
      });
   }
});
