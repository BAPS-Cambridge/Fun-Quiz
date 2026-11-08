// js/host.js
let qrInstance = null;
let currentTimerSeconds = 60;
let currentLeaderboard = [];
const broadcast = ('BroadcastChannel' in window) ? new BroadcastChannel('quiz_channel') : null;

window.addEventListener('DOMContentLoaded', () => {
  const savedTimer = localStorage.getItem('quiz_admin_timer');
  if (savedTimer) {
    currentTimerSeconds = parseInt(savedTimer, 10);
  }
  updateTimerLabelUI();
  generateQrCode();
  listenToLeaderboard();

  // Close timer dropdown on click outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#timer-toggle') && !e.target.closest('#timer-popover')) {
      const popover = document.getElementById('timer-popover');
      if (popover) popover.style.display = 'none';
    }
  });
});

function toggleTimerMenu(e) {
  e.stopPropagation();
  const popover = document.getElementById('timer-popover');
  popover.style.display = popover.style.display === 'none' ? 'flex' : 'none';
}

function selectTimer(seconds, label) {
  currentTimerSeconds = seconds;
  localStorage.setItem('quiz_admin_timer', currentTimerSeconds);
  updateTimerLabelUI();
  generateQrCode();

  if (isFirebaseActive && db) {
    db.ref('settings/timer').set(currentTimerSeconds);
  }

  // Update button active state
  document.querySelectorAll('.timer-opt-btn').forEach(btn => {
    btn.classList.toggle('active', btn.textContent.includes(label));
  });

  const popover = document.getElementById('timer-popover');
  if (popover) popover.style.display = 'none';
}

function updateTimerLabelUI() {
  const labelElem = document.getElementById('current-timer-label');
  if (!labelElem) return;
  if (currentTimerSeconds === 30) labelElem.textContent = "30 Seconds";
  else if (currentTimerSeconds === 60) labelElem.textContent = "1 Minute";
  else if (currentTimerSeconds === 90) labelElem.textContent = "1.5 Minutes";
  else if (currentTimerSeconds === 120) labelElem.textContent = "2 Minutes";
  else if (currentTimerSeconds === 180) labelElem.textContent = "3 Minutes";
  else labelElem.textContent = `${Math.floor(currentTimerSeconds / 60)} Mins`;
}

function getPlayerUrl() {
  const base = window.location.href.split('?')[0].replace(/index\.html$/, '').replace(/\/$/, '');
  return `${base}/game.html?time=${currentTimerSeconds}`;
}

// BIGGER QR CODE (280x280)
function generateQrCode() {
  const url = getPlayerUrl();
  document.getElementById('game-link').textContent = url;

  const container = document.getElementById('qrcode');
  container.innerHTML = '';
  qrInstance = new QRCode(container, {
    text: url,
    width: 280,
    height: 280,
    colorDark: "#150228",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.M
  });
}

function listenToLeaderboard() {
  if (isFirebaseActive && db) {
    db.ref('leaderboard').on('value', (snap) => {
      const data = snap.val() || {};
      processLeaderboardData(Object.values(data), true);
    });
  } else {
    loadLocalLeaderboard();

    if (broadcast) {
      broadcast.onmessage = (event) => {
        if (event.data && event.data.type === 'NEW_SCORE') {
          loadLocalLeaderboard(true);
        }
      };
    }

    window.addEventListener('storage', (e) => {
      if (e.key === 'quiz_leaderboard') {
        loadLocalLeaderboard(true);
      }
    });
  }
}

function loadLocalLeaderboard(triggerAnim = false) {
  try {
    const raw = localStorage.getItem('quiz_leaderboard');
    const list = raw ? JSON.parse(raw) : [];
    processLeaderboardData(list, triggerAnim);
  } catch(e) {
    console.error(e);
  }
}

function processLeaderboardData(players, triggerAnim = false) {
  players.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.totalTime - b.totalTime;
  });

  const prevLeader = currentLeaderboard.length > 0 ? currentLeaderboard[0].name : null;
  currentLeaderboard = players;

  // DIWALI FIRECRACKER CELEBRATION WHEN A NEW LEADER TAKES #1
  if (triggerAnim && currentLeaderboard.length > 0 && currentLeaderboard[0].name !== prevLeader && window.firecrackers) {
    window.firecrackers.triggerSalvo(5);
  }

  renderLeaderboard();
}

function renderLeaderboard() {
  const tbody = document.getElementById('leaderboard-body');
  document.getElementById('player-count-badge').textContent = currentLeaderboard.length;
  tbody.innerHTML = '';

  if (currentLeaderboard.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; opacity: 0.6; padding: 50px;">Waiting for contestants to scan & play...</td></tr>';
    return;
  }

  currentLeaderboard.forEach((p, idx) => {
    const rank = idx + 1;
    const rankClass = rank === 1 ? 'rank-1' : rank === 2 ? 'rank-2' : rank === 3 ? 'rank-3' : 'rank-other';
    const finishedDate = p.timestamp ? new Date(p.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><span class="rank-badge ${rankClass}">${rank}</span></td>
      <td><strong>${escapeHtml(p.name)}</strong></td>
      <td style="text-align: center; font-weight: 800; color: #ffd700; font-size: 1.25rem;">${p.score}</td>
      <td style="text-align: right; opacity: 0.9;">${Number(p.totalTime).toFixed(1)}s</td>
      <td style="text-align: right; opacity: 0.75; font-size: 0.85rem;">${finishedDate}</td>
    `;
    tbody.appendChild(tr);
  });
}

// 1-Click Excel Export
function exportLeaderboardToExcel() {
  if (currentLeaderboard.length === 0) {
    alert("No player scores recorded yet to export.");
    return;
  }

  const excelData = currentLeaderboard.map((p, idx) => ({
    "Rank": idx + 1,
    "Full Name": p.name,
    "First Name": p.firstName || "",
    "Middle Name": p.middleName || "",
    "Last Name": p.lastName || "",
    "Questions Solved": p.score,
    "Time Taken (seconds)": Number(p.totalTime).toFixed(1),
    "Date Finished": p.timestamp ? new Date(p.timestamp).toLocaleString() : new Date().toLocaleString()
  }));

  const worksheet = XLSX.utils.json_to_sheet(excelData);
  worksheet['!cols'] = [
    { wch: 8 }, { wch: 26 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 18 }, { wch: 20 }, { wch: 24 }
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Diwali Leaderboard");
  XLSX.writeFile(workbook, `Diwali_Quiz_Leaderboard_${new Date().toISOString().slice(0,10)}.xlsx`);
}

function clearLeaderboard() {
  if (confirm("Reset the entire leaderboard? This will clear all records and allow players to play again.")) {
    if (isFirebaseActive && db) {
      db.ref('leaderboard').remove();
      db.ref('settings/lastReset').set(Date.now());
    }
    localStorage.removeItem('quiz_leaderboard');
    currentLeaderboard = [];
    renderLeaderboard();
    if (broadcast) broadcast.postMessage({ type: 'RESET' });
  }
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.innerText = str || '';
  return d.innerHTML;
}
