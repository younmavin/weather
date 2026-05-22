const KAKAO_KEY = '85401e2c1de4b728a63d1d662a91628b'
const WEATHER_KEY = '9ee28017e5432c59d908e159579512fc'

const btn = document.getElementById('btn_search')
const weather = document.getElementById('weather')
const ipt_ciity = document.getElementById('ipt_ciity')

// 날씨 ID → UI
// -----------------------------
function formatWeatherById(id) {
  if (id >= 200 && id < 300) return { text: '천둥', type: 'storm' }
  if (id >= 300 && id < 400) return { text: '이슬비', type: 'rain' }
  if (id >= 500 && id < 600) return { text: '비', type: 'rain' }
  if (id >= 600 && id < 700) return { text: '눈', type: 'snow' }
  if (id >= 700 && id < 800) return { text: '안개', type: 'fog' }
  if (id === 800) return { text: '맑음', type: 'clear' }
  if (id > 800) return { text: '구름', type: 'cloud' }

  return { text: '날씨', type: 'default' }
}

// 미세먼지 상태
// -----------------------------
function getDustText(value) {
  if (value <= 30) return 'good'
  if (value <= 80) return 'normal'
  if (value <= 150) return 'bad'

  return 'worst'
}

function getDustLabel(value) {
  if (value <= 30) return '좋음'
  if (value <= 80) return '보통'
  if (value <= 150) return '나쁨'

  return '매우나쁨'
}

function getFineDustText(value) {
  if (value <= 15) return 'good'
  if (value <= 35) return 'normal'
  if (value <= 75) return 'bad'

  return 'worst'
}

function getFineDustLabel(value) {
  if (value <= 15) return '좋음'
  if (value <= 35) return '보통'
  if (value <= 75) return '나쁨'

  return '매우나쁨'
}

// 배경 테마 변경
// -----------------------------
function setTheme(type) {
  document.body.className = ''

  if (type === 'rain') document.body.classList.add('theme-rain')
  if (type === 'snow') document.body.classList.add('theme-snow')
  if (type === 'clear') document.body.classList.add('theme-clear')
  if (type === 'storm') document.body.classList.add('theme-storm')
  if (type === 'fog') document.body.classList.add('theme-fog')
}

// 최근 검색 저장
// -----------------------------
function saveHistory(keyword) {
  let history = JSON.parse(localStorage.getItem('weatherHistory')) || []

  history = [keyword, ...history.filter((v) => v !== keyword)].slice(0, 5)

  localStorage.setItem('weatherHistory', JSON.stringify(history))
}

// 메인
// -----------------------------
async function searchWeather() {
  const keyword = ipt_ciity.value.trim()

  if (!keyword) return

  weather.innerHTML = '로딩중...'

  try {
    const kakaoRes = await fetch(`https://dapi.kakao.com/v2/local/search/address.json?query=${keyword}`, {
      headers: {
        Authorization: `KakaoAK ${KAKAO_KEY}`,
      },
    })

    const kakaoData = await kakaoRes.json()

    if (!kakaoData.documents?.length) {
      weather.innerHTML = '검색 결과 없음'
      return
    }

    const { x: lon, y: lat, address_name } = kakaoData.documents[0]

    // 현재 날씨
    const currentRes = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${WEATHER_KEY}&units=metric`,
    )

    const currentData = await currentRes.json()

    // 예보
    const forecastRes = await fetch(
      `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${WEATHER_KEY}&units=metric`,
    )

    const forecastData = await forecastRes.json()

    // 대기질
    const airRes = await fetch(
      `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${WEATHER_KEY}`,
    )

    const airData = await airRes.json()

    const pm10 = Math.round(airData.list[0].components.pm10)
    const pm25 = Math.round(airData.list[0].components.pm2_5)

    const {
      weather: [{ id }],
    } = currentData

    const weatherInfo = formatWeatherById(id)

    setTheme(weatherInfo.type)

    saveHistory(keyword)

    localStorage.setItem('lastCity', keyword)

    // 5일 예보
    // -----------------------------
    const dailyData = forecastData.list.filter((item) => item.dt_txt.includes('12:00:00'))

    let dailyHTML = ''

    dailyData.forEach((item, index) => {
      const date = item.dt_txt.split(' ')[0]

      const sameDay = forecastData.list.filter((v) => v.dt_txt.startsWith(date))

      const morning = sameDay.find((v) => v.dt_txt.includes('09:00:00')) || sameDay[0]

      const afternoon = sameDay.find((v) => v.dt_txt.includes('15:00:00')) || sameDay[sameDay.length - 1]

      const temps = sameDay.map((v) => v.main.temp)

      const maxTemp = Math.max(...temps)
      const minTemp = Math.min(...temps)

      const week = ['일', '월', '화', '수', '목', '금', '토']

      const dayName = week[new Date(date).getDay()]

      dailyHTML += `
        <div class="forecast-card ${index === 0 ? 'active' : ''}" data-date="${date}">
          <div class="date-wrap">
            <p class="day">${dayName}요일</p>
            <p class="date">${date}</p>
          </div>
          <ul>
            <li>
              <img src="https://openweathermap.org/img/widget_icons/humidity-low.svg" alt="">
              <p class="humidity">
                ${afternoon.main.humidity}%
              </p>
            </li>
            <li>
              <img src="https://openweathermap.org/img/wn/${morning.weather[0].icon}@2x.png">
              <img src="https://openweathermap.org/img/wn/${afternoon.weather[0].icon}@2x.png">
            </li>
            <li>
              <span class="max">${Math.round(maxTemp)}℃</span>
              /
              <span class="min">${Math.round(minTemp)}℃</span>
            </li>
          </ul>
        </div>
      `
    })

    // UI
    // -----------------------------
    weather.innerHTML = `
      <div class="today-wrap">
        <div class="current-weather"></div>
        <div class="today-comment"></div>
        <div class="hourly-wrap"></div>
      </div>
      <div class="dust-wrap"></div>
      <div class="forecast-wrap">
        ${dailyHTML}
      </div>
    `

    // current UI 업데이트
    // -----------------------------
    function updateCurrentUI(targetData, date) {
      const {
        main: { temp, humidity },
        wind: { speed },
        weather: [{ icon, id }],
      } = targetData

      const weatherInfo = formatWeatherById(id)

      const temps = forecastData.list.filter((v) => v.dt_txt.startsWith(date)).map((v) => v.main.temp)

      const maxTemp = Math.max(...temps)
      const minTemp = Math.min(...temps)

      const targetDate = new Date(date)

      const week = ['일', '월', '화', '수', '목', '금', '토']

      const dateText = `
        ${targetDate.getMonth() + 1}월
        ${targetDate.getDate()}일
        ${week[targetDate.getDay()]}요일
      `

      let todayComment = ''

      if (weatherInfo.type === 'clear') {
        todayComment = '맑은 하늘이 이어져요. 가볍게 산책하기 좋은 날씨예요.'
      } else if (weatherInfo.type === 'rain') {
        todayComment = '비 예보가 있어요. 외출 시 우산 챙기는 걸 추천해요.'
      } else if (weatherInfo.type === 'snow') {
        todayComment = '눈이 예상돼요. 길이 미끄러울 수 있으니 조심하세요.'
      } else if (weatherInfo.type === 'storm') {
        todayComment = '천둥 번개 가능성이 있어요. 야외 활동은 주의해 주세요.'
      } else if (weatherInfo.type === 'fog') {
        todayComment = '안개가 짙은 날이에요. 운전 시 시야를 조심하세요.'
      } else {
        todayComment = '구름이 많은 날씨예요. 일교차를 체크해 보세요.'
      }

      // current-weather
      document.querySelector('.current-weather').innerHTML = `
        <div class="left">
          <h2>
            <img src="https://openweathermap.org/img/widget_icons/pin-outline.svg">
            ${address_name}
          </h2>
          <p class="current-date">
            ${dateText}
          </p>
          <div class="temp-wrap">
            <img src="https://openweathermap.org/img/wn/${icon}@2x.png">
            <div class="temp">
              ${Math.round(temp)}℃
            </div>
          </div>

        </div>

        <ul class="right">
          <li class="desc">
            ${weatherInfo.text}
          </li>
          <li>
            최고 ${Math.round(maxTemp)}℃
            /
            최저 ${Math.round(minTemp)}℃
          </li>
          <li>
            <img src="https://openweathermap.org/img/widget_icons/humidity-low.svg">
            습도 ${humidity}%
          </li>
          <li>
            <img src="https://openweathermap.org/img/widget_icons/wind.svg">
            바람 ${speed}m/s
          </li>

        </ul>
      `

      // today-comment
      document.querySelector('.today-comment').innerHTML = todayComment

      // dust
      document.querySelector('.dust-wrap').innerHTML = `
        <div class="dust-card ${getDustText(pm10)}">
          <div class="bar"></div>
          <div>
            <h5>미세먼지</h5>
            <p>${pm10}㎍/㎥</p>
            <p>${getDustLabel(pm10)}</p>
          </div>
        </div>

        <div class="dust-card ${getFineDustText(pm25)}">
          <div class="bar"></div>
          <div>
            <h5>초미세먼지</h5>
            <p>${pm25}㎍/㎥</p>
            <p>${getFineDustLabel(pm25)}</p>
          </div>
        </div>
      `
    }

    // 시간별
    // -----------------------------
    function renderHourly(date) {
      const now = new Date()

      const selected = forecastData.list.filter((i) => {
        const itemDate = new Date(i.dt_txt)

        return i.dt_txt.startsWith(date) && itemDate >= now
      })

      let html = ''

      selected.forEach((i) => {
        const hour = Number(i.dt_txt.split(' ')[1].slice(0, 2))

        const time = hour < 12 ? `오전 ${hour || 12}시` : `오후 ${hour === 12 ? 12 : hour - 12}시`

        html += `
          <div class="hour-card">
            <p>${time}</p>
            <img src="https://openweathermap.org/img/wn/${i.weather[0].icon}@2x.png">
            <ul>
              <li>
                ${Math.round(i.main.temp)}℃
              </li>
              <li>
                <img src="https://openweathermap.org/img/widget_icons/humidity-low.svg">
                ${i.main.humidity}%
              </li>
              <li>
                <img src="https://openweathermap.org/img/widget_icons/wind.svg">
                ${i.wind.speed}m/s
              </li>
            </ul>
          </div>
        `
      })

      document.querySelector('.hourly-wrap').innerHTML = html
    }

    // 초기 렌더
    const firstDate = dailyData[0].dt_txt.split(' ')[0]

    renderHourly(firstDate)

    updateCurrentUI(dailyData[0], firstDate)

    // 카드 클릭
    document.querySelectorAll('.forecast-card').forEach((card) => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.forecast-card').forEach((c) => {
          c.classList.remove('active')
        })

        card.classList.add('active')

        const selectedDate = card.dataset.date

        renderHourly(selectedDate)

        const targetData = forecastData.list.find(
          (v) => v.dt_txt.startsWith(selectedDate) && v.dt_txt.includes('12:00:00'),
        )

        updateCurrentUI(targetData, selectedDate)
      })
    })
  } catch (err) {
    console.error(err)

    weather.innerHTML = '에러 발생'
  }
}

// 이벤트
// -----------------------------
btn.addEventListener('click', searchWeather)

ipt_ciity.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    searchWeather()
  }
})

// 페이지 로드시 자동 검색
// -----------------------------
window.addEventListener('load', () => {
  const savedCity = localStorage.getItem('lastCity')

  if (savedCity) {
    ipt_ciity.value = savedCity
    searchWeather()
  }
})
