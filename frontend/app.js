'use strict';

// 1. Configuration
const API_URL = '/api/chat';
const STORAGE_KEY = 'teacherbot.workspace.v1';
const SAMPLE_ID = 'merge-sort';

// 2. Small helpers
// $(selector) finds an element in index.html, like $('#lesson-title').
const $ = (selector) => document.querySelector(selector);

// Escape user text before inserting it into an HTML template.
function escapeHTML(text) {
  const replacements = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };

  return String(text).replace(/[&<>"']/g, (character) => replacements[character]);
}

// Reuse the SVG symbols defined near the top of index.html.
function icon(name) {
  return `<svg aria-hidden="true"><use href="#${name}"/></svg>`;
}

// 3. Sample lesson and practice data
const sampleMaterial = "Merge sort is a divide-and-conquer sorting algorithm. Split the list into halves until every sublist contains at most one element. Merge sorted sublists by repeatedly comparing their first remaining elements and taking the smaller one. Standard array merge sort takes O(n log n) time and O(n) auxiliary space. A one-element list is already sorted.";

const steps = [
  {
    "title": "A big problem. Smaller pieces.",
    "body": "Imagine sorting a stack of cards. Instead of tackling the whole stack at once, <strong>split it into smaller groups</strong>, sort those, then put them back together.",
    "tip": "Divide, then conquer",
    "detail": "Merge sort breaks a list into halves until the pieces are easy to sort. Then it merges them back in order.",
    "caption": "Start with your list. Split it down the middle.",
    "top": [
      [
        8,
        3,
        5,
        1
      ]
    ],
    "bottom": [
      [
        8,
        3
      ],
      [
        5,
        1
      ]
    ],
    "label": "Divide into two halves"
  },
  {
    "title": "Keep going until it’s simple.",
    "body": "Split each half again. When a list contains <strong>just one element</strong>, there’s nothing left to sort. This is our base case.",
    "tip": "One item is already sorted",
    "detail": "Recursion stops when the list has zero or one element. It cannot be divided into smaller useful pieces.",
    "caption": "Four tiny lists. Each one is already sorted.",
    "top": [
      [
        8,
        3
      ],
      [
        5,
        1
      ]
    ],
    "bottom": [
      [
        8
      ],
      [
        3
      ],
      [
        5
      ],
      [
        1
      ]
    ],
    "label": "Reach the base case"
  },
  {
    "title": "Bring the pieces back together.",
    "body": "Compare the first remaining element in each sorted list. Take the <strong>smaller one</strong>, then compare again. Repeat until every element is in the result.",
    "tip": "The merge is where the sorting happens",
    "detail": "Compare 8 and 3: take 3, then 8. Compare 5 and 1: take 1, then 5. Now we have two sorted halves.",
    "caption": "The pieces grow, and they stay in order.",
    "top": [
      [
        8
      ],
      [
        3
      ],
      [
        5
      ],
      [
        1
      ]
    ],
    "bottom": [
      [
        3,
        8
      ],
      [
        1,
        5
      ]
    ],
    "label": "Merge sorted pieces"
  },
  {
    "title": "One sorted list. A useful pattern.",
    "body": "Merge [3, 8] and [1, 5]: take 1, then 3, then 5, and finally 8. The result is sorted. Each level does <strong>O(n) work</strong>, across roughly <strong>log₂(n) levels</strong>.",
    "tip": "Time complexity: O(n log n)",
    "detail": "Splitting creates logarithmic depth. Merging processes all n elements across each level. Standard array merge sort uses O(n) extra space.",
    "caption": "Small steps add up to a sorted result.",
    "top": [
      [
        3,
        8
      ],
      [
        1,
        5
      ]
    ],
    "bottom": [
      [
        1,
        3,
        5,
        8
      ]
    ],
    "label": "The final merge"
  }
];

const questions = [
  {
    "question": "Why is a one-element list the base case for merge sort?",
    "options": [
      "It is already sorted.",
      "It contains the smallest number.",
      "It requires one final swap."
    ],
    "answer": 0,
    "hint": "Think about whether a single number can be in the wrong order.",
    "explanation": "A single element is already sorted, so no more splitting or comparisons are needed."
  },
  {
    "question": "When merging [3, 8] and [1, 5], which element do you take first?",
    "options": [
      "3",
      "8",
      "1"
    ],
    "answer": 2,
    "hint": "Compare the first remaining number in each sorted half.",
    "explanation": "Compare 3 and 1. Take 1 first because it is smaller, then continue comparing the remaining elements."
  },
  {
    "question": "What is the time complexity of standard merge sort?",
    "options": [
      "O(n)",
      "O(n log n)",
      "O(n²)"
    ],
    "answer": 1,
    "hint": "There are about log₂(n) levels, and each level processes n elements.",
    "explanation": "Each of the log₂(n) levels does O(n) total work, giving O(n log n) overall."
  }
];

// 4. Application state and browser storage
// Each lesson keeps its own notes, progress, and conversation.
let state = {
  lessons: [
    {
      id: 'general-study',
      title: 'New study session',
      material: '',
      notes: '',
      step: 0,
      reviewed: [],
      correct: [],
      messages: []
    }
  ],
  active: 'general-study'
};

try {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
  const hasValidLessons = saved
    && Array.isArray(saved.lessons)
    && saved.lessons.length > 0
    && saved.lessons.every((item) => (
      typeof item.id === 'string'
      && typeof item.title === 'string'
      && typeof item.material === 'string'
      && Array.isArray(item.messages)
      && Array.isArray(item.correct)
      && Array.isArray(item.reviewed)
    ));

  if (hasValidLessons) {
    state = saved;

    if (!state.lessons.some((item) => item.id === state.active)) {
      state.active = state.lessons[0].id;
    }
  }
} catch {
  // If saved data is unavailable, use the initial sample lesson.
}

let currentTab = 'learn';
let currentView = 'study';
let quizIndex = 0;
let busy = false;
let toastTimer;

function lesson() {
  return state.lessons.find((item) => item.id === state.active);
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    toast('Browser storage is full or unavailable. Changes are kept for this visit.');
    return false;
  }
}

function toast(message) {
  $('#toast').textContent = message;
  $('#toast').hidden = false;

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    $('#toast').hidden = true;
  }, 4500);
}

// 5. Sidebar and material cards
function renderSidebar() {
  $('#lesson-list').innerHTML = state.lessons.map((item) => `
    <button
      class="lesson-link ${item.id === state.active ? 'active' : ''}"
      data-lesson="${escapeHTML(item.id)}"
    >
      ${icon('file')}
      <span>${escapeHTML(item.title)}</span>
    </button>
  `).join('');

  $('#material-count').textContent = state.lessons.length;
  $('#lesson-count').textContent = String(state.lessons.length).padStart(2, '0');

  $('#materials-grid').innerHTML = state.lessons.map((item) => {
    const description = item.id === SAMPLE_ID
      ? 'A guided lesson in divide and conquer.'
      : escapeHTML(item.material.slice(0, 110))
        + (item.material.length > 110 ? '…' : '');

    return `
      <button class="material-card" data-lesson="${escapeHTML(item.id)}">
        ${icon('book')}
        <h3>${escapeHTML(item.title)}</h3>
        <p>${description}</p>
        <span class="text-button">Open lesson ${icon('arrow')}</span>
      </button>
    `;
  }).join('');
}

// 6. Lesson panel: heading, Learn tab, and progress bar
function renderLesson() {
  const currentLesson = lesson();
  const isSample = currentLesson.id === SAMPLE_ID;

  $('#lesson-title').textContent = currentLesson.title;
  $('#subject').textContent = isSample ? 'COMPUTER SCIENCE' : 'YOUR MATERIAL';
  $('#lesson-meta').textContent = isSample
    ? 'Algorithms · A guided introduction'
    : 'Personal study material · Saved on this device';
  $('.tab-count').textContent = isSample ? '3' : 'AI';
  $('#notes').value = currentLesson.notes || '';

  renderLearn();
  renderPractice();
  renderMessages();
  renderProgress();
  renderSidebar();
}

// Build the rows of numbered cells in the merge-sort illustration.
function arrays(groups, sage = false) {
  const groupHTML = groups.map((group) => {
    const cells = group.map((number) => (
      `<span class="array-cell ${sage ? 'sage' : ''}">${number}</span>`
    )).join('');

    return `<div class="array-group">${cells}</div>`;
  }).join('');

  return `<div class="array-row">${groupHTML}</div>`;
}

function renderLearn() {
  const currentLesson = lesson();

  // Custom lessons show the material the student supplied.
  if (currentLesson.id !== SAMPLE_ID) {
    const guidance = API_URL
      ? 'Ask the tutor to explain a concept or make a practice question.'
      : 'Connect your Python backend to generate explanations and practice from these notes.';

    $('#learn-panel').innerHTML = `
      <p class="step-label">YOUR SOURCE MATERIAL</p>
      <h3>Start with what you know.</h3>
      <p class="body-copy">
        Read through your material, save your own notes,
        and bring your questions to the tutor.
      </p>
      <div class="source-text">${escapeHTML(currentLesson.material)}</div>
      <div class="concept-callout">
        ${icon('spark')}
        <div>
          <strong>A lesson, built around your material</strong>
          ${guidance}
        </div>
      </div>
    `;
    return;
  }

  // The sample lesson uses the predefined steps array.
  const stepIndex = currentLesson.step;
  const step = steps[stepIndex || 0];
  const stepDots = steps.map((_, index) => (
    `<span class="${index <= stepIndex ? 'active' : ''}"></span>`
  )).join('');

  $('#learn-panel').innerHTML = `
    <p class="step-label">
      THE BIG IDEA · ${String(stepIndex + 1).padStart(2, '0')} / 04
    </p>
    <h3>${step.title}</h3>
    <p class="body-copy">${step.body}</p>

    <div class="concept-callout">
      ${icon('spark')}
      <div>
        <strong>${step.tip}</strong>
        ${step.detail}
      </div>
    </div>

    <div class="visual-label">
      <span>LET’S SEE IT HAPPEN</span>
      <span>${step.label}</span>
    </div>

    <div class="array-demo">
      ${arrays(step.top)}
      <div class="split-arrows">
        <span>${stepIndex < 2 ? '↙' : '↘'}</span>
        <span>${stepIndex < 2 ? '↘' : '↙'}</span>
      </div>
      ${arrays(step.bottom, true)}
      <p class="array-caption">${step.caption}</p>
    </div>

    <div class="demo-controls">
      <button class="text-button" id="previous-step" ${stepIndex === 0 ? 'disabled' : ''}>
        Previous
      </button>
      <div class="step-dots" aria-label="Step ${stepIndex + 1} of 4">
        ${stepDots}
      </div>
      <button class="text-button" id="next-step">
        ${stepIndex === 3 ? 'Finish & practice' : 'Next step'}
        ${icon('arrow')}
      </button>
    </div>
  `;
}

function renderProgress() {
  const currentLesson = lesson();
  const total = currentLesson.id === SAMPLE_ID ? 7 : 0;
  const completed = currentLesson.reviewed.length + currentLesson.correct.length;

  $('#lesson-progress').style.width = total
    ? `${completed / total * 100}%`
    : '0%';

  let label = 'Your material, your pace';

  if (total > 0) {
    label = completed === 0
      ? 'Your first step starts here'
      : `${completed} of ${total} learning steps complete`;
  }

  $('#lesson-progress-label').textContent = label;
}

// 7. Practice tab
function renderPractice() {
  if (lesson().id !== SAMPLE_ID) {
    const description = API_URL
      ? 'Ask your tutor to write a question based on your material.'
      : 'The demo includes practice for merge sort. Connect your Python backend to create questions from your own material.';

    $('#practice-panel').innerHTML = `
      <p class="step-label">TURN IDEAS INTO UNDERSTANDING</p>
      <h3>Ready to put it into practice?</h3>
      <p class="body-copy">${description}</p>
      <button class="button primary" id="custom-practice">
        ${API_URL ? 'Ask for a question' : 'Try the sample lesson'}
        ${icon('arrow')}
      </button>
    `;
    return;
  }

  const question = questions[quizIndex];
  const options = question.options.map((option, index) => `
    <label class="answer-option">
      <input type="radio" name="answer" value="${index}" required>
      <span>${option}</span>
    </label>
  `).join('');

  $('#practice-panel').innerHTML = `
    <p class="step-label">QUESTION ${quizIndex + 1} OF ${questions.length}</p>
    <h3>Let’s check what clicked.</h3>
    <p class="practice-question">${question.question}</p>

    <form id="answer-form">
      <fieldset style="border:0;padding:0;margin:0">
        <legend class="sr-only">Choose an answer</legend>
        <div class="answer-options">${options}</div>
      </fieldset>
      <div class="practice-actions">
        <button type="button" class="text-button" id="question-hint">
          I’d like a hint
        </button>
        <button class="button primary" type="submit">
          Check answer ${icon('check')}
        </button>
      </div>
    </form>

    <div id="feedback" class="feedback" role="status" hidden></div>

    <div class="demo-controls">
      <button class="text-button" id="previous-question" ${quizIndex === 0 ? 'disabled' : ''}>
        Previous question
      </button>
      <button class="text-button" id="next-question">
        ${quizIndex === questions.length - 1 ? 'Back to question 1' : 'Next question'}
        ${icon('arrow')}
      </button>
    </div>
  `;
}

// 8. Tutor chat: displayed messages and API requests
function initialMessage() {
  return 'Hi! What would you like to learn today? '
    + 'You can ask a question or add your study material.';
}

function renderMessages() {
  const currentLesson = lesson();
  const messages = [
    { role: 'assistant', content: initialMessage(currentLesson) },
    ...currentLesson.messages
  ];

  $('#messages').innerHTML = messages.map((message) => {
    const isUser = message.role === 'user';
    const label = isUser ? 'YOU' : icon('spark') + ' Tutor-U';

    // Keep content directly beside its tags: CSS preserves its whitespace.
    return `
      <div class="message ${isUser ? 'user' : ''}">
        <div class="message-label">${label}</div>
        <div class="message-content">${escapeHTML(message.content)}</div>
      </div>
    `;
  }).join('');

  const scroller = $('#chat-scroll');
  scroller.scrollTop = scroller.scrollHeight;
}

// Used only while API_URL is empty. These are scripted sample responses.
function demoReply(input, currentLesson) {
  if (currentLesson.id !== SAMPLE_ID) {
    return 'Your notes are saved, but this demo cannot generate answers from new material yet. '
      + 'Connect the Python chat endpoint to enable AI tutoring. '
      + 'You can explore the full merge-sort sample in the meantime.';
  }

  const question = input.toLowerCase();

  if (question.includes('hint')) {
    return questions[quizIndex].hint
      + '\n\nTry explaining your reasoning before choosing an answer.';
  }

  if (/complex|log|time|big o/.test(question)) {
    return 'Think of the recursion as levels. At each level, the work across all merges adds up to O(n).\n\n'
      + 'Because we halve the list each time, there are about log₂(n) levels. Multiply them: O(n log n).\n\n'
      + 'For 8 elements, how many times can you halve the list before you reach 1?';
  }

  if (/merg|example/.test(question)) {
    return 'Let’s merge [3, 8] and [1, 5].\n\n'
      + '1. Compare 3 and 1. Take 1.\n'
      + '2. Compare 3 and 5. Take 3.\n'
      + '3. Compare 8 and 5. Take 5.\n'
      + '4. Only 8 remains. Add it.\n\n'
      + 'The result is [1, 3, 5, 8]. What made it useful that both halves were already sorted?';
  }

  if (/split|divid|base|simple/.test(question)) {
    return 'Imagine sorting a pile of cards. First, split the pile into two smaller piles. '
      + 'Keep splitting until each pile has just one card.\n\n'
      + 'A one-card pile is already sorted. Merge the piles back together in order, '
      + 'always choosing the smaller card first.\n\n'
      + 'If you split [8, 3, 5, 1] in half, what are the two halves?';
  }

  return 'This is a scripted frontend demo, so I can’t assess arbitrary answers yet. '
    + 'Try “Explain it simply,” “Give me an example,” or ask about time complexity.\n\n'
    + 'The Practice tab has three questions with checked answers. '
    + 'Your Python backend will enable open-ended conversations.';
}

async function sendMessage(content) {
  if (busy || !content.trim()) return;

  const currentLesson = lesson();
  currentLesson.messages.push({ role: 'user', content: content.trim() });
  $('#chat-input').value = '';

  busy = true;
  $('#chat-form button').disabled = true;
  $('#chat-form').setAttribute('aria-busy', 'true');
  renderMessages();
  save();

  try {
    let reply;

    if (API_URL) {
      // Matches the request body expected by the Python /api/chat route.
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lesson_id: currentLesson.id,
          title: currentLesson.title,
          material: currentLesson.material,
          messages: currentLesson.messages
        }),
        signal: AbortSignal.timeout(60000)
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const result = await response.json();

      if (typeof result.reply !== 'string' || !result.reply.trim()) {
        throw new Error('The server response must contain a nonempty reply string.');
      }

      reply = result.reply;
    } else {
      reply = demoReply(content, currentLesson);
    }

    currentLesson.messages.push({ role: 'assistant', content: reply });
    save();
    renderMessages();
  } catch (error) {
    currentLesson.messages.push({
      role: 'assistant',
      content: 'I couldn’t reach the tutor. Please try your question again. Your notes and lesson are still here.'
    });

    save();
    renderMessages();
    toast(error.name === 'TimeoutError'
      ? 'The tutor timed out. Please try again.'
      : 'Could not get a response. Check your backend connection.');
  } finally {
    busy = false;
    $('#chat-form button').disabled = false;
    $('#chat-form').removeAttribute('aria-busy');
    $('#chat-input').focus();
  }
}

// 9. Switching tabs, views, and lessons
function setTab(name) {
  currentTab = name;

  document.querySelectorAll('[data-tab]').forEach((button) => {
    const selected = button.dataset.tab === name;
    button.classList.toggle('active', selected);
    button.setAttribute('aria-selected', selected);
    button.tabIndex = selected ? 0 : -1;
  });

  ['learn', 'practice', 'notes'].forEach((tab) => {
    $(`#${tab}-panel`).hidden = tab !== name;
  });
}

function setView(view) {
  currentView = view;
  $('#study-view').hidden = view !== 'study';
  $('#materials-view').hidden = view !== 'materials';
  $('#page-name').textContent = view === 'study' ? 'Study room' : 'My materials';

  document.querySelectorAll('[data-view]').forEach((button) => {
    button.classList.toggle('active', button.dataset.view === view);
  });
}

function selectLesson(id) {
  if (busy) {
    toast('Wait for your tutor’s response before changing lessons.');
    return;
  }

  state.active = id;
  quizIndex = 0;
  save();
  renderLesson();
  setTab('learn');
  setView('study');
}

// 10. Button clicks
// A document-level listener also handles buttons generated after page load.
document.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button) return;

  if (button.dataset.action === 'new') {
    $('#material-dialog').showModal();
  }
  if (button.dataset.close) {
    document.getElementById(button.dataset.close).close();
  }
  if (button.dataset.view) setView(button.dataset.view);
  if (button.dataset.tab) setTab(button.dataset.tab);
  if (button.dataset.lesson) selectLesson(button.dataset.lesson);
  if (button.dataset.prompt) sendMessage(button.dataset.prompt);

  if (button.dataset.action === 'progress') {
    const sample = state.lessons.find((item) => item.id === SAMPLE_ID);

    $('#progress-content').innerHTML = `
      <div class="progress-stat">
        <strong>${state.lessons.length}</strong>
        <p>Lesson${state.lessons.length === 1 ? '' : 's'} in your collection</p>
      </div>
      <div class="progress-stat">
        <strong>${sample ? sample.reviewed.length : 0} / 4</strong>
        <p>Merge-sort concepts reviewed</p>
      </div>
      <div class="progress-stat">
        <strong>${sample ? sample.correct.length : 0} / 3</strong>
        <p>Practice questions answered correctly</p>
      </div>
    `;
    $('#progress-dialog').showModal();
  }

  const currentLesson = lesson();

  switch (button.id) {
    case 'next-step':
      if (!currentLesson.reviewed.includes(currentLesson.step)) {
        currentLesson.reviewed.push(currentLesson.step);
      }
      if (currentLesson.step < 3) {
        currentLesson.step++;
      } else {
        setTab('practice');
      }
      save();
      renderLearn();
      renderProgress();
      break;

    case 'previous-step':
      currentLesson.step = Math.max(0, currentLesson.step - 1);
      save();
      renderLearn();
      break;

    case 'practice-shortcut':
      setTab('practice');
      break;

    case 'question-hint':
      $('#feedback').hidden = false;
      $('#feedback').className = 'feedback';
      $('#feedback').textContent = questions[quizIndex].hint;
      break;

    case 'next-question':
      quizIndex = (quizIndex + 1) % questions.length;
      renderPractice();
      break;

    case 'previous-question':
      quizIndex = Math.max(0, quizIndex - 1);
      renderPractice();
      break;

    case 'custom-practice':
      if (API_URL) {
        sendMessage('Ask me one practice question based on this material, without giving away the answer.');
      } else {
        selectLesson(SAMPLE_ID);
      }
      break;
  }
});

// 11. Keyboard navigation and form submissions
$('.tabs').addEventListener('keydown', (event) => {
  const navigationKeys = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
  if (!navigationKeys.includes(event.key)) return;

  event.preventDefault();
  const tabs = ['learn', 'practice', 'notes'];
  let index = tabs.indexOf(currentTab);

  if (event.key === 'Home') {
    index = 0;
  } else if (event.key === 'End') {
    index = 2;
  } else {
    index = (index + (event.key === 'ArrowRight' ? 1 : 2)) % 3;
  }

  setTab(tabs[index]);
  $(`#tab-${tabs[index]}`).focus();
});

document.addEventListener('submit', (event) => {
  if (event.target.id !== 'answer-form') return;
  event.preventDefault();

  const selected = Number(new FormData(event.target).get('answer'));
  const question = questions[quizIndex];
  const correct = selected === question.answer;
  const feedback = $('#feedback');

  feedback.hidden = false;
  feedback.className = correct ? 'feedback' : 'feedback incorrect';
  feedback.textContent = correct
    ? 'That’s right! ' + question.explanation
    : 'Not quite. ' + question.hint + ' Give it another try.';

  if (correct && !lesson().correct.includes(quizIndex)) {
    lesson().correct.push(quizIndex);
    save();
    renderProgress();
  }
});

$('#chat-form').addEventListener('submit', (event) => {
  event.preventDefault();
  sendMessage($('#chat-input').value);
});

$('#chat-input').addEventListener('keydown', (event) => {
  // Enter sends; Shift+Enter inserts a line break.
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
    event.preventDefault();
    sendMessage(event.target.value);
  }
});

// 12. Notes and new study material
$('#notes').addEventListener('input', (event) => {
  lesson().notes = event.target.value;
  $('#save-status').textContent = save()
    ? 'Saved on this device'
    : 'Not saved to this device';
});

$('#material-file').addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  $('#file-error').textContent = '';

  if (file.size > 200000) {
    $('#file-error').textContent = 'Please use a text file smaller than 200 KB.';
    event.target.value = '';
    return;
  }

  try {
    const text = await file.text();

    if (text.length > 50000) {
      $('#file-error').textContent = 'Please use a file with fewer than 50,000 characters.';
      return;
    }

    $('#material-text').value = text;

    if (!$('#material-title').value) {
      $('#material-title').value = file.name
        .replace(/\.(txt|md)$/i, '')
        .slice(0, 100);
    }
  } catch {
    $('#file-error').textContent = 'This file could not be read. Try pasting the text instead.';
  }
});

$('#material-form').addEventListener('submit', (event) => {
  event.preventDefault();

  if (busy) {
    toast('Wait for the tutor’s response before creating a lesson.');
    return;
  }

  const title = $('#material-title').value.trim();
  const material = $('#material-text').value.trim();

  if (!title || !material) {
    $('#file-error').textContent = 'Add a title and some material first.';
    return;
  }

  const id = globalThis.crypto?.randomUUID?.() || `lesson-${Date.now()}`;

  state.lessons.push({
    id,
    title,
    material,
    notes: '',
    step: 0,
    reviewed: [],
    correct: [],
    messages: []
  });

  $('#material-dialog').close();
  event.target.reset();
  $('#file-error').textContent = '';
  selectLesson(id);
  toast('Your lesson is ready. Let’s explore.');
});

// 13. Initial page setup
// index.html loads this script with defer, so the HTML is available here.
if (API_URL) {
  $('.demo-badge').innerHTML = '<span></span>AI tutor';
  $('#chat-disclaimer').textContent = 'AI can make mistakes. Check important details against your material.';
}

renderLesson();
setTab('learn');
setView('study');
