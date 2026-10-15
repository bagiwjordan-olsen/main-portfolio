/* ============================================================
   App 7 — Interactive Student Quiz Platform
   ============================================================ */
'use strict';

const $  = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];

/* ---------- State ---------- */
let QUIZ = { title: '', description: '', timePerQuestion: 30 };
let QUESTIONS = [];
let current = 0;
let score = 0;
let answers = [];      // { questionIndex, chosen, correct }
let timerId = null;
let timeLeft = 0;
let locked = false;

const KEYS = ['A', 'B', 'C', 'D', 'E'];

const escapeHtml = (str) =>
  String(str).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ------------------------------------------------------------
   Screens
   ------------------------------------------------------------ */
function showScreen(id) {
  ['#startScreen', '#quizScreen', '#resultScreen'].forEach((sel) => {
    $(sel).hidden = sel !== id;
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ------------------------------------------------------------
   Start screen
   ------------------------------------------------------------ */
function renderStart() {
  $('#quizTitle').textContent = QUIZ.title;
  $('#quizDesc').textContent  = QUIZ.description;
  $('#quizSubtitle').textContent =
    `${QUESTIONS.length} questions · ${QUIZ.timePerQuestion} seconds each`;

  $('#startList').innerHTML = [
    `${QUESTIONS.length} multiple-choice questions`,
    `${QUIZ.timePerQuestion}-second timer per question`,
    'Instant feedback after each answer',
    'Full answer review at the end'
  ].map((t) => `<li>${escapeHtml(t)}</li>`).join('');

  showScreen('#startScreen');
}

/* ------------------------------------------------------------
   Timer
   ------------------------------------------------------------ */
function startTimer() {
  clearInterval(timerId);
  timeLeft = QUIZ.timePerQuestion;
  updateTimerUI();

  timerId = setInterval(() => {
    timeLeft--;
    updateTimerUI();

    if (timeLeft <= 0) {
      clearInterval(timerId);
      lockQuestion(-1);           // -1 = timed out, no answer
      $('#nextBtn').disabled = false;
    }
  }, 1000);
}

function updateTimerUI() {
  const el = $('#timer');
  el.textContent = timeLeft;
  el.classList.toggle('warn', timeLeft <= 10 && timeLeft > 5);
  el.classList.toggle('danger', timeLeft <= 5);
}

/* ------------------------------------------------------------
   Render one question
   ------------------------------------------------------------ */
function renderQuestion() {
  locked = false;
  const q = QUESTIONS[current];

  $('#qCounter').textContent = `Question ${current + 1} of ${QUESTIONS.length}`;
  $('#progressFill').style.width = `${((current) / QUESTIONS.length) * 100}%`;
  $('#qCategory').textContent = q.category || 'General';
  $('#qText').textContent = q.question;

  $('#options').innerHTML = q.options.map((opt, i) => `
    <button class="option" type="button" data-index="${i}">
      <span class="option-key">${KEYS[i]}</span>
      <span>${escapeHtml(opt)}</span>
    </button>
  `).join('');

  $('#nextBtn').disabled = true;
  $('#nextBtn').textContent = current === QUESTIONS.length - 1 ? 'See Results →' : 'Next →';

  startTimer();
}

/* ------------------------------------------------------------
   Lock in an answer
   ------------------------------------------------------------ */
function lockQuestion(chosenIndex) {
  if (locked) return;
  locked = true;
  clearInterval(timerId);

  const q = QUESTIONS[current];
  const isCorrect = chosenIndex === q.answer;

  if (isCorrect) score++;

  answers.push({
    questionIndex: current,
    chosen: chosenIndex,
    correct: isCorrect
  });

  $$('.option').forEach((btn, i) => {
    btn.classList.add('locked');
    btn.disabled = true;
    if (i === q.answer) btn.classList.add('correct');
    if (i === chosenIndex && !isCorrect) btn.classList.add('wrong');
  });

  $('#nextBtn').disabled = false;
}

/* ------------------------------------------------------------
   Advance
   ------------------------------------------------------------ */
function nextQuestion() {
  if (current < QUESTIONS.length - 1) {
    current++;
    renderQuestion();
  } else {
    finishQuiz();
  }
}

/* ------------------------------------------------------------
   Results
   ------------------------------------------------------------ */
function finishQuiz() {
  clearInterval(timerId);
  $('#progressFill').style.width = '100%';

  const total = QUESTIONS.length;
  const pct = Math.round((score / total) * 100);

  $('#scorePct').textContent = pct + '%';
  $('#scoreLine').textContent = `You scored ${score} out of ${total} correct.`;

  // Animate the conic-gradient ring
  const ring = $('#scoreRing');
  ring.style.background = `conic-gradient(var(--gold) ${pct * 3.6}deg, rgba(255,255,255,.07) 0deg)`;

  let verdict, color;
  if (pct >= 90)      { verdict = '🏆 Outstanding! You really know your stuff.'; color = 'var(--ok)'; }
  else if (pct >= 75) { verdict = '👍 Great job! Solid understanding.';          color = 'var(--ok)'; }
  else if (pct >= 60) { verdict = '📖 Good effort. Review a few topics.';        color = 'var(--warn)'; }
  else                { verdict = '💪 Keep studying — you\'ll get there.';       color = 'var(--bad)'; }

  $('#scoreTitle').textContent = pct >= 75 ? 'Well Done!' : 'Quiz Complete';
  $('#scoreVerdict').textContent = verdict;
  $('#scoreVerdict').style.color = color;

  renderReview();
  $('#review').hidden = true;
  showScreen('#resultScreen');
}

/* ------------------------------------------------------------
   Answer review
   ------------------------------------------------------------ */
function renderReview() {
  $('#review').innerHTML = answers.map((a, i) => {
    const q = QUESTIONS[a.questionIndex];
    const chosenText = a.chosen === -1
      ? '<b>No answer (time ran out)</b>'
      : `<b>${escapeHtml(q.options[a.chosen])}</b>`;

    return `
      <article class="review-item ${a.correct ? 'ok' : 'no'}">
        <p class="review-q">${i + 1}. ${escapeHtml(q.question)}</p>
        <p class="review-a ${a.correct ? 'your-correct' : 'your-wrong'}">
          Your answer: ${chosenText}
        </p>
        <p class="review-a">
          Correct answer: <b>${escapeHtml(q.options[q.answer])}</b>
        </p>
        ${q.explanation ? `<p class="review-explain">💡 ${escapeHtml(q.explanation)}</p>` : ''}
      </article>
    `;
  }).join('');
}

/* ------------------------------------------------------------
   Reset + start
   ------------------------------------------------------------ */
function startQuiz() {
  // Shuffle question order
  QUESTIONS = [...QUESTIONS].sort(() => Math.random() - 0.5);

  current = 0;
  score = 0;
  answers = [];
  $('#review').hidden = true;
  showScreen('#quizScreen');
  renderQuestion();
}

/* ------------------------------------------------------------
   Event wiring
   ------------------------------------------------------------ */
$('#startBtn').addEventListener('click', startQuiz);

$('#options').addEventListener('click', (e) => {
  const btn = e.target.closest('.option');
  if (!btn || locked) return;
  lockQuestion(Number(btn.dataset.index));
});

$('#nextBtn').addEventListener('click', nextQuestion);

$('#quitBtn').addEventListener('click', () => {
  clearInterval(timerId);
  renderStart();
});

$('#retryBtn').addEventListener('click', () => {
  $('#review').hidden = true;
  renderStart();
});

$('#reviewBtn').addEventListener('click', () => {
  const box = $('#review');
  box.hidden = !box.hidden;
  $('#reviewBtn').textContent = box.hidden ? '📋 Review Answers' : '📋 Hide Review';
});

/* ------------------------------------------------------------
   Boot
   ------------------------------------------------------------ */
async function init() {
  try {
    const res = await fetch('./data.json');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();

    QUIZ = { ...QUIZ, ...(data.quiz || {}) };
    QUESTIONS = data.questions || [];
    renderStart();
  } catch (err) {
    console.error('[app7] data.json failed:', err);
    $('#quizTitle').textContent = 'Could not load questions';
    $('#quizDesc').textContent = 'Run this page from a local server or GitHub Pages so data.json can be fetched.';
    $('#startBtn').disabled = true;
  }
}

init();