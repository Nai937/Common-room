// ===== CONFIG =====
const CR_HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]; // 08:00–20:00 (12 slots)
const CR_DAYS = 7;

// ===== STATE =====
let crWeekOffset = 0;
let crBookings = null;

// ===== DATE UTILS =====
function getMonday(offset) {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day; // Monday of this week
  const mon = new Date(now);
  mon.setDate(now.getDate() + diff + offset * 7);
  mon.setHours(0, 0, 0, 0);
  return mon;
}

function toDS(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function todayDS() {
  const now = new Date();
  return toDS(now);
}

function formatThaiShortDate(date) {
  return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
}

function formatThaiWeekday(date) {
  return date.toLocaleDateString('th-TH', { weekday: 'short' });
}

function formatThaiWeekRange(mondayDate) {
  const sunday = new Date(mondayDate);
  sunday.setDate(mondayDate.getDate() + 6);
  const start = mondayDate.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
  const end = sunday.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
  return `${start} – ${end}`;
}

// ===== CLOCK =====
function updateClock() {
  const now = new Date();
  const timeEl = document.getElementById('cr-clock-time');
  const dateEl = document.getElementById('cr-clock-date');
  if (timeEl) {
    timeEl.textContent = now.toLocaleTimeString('th-TH', {
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    });
  }
  if (dateEl) {
    dateEl.textContent = now.toLocaleDateString('th-TH', {
      weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
    });
  }
}

// ===== NAVIGATION =====
function goThisWeek() {
  crWeekOffset = 0;
  renderSchedule();
}

function changeWeek(delta) {
  crWeekOffset += delta;
  renderSchedule();
}

// ===== LOAD DATA =====
async function loadCRData() {
  // Try live API first (when served from FastAPI)
  try {
    const res = await fetch('/api/public/common-room/bookings');
    if (res.ok) {
      crBookings = await res.json();
      renderSchedule();
      updateFooterTimestamp();
      return;
    }
  } catch (_) {}

  // Fallback: static JSON from GitHub Pages
  try {
    const res = await fetch(`./data/bookings.json?t=${Date.now()}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    crBookings = {
      generated_at: data.generated_at,
      bookings: data.common_room || [],
    };
    renderSchedule();
    updateFooterTimestamp();
  } catch (err) {
    crBookings = { generated_at: null, bookings: [] };
    renderSchedule();
  }
}

// ===== GALLERY =====
async function loadCRGallery() {
  try {
    const res = await fetch('/api/public/common-room/gallery');
    if (res.ok) {
      const data = await res.json();
      renderGallery(data.images || []);
      return;
    }
  } catch (_) {}

  try {
    const res = await fetch(`./data/gallery.json?t=${Date.now()}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    renderGallery(data.images || []);
  } catch (_) {
    renderGallery([]);
  }
}

function renderGallery(images) {
  const section = document.getElementById('gallery');
  const wrap = document.getElementById('cr-gallery-wrap');
  if (!wrap) return;

  const urls = (images || []).map(i => i.url).filter(Boolean);
  if (!urls.length) {
    if (section) section.style.display = 'none';
    return;
  }
  if (section) section.style.display = '';

  const single = urls.length < 2;
  // ทำสำเนาชุดรูปเพื่อให้ scroll วนต่อเนื่องแบบไม่มีรอยต่อ (ใช้กับ track ที่มี ≥2 รูป)
  const track = single ? urls : urls.concat(urls);
  const duration = Math.max(urls.length * 4, 14); // วินาที — ยิ่งรูปเยอะยิ่งเลื่อนนานขึ้น ความเร็วต่อรูปคงที่

  const itemsHtml = track.map(url =>
    `<div class="cr-gallery-item"><img src="${url}" alt="ภาพบรรยากาศห้อง Common Room" loading="lazy" onerror="this.parentElement.remove()"/></div>`
  ).join('');

  wrap.innerHTML = single
    ? `<div class="cr-gallery-track cr-gallery-static"><div class="cr-gallery-track-inner">${itemsHtml}</div></div>`
    : `<div class="cr-gallery-track" style="--cr-gallery-duration:${duration}s"><div class="cr-gallery-track-inner">${itemsHtml}</div></div>`;
}

function updateFooterTimestamp() {
  const el = document.getElementById('cr-updated-at');
  if (!el) return;
  if (!crBookings?.generated_at) { el.textContent = '—'; return; }
  try {
    const d = new Date(crBookings.generated_at);
    el.textContent = d.toLocaleString('th-TH', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch (_) {
    el.textContent = crBookings.generated_at;
  }
}

// ===== BOOKING LOOKUP =====
function getBookingAt(ds, hour) {
  const list = crBookings?.bookings || [];
  return list.find(b => {
    if (b.date !== ds) return false;
    const startH = parseInt(b.start_time.split(':')[0], 10);
    const endH   = parseInt(b.end_time.split(':')[0],   10);
    return hour >= startH && hour < endH;
  }) || null;
}

function isBookingStart(booking, hour) {
  if (!booking) return false;
  return parseInt(booking.start_time.split(':')[0], 10) === hour;
}

function bookingSpan(booking) {
  const s = parseInt(booking.start_time.split(':')[0], 10);
  const e = parseInt(booking.end_time.split(':')[0],   10);
  return Math.max(1, e - s);
}

// ===== RENDER SCHEDULE =====
function renderSchedule() {
  const wrap = document.getElementById('cr-schedule-wrap');
  if (!wrap) return;

  const monday = getMonday(crWeekOffset);

  // Update week label
  const label = document.getElementById('cr-week-label');
  if (label) label.textContent = formatThaiWeekRange(monday);

  // Build week days array [Mon..Sun]
  const days = Array.from({ length: CR_DAYS }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });

  const today = todayDS();

  // Build grid columns: 1 (hour label) + 7 (days)
  const cols = CR_DAYS + 1;

  let html = `<div class="cr-grid" style="grid-template-columns: 52px repeat(${CR_DAYS}, 1fr);">`;

  // ---- Header row ----
  html += `<div class="cr-grid-header-corner">เวลา</div>`;
  days.forEach(d => {
    const ds = toDS(d);
    const isToday = ds === today;
    html += `<div class="cr-grid-hour${isToday ? ' cr-today' : ''}">${formatThaiWeekday(d)}<br>${formatThaiShortDate(d)}${isToday ? '<br>◉' : ''}</div>`;
  });

  // ---- Hour rows ----
  CR_HOURS.forEach(hour => {
    const hourLabel = `${String(hour).padStart(2,'0')}:00`;

    html += `<div class="cr-grid-day-label"><span class="cr-day-name">${hourLabel}</span></div>`;

    days.forEach(d => {
      const ds = toDS(d);
      const isToday = ds === today;
      const booking = getBookingAt(ds, hour);

      if (booking && isBookingStart(booking, hour)) {
        const span = bookingSpan(booking);
        const name = booking.booker_name || 'จอง';
        // Booking start cell — spans multiple rows via inline style trick using a wrapper
        html += `<div class="cr-grid-cell${isToday ? ' cr-cell-today' : ''}" style="position:relative;">
          <div class="cr-booking-block" style="position:absolute;inset:3px;z-index:2;height:calc(${span}00% + ${(span-1) * 1}px - 6px);">
            <span class="cr-bk-name">${escHtml(name)}</span>
            <span class="cr-bk-time">${booking.start_time.slice(0,5)}–${booking.end_time.slice(0,5)}</span>
          </div>
        </div>`;
      } else if (booking && !isBookingStart(booking, hour)) {
        // Continuation cell — transparent so booking block from start cell shows through
        html += `<div class="cr-grid-cell-transparent"></div>`;
      } else {
        html += `<div class="cr-grid-cell${isToday ? ' cr-cell-today' : ''}"></div>`;
      }
    });
  });

  html += '</div>';
  wrap.innerHTML = html;
}

function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  updateClock();
  setInterval(updateClock, 1000);
  loadCRData();
  loadCRGallery();
  // Refresh every 5 minutes
  setInterval(loadCRData, 5 * 60 * 1000);
  setInterval(loadCRGallery, 5 * 60 * 1000);
});
