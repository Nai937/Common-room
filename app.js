// ===== CONFIGURATION =====
const SHOWPIC_IMAGES = [
  './images/showpic/pic1.jfif',
  './images/showpic/pic2.jfif',
  './images/showpic/pic3.jfif',
  './images/showpic/pic4.jfif',
  './images/showpic/pic5.jfif',
  './images/showpic/pic6.jfif',
  './images/showpic/pic7.jfif',
  './images/showpic/pic8.jfif',
  './images/showpic/pic9.jfif',
  './images/showpic/pic10.jfif',
  './images/showpic/pic11.jfif',
  './images/showpic/pic12.jfif',
  './images/showpic/pic13.jfif',
  './images/showpic/pic14.jfif',
  './images/showpic/pic15.jfif',
  './images/showpic/pic16.png',
];

const COURTS = [1, 2, 3, 4];
const HOURS = [15, 16, 17, 18, 19, 20, 21, 22];

// ===== STATE =====
let currentSlide = 0;
let totalSlides = 0;
let slideshowTimer = null;
let bookingsData = null;
let selectedDate = getTodayDateString();

// ===== DATE UTILITIES =====
function getTodayDateString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatThaiDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  // Use constructor without timezone shift
  const date = new Date(y, m - 1, d);
  const options = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };
  try {
    return date.toLocaleDateString('th-TH', options);
  } catch (e) {
    return dateStr;
  }
}

function addDays(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  const ny = date.getFullYear();
  const nm = String(date.getMonth() + 1).padStart(2, '0');
  const nd = String(date.getDate()).padStart(2, '0');
  return `${ny}-${nm}-${nd}`;
}

// ===== CLOCK =====
function updateClock() {
  const now = new Date();
  const timeEl = document.getElementById('clock-time');
  const dateEl = document.getElementById('clock-date');

  if (timeEl) {
    timeEl.textContent = now.toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  }

  if (dateEl) {
    dateEl.textContent = now.toLocaleDateString('th-TH', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
}

// ===== SLIDESHOW =====
function initSlideshow() {
  const track = document.getElementById('slideshow-track');
  const dotsContainer = document.getElementById('slideshow-dots');
  if (!track || !dotsContainer) return;

  // Clear existing
  track.innerHTML = '';
  dotsContainer.innerHTML = '';

  let loadedSlides = [];

  function addSlide(src, index) {
    const slide = document.createElement('div');
    slide.className = 'slide';
    slide.dataset.index = index;

    const img = document.createElement('img');
    img.src = src;
    img.alt = `สนามแบดมินตันหลังสวน - ภาพที่ ${index + 1}`;
    img.loading = index === 0 ? 'eager' : 'lazy';

    img.onerror = function () {
      // Remove broken slide
      const idx = loadedSlides.indexOf(slide);
      if (idx !== -1) loadedSlides.splice(idx, 1);
      slide.remove();

      // Re-index dots
      rebuildDots();

      // Adjust current slide if needed
      if (totalSlides > 0) {
        totalSlides = loadedSlides.length;
        if (currentSlide >= totalSlides) {
          currentSlide = 0;
        }
        if (loadedSlides.length > 0) {
          showSlide(currentSlide);
        }
      }
    };

    slide.appendChild(img);
    track.appendChild(slide);
    loadedSlides.push(slide);

    // Dot
    const dot = document.createElement('button');
    dot.className = 'dot';
    dot.setAttribute('aria-label', `ภาพที่ ${index + 1}`);
    dot.addEventListener('click', () => goToSlide(loadedSlides.indexOf(slide)));
    dotsContainer.appendChild(dot);
  }

  SHOWPIC_IMAGES.forEach((src, i) => addSlide(src, i));

  function rebuildDots() {
    dotsContainer.innerHTML = '';
    loadedSlides.forEach((slide, i) => {
      const dot = document.createElement('button');
      dot.className = 'dot' + (i === currentSlide ? ' active' : '');
      dot.setAttribute('aria-label', `ภาพที่ ${i + 1}`);
      dot.addEventListener('click', () => goToSlide(i));
      dotsContainer.appendChild(dot);
    });
  }

  function showSlide(index) {
    const slides = loadedSlides;
    if (!slides.length) return;

    currentSlide = ((index % slides.length) + slides.length) % slides.length;
    totalSlides = slides.length;

    slides.forEach((slide, i) => {
      slide.classList.toggle('active', i === currentSlide);
    });

    // Update dots
    const dots = dotsContainer.querySelectorAll('.dot');
    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === currentSlide);
    });
  }

  function goToSlide(index) {
    clearInterval(slideshowTimer);
    showSlide(index);
    startAutoAdvance();
  }

  function startAutoAdvance() {
    clearInterval(slideshowTimer);
    slideshowTimer = setInterval(() => {
      if (loadedSlides.length > 1) {
        showSlide(currentSlide + 1);
      }
    }, 4000);
  }

  // Make navigation functions global
  window._slideshowNext = () => goToSlide(currentSlide + 1);
  window._slideshowPrev = () => goToSlide(currentSlide - 1);

  // Initial show
  setTimeout(() => {
    showSlide(0);
    startAutoAdvance();
  }, 100);
}

// ===== BOOKINGS =====
async function loadBookings() {
  showGridLoading();
  try {
    // Always try live API first (relative path works from any hostname when served by FastAPI)
    const res = await fetch(`/api/public/bookings?date=${selectedDate}`);
    if (res.ok) {
      const data = await res.json();
      bookingsData = { generated_at: data.generated_at, bookings: data.bookings };
      renderGrid(bookingsData, selectedDate);
      return;
    }
  } catch (e) {
    // API unavailable, fall through to static JSON fallback
  }
  // Fallback: static JSON (for GitHub Pages or offline)
  try {
    const url = `./data/bookings.json?t=${Date.now()}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    bookingsData = await res.json();
    renderGrid(bookingsData, selectedDate);
  } catch (err) {
    console.warn('Failed to load bookings:', err);
    bookingsData = { generated_at: null, bookings: [] };
    renderGrid(bookingsData, selectedDate);
  }
}

function showGridLoading() {
  const container = document.getElementById('grid-container');
  if (!container) return;
  container.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <span>กำลังโหลดข้อมูลคอร์ท...</span>
    </div>
  `;
}

// ===== KWON DETECTION =====
/**
 * Returns 'kwon_light', 'kwon_heavy', or null
 * - kwon_light: Mon-Fri, courts 2 & 3, hour >= 17
 * - kwon_heavy: Mon-Fri, all courts, hour >= 19
 * weekday: 0=Sun, 1=Mon...5=Fri, 6=Sat
 */
function getKwonStatus(dateStr, court, hour) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const weekday = new Date(y, m - 1, d).getDay();
  const isWeekday = weekday >= 1 && weekday <= 5; // Mon-Fri

  if (!isWeekday) return null;

  // kwon_heavy takes priority over kwon_light
  if (hour >= 19) return 'kwon_heavy';
  if (hour >= 17 && (court === 2 || court === 3)) return 'kwon_light';

  return null;
}

/**
 * Returns { status, bookerName }
 * status: 'booked', 'kwon_light', 'kwon_heavy', or 'available'
 * Booked takes priority over ก๊วน
 */
function getSlotStatus(bookings, date, court, hour) {
  const bookingList = bookings?.bookings || [];

  // Check if this slot is booked
  const matchedBooking = bookingList.find((b) => {
    if (b.court !== court || b.date !== date) return false;
    const startH = parseInt(b.start_time.split(':')[0], 10);
    const endH = parseInt(b.end_time.split(':')[0], 10);
    return hour >= startH && hour < endH;
  });

  if (matchedBooking) return { status: 'booked', bookerName: matchedBooking.booker_name || 'จอง' };

  // Check kwon
  const kwon = getKwonStatus(date, court, hour);
  if (kwon) return { status: kwon, bookerName: null };

  return { status: 'available', bookerName: null };
}

// ===== RENDER GRID =====
function renderGrid(bookings, date) {
  const container = document.getElementById('grid-container');
  if (!container) return;

  // Update date display
  const dateDisplay = document.getElementById('date-display-text');
  if (dateDisplay) {
    dateDisplay.textContent = formatThaiDate(date);
  }

  // Check if Sunday — court is closed
  const [cy, cm, cd] = date.split('-').map(Number);
  if (new Date(cy, cm - 1, cd).getDay() === 0) {
    container.innerHTML = `
      <div class="closed-state">
        <div class="closed-icon-wrap">
          <svg class="closed-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/>
          </svg>
        </div>
        <h3 class="closed-title">สนามปิดทำการ</h3>
        <p class="closed-subtitle">วันอาทิตย์ หยุดทุกสัปดาห์</p>
        <p class="closed-note">กรุณาเลือกวันจันทร์ – เสาร์ หรือติดต่อสอบถามข้อมูลเพิ่มเติม</p>
      </div>
    `;
    container.classList.add('fade-in-up');
    setTimeout(() => container.classList.remove('fade-in-up'), 600);
    return;
  }

  const statusConfig = {
    available:  { label: 'ว่าง',       className: 'slot-available' },
    booked:     { label: 'จอง',        className: 'slot-booked' },
    kwon_light: { label: 'ก๊วนมือเบา', className: 'slot-kwon-light' },
    kwon_heavy: { label: 'จอยก๊วน',   className: 'slot-kwon-heavy' },
  };

  // Header: คอร์ท | 15:00-16:00 | 16:00-17:00 | ... | 22:00-23:00
  const hourHeaders = HOURS.map(h =>
    `<th class="time-col-header">${String(h).padStart(2,'0')}:00–${String(h+1).padStart(2,'0')}:00</th>`
  ).join('');

  let html = `
    <div class="grid-wrapper">
      <table class="availability-table">
        <thead>
          <tr>
            <th class="court-col-header">คอร์ท</th>
            ${hourHeaders}
          </tr>
        </thead>
        <tbody>
  `;

  COURTS.forEach((court) => {
    html += `<tr><td class="court-label">คอร์ท ${court}</td>`;

    HOURS.forEach((hour) => {
      const { status, bookerName } = getSlotStatus(bookings, date, court, hour);
      const config = statusConfig[status];
      const label = (status === 'booked' && bookerName) ? bookerName : config.label;
      html += `<td><span class="slot ${config.className}">${label}</span></td>`;
    });

    html += '</tr>';
  });

  html += `
        </tbody>
      </table>
    </div>
  `;

  // Timestamp
  if (bookings?.generated_at) {
    try {
      const genDate = new Date(bookings.generated_at);
      const genStr = genDate.toLocaleString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      html += `<p class="data-timestamp">ข้อมูล ณ วันที่ ${genStr}</p>`;
    } catch (e) {
      html += `<p class="data-timestamp">ข้อมูล ณ วันที่ ${bookings.generated_at}</p>`;
    }
  }

  container.innerHTML = html;
  container.classList.add('fade-in-up');
  setTimeout(() => container.classList.remove('fade-in-up'), 600);
}

// ===== DATE NAVIGATION =====
function changeDate(days) {
  selectedDate = addDays(selectedDate, days);
  const picker = document.getElementById('date-picker');
  if (picker) picker.value = selectedDate;
  loadBookings();
}

function goToToday() {
  selectedDate = getTodayDateString();
  const picker = document.getElementById('date-picker');
  if (picker) picker.value = selectedDate;
  loadBookings();
}

function onDatePickerChange(value) {
  if (!value) return;
  selectedDate = value;
  loadBookings();
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  // Init date picker
  const picker = document.getElementById('date-picker');
  if (picker) {
    picker.value = selectedDate;
    picker.addEventListener('change', (e) => onDatePickerChange(e.target.value));
  }

  // Init clock
  updateClock();
  setInterval(updateClock, 1000);

  // Init slideshow
  initSlideshow();

  // Load bookings
  loadBookings();
});

// ===== COMMON ROOM PUBLIC SCHEDULE =====
const CR_PUB_OPEN  = 8;
const CR_PUB_CLOSE = 20;
const CR_PUB_HOURS = Array.from({length: CR_PUB_CLOSE - CR_PUB_OPEN}, (_, i) => CR_PUB_OPEN + i);
let crSelectedDate = getTodayDateString();

function crPad(n) { return String(n).padStart(2,'0'); }

function crGoToday() {
  crSelectedDate = getTodayDateString();
  const picker = document.getElementById('cr-date-picker');
  if (picker) picker.value = crSelectedDate;
  crUpdateDateDisplay();
  loadCRBookings();
}

function crChangeDate(delta) {
  const d = new Date(crSelectedDate + 'T00:00:00');
  d.setDate(d.getDate() + delta);
  crSelectedDate = d.toISOString().slice(0,10);
  const picker = document.getElementById('cr-date-picker');
  if (picker) picker.value = crSelectedDate;
  crUpdateDateDisplay();
  loadCRBookings();
}

function crUpdateDateDisplay() {
  const el = document.getElementById('cr-date-display');
  if (el) el.textContent = formatThaiDate(crSelectedDate);
}

async function loadCRBookings() {
  const container = document.getElementById('cr-grid-container');
  if (!container) return;
  container.innerHTML = '<div class="loading-state"><div class="spinner"></div><span>กำลังโหลด...</span></div>';
  try {
    const res = await fetch(`/api/public/bookings?date=${crSelectedDate}`);
    const data = await res.json();
    renderCRPublicGrid(data.common_room || []);
  } catch (e) {
    container.innerHTML = '<p style="color:#ef4444;text-align:center;padding:1rem">โหลดข้อมูลไม่สำเร็จ</p>';
  }
}

function renderCRPublicGrid(bookings) {
  const container = document.getElementById('cr-grid-container');
  if (!container) return;

  const cols = CR_PUB_HOURS.length;
  let html = `<div style="overflow-x:auto;border-radius:14px;box-shadow:0 4px 20px rgba(79,70,229,0.12);border:1px solid #c4b5fd">
  <div style="display:grid;grid-template-columns:90px repeat(${cols},minmax(52px,1fr));min-width:700px">
    <div style="background:#f5f3ff;padding:0.4rem 0.5rem;font-size:0.7rem;font-weight:700;color:#6d28d9;border-right:1px solid #ddd8fe;border-bottom:2px solid #a78bfa;display:flex;align-items:flex-end;justify-content:center">เวลา</div>
    ${CR_PUB_HOURS.map(h => `
    <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;font-size:0.7rem;font-weight:600;text-align:center;padding:0.4rem 0.1rem;border-right:1px solid rgba(255,255,255,0.12);border-bottom:2px solid rgba(255,255,255,0.2)">${h}:00</div>`).join('')}

    <div style="background:#f5f3ff;padding:0.35rem 0.4rem;font-size:0.73rem;font-weight:600;color:#4f46e5;border-right:2px solid #a78bfa;border-bottom:1px solid #ede9fe;display:flex;align-items:center;justify-content:center;min-height:48px">ห้อง</div>`;

  for (let hi = 0; hi < CR_PUB_HOURS.length; hi++) {
    const h = CR_PUB_HOURS[hi];
    const bk = bookings.find(b => parseInt(b.start_time) <= h && parseInt(b.end_time) > h);
    if (bk) {
      if (parseInt(bk.start_time) === h) {
        const span = parseInt(bk.end_time) - parseInt(bk.start_time);
        html += `<div style="grid-column:span ${span};background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;padding:0.3rem 0.5rem;border-radius:6px;margin:3px 2px;font-size:0.73rem;font-weight:600;display:flex;flex-direction:column;justify-content:center;box-shadow:0 2px 8px rgba(79,70,229,0.3)">
          <span style="font-weight:700">${bk.booker_name}</span>
          <span style="font-size:0.63rem;opacity:0.85">${bk.start_time}–${bk.end_time}</span>
        </div>`;
      }
    } else {
      html += `<div style="background:#fafafe;border-right:1px solid #ede9fe;border-bottom:1px solid #ede9fe;min-height:48px"></div>`;
    }
  }

  html += `</div></div>`;

  if (bookings.length === 0) {
    html += `<div style="text-align:center;padding:1.5rem;color:#7c3aed;font-size:0.95rem;background:#f5f3ff;border-radius:0 0 14px 14px">
      <p style="font-size:1.5rem;margin-bottom:0.3rem">✅</p>
      <p style="font-weight:600">ว่างทั้งวัน — 08:00 ถึง 20:00</p>
    </div>`;
  } else {
    const booked = bookings.reduce((acc,b) => acc + (parseInt(b.end_time) - parseInt(b.start_time)), 0);
    html += `<div style="display:flex;gap:1rem;padding:0.75rem 1rem;background:#f5f3ff;border-radius:0 0 14px 14px;flex-wrap:wrap">
      <div style="display:flex;align-items:center;gap:0.5rem">
        <div style="width:14px;height:14px;border-radius:4px;background:linear-gradient(135deg,#4f46e5,#7c3aed)"></div>
        <span style="font-size:0.78rem;color:#4c1d95;font-weight:600">จอง ${booked} ชม.</span>
      </div>
      <div style="display:flex;align-items:center;gap:0.5rem">
        <div style="width:14px;height:14px;border-radius:4px;background:#fafafe;border:1px solid #a78bfa"></div>
        <span style="font-size:0.78rem;color:#6d28d9">ว่าง ${12 - booked} ชม.</span>
      </div>
    </div>`;
  }

  container.innerHTML = html;
}

// Init CR section
document.addEventListener('DOMContentLoaded', () => {
  const crPicker = document.getElementById('cr-date-picker');
  if (crPicker) {
    crPicker.value = crSelectedDate;
    crPicker.addEventListener('change', e => {
      crSelectedDate = e.target.value;
      crUpdateDateDisplay();
      loadCRBookings();
    });
  }
  crUpdateDateDisplay();
  loadCRBookings();
});
