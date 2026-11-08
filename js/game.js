// js/game.js
let masterQuestionBank = [];
let activePlayQuestions = [];
let currentIndex = 0;
let score = 0;
let formattedFullName = "";
let firstNameFormatted = "";
let middleNameFormatted = "";
let lastNameFormatted = "";
let normalizedPlayerKey = "";

let gameDuration = 60;
let timeLeft = 60;
let timerInterval = null;
let startTime = 0;
const broadcast = ('BroadcastChannel' in window) ? new BroadcastChannel('quiz_channel') : null;

// Built-in English Questions fallback (ensures offline/local execution never fails)
const defaultQuestions = [
  { Question: "Which planet is known as the Red Planet?", OptionA: "Venus", OptionB: "Mars", OptionC: "Jupiter", OptionD: "Saturn", CorrectAnswer: "B", Difficulty: 1 },
  { Question: "How many days are in a leap year?", OptionA: "364", OptionB: "365", OptionC: "366", OptionD: "367", CorrectAnswer: "C", Difficulty: 1 },
  { Question: "What is the largest ocean on Earth?", OptionA: "Atlantic Ocean", OptionB: "Indian Ocean", OptionC: "Arctic Ocean", OptionD: "Pacific Ocean", CorrectAnswer: "D", Difficulty: 1 },
  { Question: "What is the boiling point of water at sea level?", OptionA: "90°C", OptionB: "100°C", OptionC: "110°C", OptionD: "120°C", CorrectAnswer: "B", Difficulty: 1 },
  { Question: "Which country is home to the Great Barrier Reef?", OptionA: "Australia", OptionB: "Brazil", OptionC: "Philippines", OptionD: "South Africa", CorrectAnswer: "A", Difficulty: 2 },
  { Question: "What chemical element is designated by the symbol 'Au'?", OptionA: "Silver", OptionB: "Argon", OptionC: "Gold", OptionD: "Uranium", CorrectAnswer: "C", Difficulty: 2 },
  { Question: "Who developed the theory of general relativity?", OptionA: "Isaac Newton", OptionB: "Albert Einstein", OptionC: "Nikola Tesla", OptionD: "Galileo Galilei", CorrectAnswer: "B", Difficulty: 2 },
  { Question: "Which human organ is responsible for filtering blood?", OptionA: "Heart", OptionB: "Lungs", OptionC: "Kidneys", OptionD: "Stomach", CorrectAnswer: "C", Difficulty: 2 },
  { Question: "What is the speed of light in vacuum (approx)?", OptionA: "150,000 km/s", OptionB: "300,000 km/s", OptionC: "450,000 km/s", OptionD: "600,000 km/s", CorrectAnswer: "B", Difficulty: 3 },
  { Question: "In computer science, what does 'RAM' stand for?", OptionA: "Read Access Memory", OptionB: "Random Access Memory", OptionC: "Rapid Action Module", OptionD: "Real Audio Matrix", CorrectAnswer: "B", Difficulty: 3 },
  { Question: "What is the smallest prime number?", OptionA: "0", OptionB: "1", OptionC: "2", OptionD: "3", CorrectAnswer: "C", Difficulty: 3 },
  { Question: "Which year did Apollo 11 land on the Moon?", OptionA: "1965", OptionB: "1968", OptionC: "1969", OptionD: "1972", CorrectAnswer: "C", Difficulty: 3 }
];

window.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const timeParam = urlParams.get('time');
  if (timeParam && !isNaN(parseInt(timeParam, 10))) {
    gameDuration = parseInt(timeParam, 10);
  } else {
    const saved = localStorage.getItem('quiz_admin_timer');
    if (saved) gameDuration = parseInt(saved, 10);
  }
  timeLeft = gameDuration;

  document.getElementById('configured-timer-label').textContent = formatTimer(gameDuration);
  document.getElementById('timer-display').textContent = `⏱️ ${formatTimer(gameDuration)}`;

  await loadQuestionsFromExcel();
});

function formatTimer(sec) {
  if (sec % 60 === 0) return `${sec / 60} min${sec > 60 ? 's' : ''}`;
  return `${sec}s`;
}

async function loadQuestionsFromExcel() {
  try {
    // Cache-buster parameter ensures updated Excel is always loaded
    const res = await fetch('questions/questions.xlsx?v=' + Date.now(), { cache: 'no-store' });
    if (!res.ok) throw new Error("Fetch failed with status " + res.status);
    const arrayBuffer = await res.arrayBuffer();
    const wb = XLSX.read(arrayBuffer, { type: 'array' });

    // Pick sheet with most rows
    let bestSheet = wb.SheetNames[0];
    let maxRows = 0;
    let rawData = [];

    for (const name of wb.SheetNames) {
      const data = XLSX.utils.sheet_to_json(wb.Sheets[name]);
      if (data.length > maxRows) {
        maxRows = data.length;
        bestSheet = name;
        rawData = data;
      }
    }

    if (rawData && rawData.length > 0) {
      masterQuestionBank = rawData.map(row => {
        const getVal = (patterns) => {
          for (const key of Object.keys(row)) {
            const cleanKey = key.trim().toLowerCase().replace(/[\s_-]/g, '');
            if (patterns.includes(cleanKey)) return row[key];
          }
          return '';
        };

        return {
          Question: getVal(['question', 'q', 'questiontext']),
          OptionA: getVal(['optiona', 'a', 'opta']),
          OptionB: getVal(['optionb', 'b', 'optb']),
          OptionC: getVal(['optionc', 'c', 'optc']),
          OptionD: getVal(['optiond', 'd', 'optd']),
          CorrectAnswer: (getVal(['correctanswer', 'answer', 'correct', 'ans']) || 'A').toString().trim().toUpperCase(),
          Difficulty: Number(getVal(['difficulty', 'diff', 'level'])) || 1
        };
      });
      console.log(`Loaded ${masterQuestionBank.length} questions from sheet "${bestSheet}"`);
    } else {
      masterQuestionBank = defaultQuestions;
    }
  } catch (err) {
    console.warn("Using default fallback questions:", err);
    masterQuestionBank = defaultQuestions;
  }
}

function toProperTitleCase(str) {
  if (!str) return "";
  return str.trim().split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
}

function getNormalizedKey(f, m, l) {
  const full = `${f} ${m} ${l}`.replace(/\s+/g, ' ').trim().toLowerCase();
  return full.replace(/[.#$\[\]\/]/g, '_');
}

async function checkIfPlayerAlreadyPlayed(normalizedKey) {
  if (isFirebaseActive && db) {
    try {
      const snap = await db.ref('leaderboard/' + normalizedKey).once('value');
      if (snap.exists()) return snap.val();
      return null;
    } catch (e) {
      console.error("Firebase lookup error:", e);
    }
  }

  try {
    const localRaw = localStorage.getItem('quiz_leaderboard');
    if (localRaw) {
      const list = JSON.parse(localRaw);
      const match = list.find(p => p.normalizedKey === normalizedKey);
      if (match) return match;
    }
  } catch(e) {}
  return null;
}

function shuffleArray(arr) {
  const array = [...arr];
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

async function validateAndStartGame() {
  const rawFirst = document.getElementById('first-name').value;
  const rawMiddle = document.getElementById('middle-name').value;
  const rawLast = document.getElementById('last-name').value;

  if (!rawFirst.trim() || !rawLast.trim()) {
    alert("Please enter both First Name and Last Name.");
    return;
  }

  firstNameFormatted = toProperTitleCase(rawFirst);
  middleNameFormatted = toProperTitleCase(rawMiddle);
  lastNameFormatted = toProperTitleCase(rawLast);

  formattedFullName = middleNameFormatted 
    ? `${firstNameFormatted} ${middleNameFormatted} ${lastNameFormatted}`
    : `${firstNameFormatted} ${lastNameFormatted}`;

  normalizedPlayerKey = getNormalizedKey(firstNameFormatted, middleNameFormatted, lastNameFormatted);

  const existingPlayer = await checkIfPlayerAlreadyPlayed(normalizedPlayerKey);
  if (existingPlayer) {
    showRedundancyModal(formattedFullName, existingPlayer.score);
    return;
  }

  // Shuffle tiers
  const level1 = masterQuestionBank.filter(q => (Number(q.Difficulty) || 1) === 1);
  const level2 = masterQuestionBank.filter(q => (Number(q.Difficulty) || 1) === 2);
  const level3 = masterQuestionBank.filter(q => (Number(q.Difficulty) || 1) >= 3);

  if (level1.length === 0 && level2.length === 0) {
    activePlayQuestions = shuffleArray(masterQuestionBank);
  } else {
    activePlayQuestions = [
      ...shuffleArray(level1),
      ...shuffleArray(level2),
      ...shuffleArray(level3)
    ];
  }

  currentIndex = 0;
  score = 0;
  timeLeft = gameDuration;
  document.getElementById('solved-count').textContent = score;

  document.getElementById('screen-register').style.display = 'none';
  const gameScreen = document.getElementById('screen-game');
  gameScreen.style.display = 'flex';

  startTime = Date.now();
  renderQuestion();

  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    timeLeft--;
    const timerElem = document.getElementById('timer-display');
    timerElem.textContent = `⏱️ ${timeLeft}s`;

    if (timeLeft <= 0) {
      endGame();
    }
  }, 1000);
}

function showRedundancyModal(name, prevScore) {
  const modal = document.getElementById('redundancy-modal');
  const msg = document.getElementById('redundancy-message');
  msg.innerHTML = `Hello <strong>${name}</strong>!<br><br>A round has already been recorded for this name with a score of <strong>${prevScore}</strong>. To keep the competition fair, each player gets <strong>one official round</strong>.<br><br>Check the host screen to view your ranking!`;
  modal.style.display = 'flex';
}

function closeRedundancyModal() {
  document.getElementById('redundancy-modal').style.display = 'none';
}

function renderQuestion() {
  if (currentIndex >= activePlayQuestions.length) {
    endGame();
    return;
  }

  const q = activePlayQuestions[currentIndex];
  const diff = Number(q.Difficulty) || 1;
  const diffLabel = diff === 1 ? "Level 1: Easy" : diff === 2 ? "Level 2: Medium" : "Level 3: Hard";

  document.getElementById('diff-tag').textContent = diffLabel;
  document.getElementById('q-text').textContent = q.Question;
  document.getElementById('opt-a-text').textContent = q.OptionA;
  document.getElementById('opt-b-text').textContent = q.OptionB;
  document.getElementById('opt-c-text').textContent = q.OptionC;
  document.getElementById('opt-d-text').textContent = q.OptionD;
}

function submitAnswer(choice) {
  const q = activePlayQuestions[currentIndex];
  const correct = (q.CorrectAnswer || '').toString().trim().toUpperCase();
  const isCorrect = choice.toUpperCase() === correct;

  if (isCorrect) {
    score++;
    document.getElementById('solved-count').textContent = score;
  }

  currentIndex++;
  renderQuestion();
}

// Requirement 7: FIRECRACKERS WHEN THE GAME FINISHES (NOT PARTY POPPERS)
function endGame() {
  clearInterval(timerInterval);
  const timeTaken = Math.min(gameDuration, (Date.now() - startTime) / 1000);

  document.getElementById('screen-game').style.display = 'none';
  const gameoverScreen = document.getElementById('screen-gameover');
  gameoverScreen.style.display = 'flex';
  document.getElementById('gameover-player-name').textContent = `Shubh Deepavali, ${formattedFullName}! 🪔`;
  document.getElementById('final-score').textContent = score;
  document.getElementById('final-time').textContent = `Time taken: ${timeTaken.toFixed(1)}s`;

  // Trigger grand Diwali firecracker barrage on phone screen
  if (window.firecrackers) {
    window.firecrackers.triggerSalvo(6);
  }

  savePlayerScore(formattedFullName, firstNameFormatted, middleNameFormatted, lastNameFormatted, score, timeTaken, normalizedPlayerKey);
}

function savePlayerScore(name, fName, mName, lName, finalScore, totalTime, normKey) {
  const playerData = {
    name: name,
    firstName: fName,
    middleName: mName,
    lastName: lName,
    score: finalScore,
    totalTime: totalTime,
    normalizedKey: normKey,
    timestamp: Date.now()
  };

  if (isFirebaseActive && db) {
    db.ref('leaderboard/' + normKey).set(playerData);
  }

  try {
    const raw = localStorage.getItem('quiz_leaderboard');
    let list = raw ? JSON.parse(raw) : [];
    const idx = list.findIndex(p => p.normalizedKey === normKey);
    if (idx >= 0) list[idx] = playerData;
    else list.push(playerData);
    localStorage.setItem('quiz_leaderboard', JSON.stringify(list));

    if (broadcast) {
      broadcast.postMessage({ type: 'NEW_SCORE', data: playerData });
    }
  } catch(e) {}
}
