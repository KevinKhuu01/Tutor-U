| Task | What it does | Status |
| **Python backend** | Receives requests from the frontend and calls the LLM | Not built |
| **LLM integration** | Uses your API key to generate explanations and questions | Not connected |
| **Teaching instructions** | Tells the LLM how to teach, give hints, and adapt to the student | Needs writing |
| **Live tutor chat** | Sends conversation history and material to Python, then displays the reply | Frontend connection code ready |
| **Generated lessons** | Replaces the fixed lesson on the left with structured LLM output | Needs backend generation and frontend changes |
| **Generated practice** | Creates questions from the material and evaluates answers | Currently three fixed questions |
| **Testing** | Checks the full flow, failed requests, and unexpected LLM responses | Still needed |





# TeacherBot frontend
A responsive cream-and-beige study interface built with plain HTML, CSS, and JavaScript. No framework, package installation, or build step is required.

## Files

- `dist/index.html`: semantic page structure, accessible dialogs, and inline SVG icons.
- `dist/styles.css`: palette, layout, responsive styles, and typography.
- `dist/app.js`: lessons, local storage, chat, practice questions, and backend connection.

Google Fonts are optional. The layout falls back to Georgia and Arial without a network connection.

## Run locally

From this project directory:

```sh
python3 -m http.server 8000 --directory dist
```

Open http://localhost:8000. The default is an explicitly labeled demo with scripted merge-sort responses. It does not call an LLM or pretend to grade arbitrary chat responses. The Practice tab checks three fixed questions. Pasted notes and imported TXT/Markdown files create personal lessons; they do not generate AI content until a backend is connected. PDFs are not supported.

## Connect your Python backend

Set `API_URL` at the top of `dist/app.js` to your chat endpoint. Use `/api/chat` if Python serves the frontend and API on the same origin. Use a full HTTPS URL when hosting the API separately, and configure CORS on Python to allow the frontend origin. For local development, a full localhost URL also works when the frontend is served locally.

The frontend sends a POST with `Content-Type: application/json`:

```json
{
  "lesson_id": "merge-sort",
  "title": "Understanding merge sort",
  "material": "The source material being studied...",
  "messages": [
    {"role": "user", "content": "Why is one element already sorted?"}
  ]
}
```

Return HTTP 200 with:

```json
{"reply": "A single element has no other elements to be out of order with..."}
```

The app renders reply text safely as plain text, preserving line breaks. It handles failed responses, malformed results, and a 60-second timeout. There is no streaming in this first version. The server should validate the payload, impose its own length limits, and add its teaching instructions before forwarding conversation and material to an LLM. Keep your provider API key in a server environment variable. Never put a key in HTML or browser JavaScript.

## State and scope

Lessons, notes, practice results, and chat history persist using browser localStorage under `teacherbot.workspace.v1`. They are specific to the browser/device and are not account-synced. Do not use this prototype for sensitive student information. Clearing browser site data resets the workspace. In API mode, the current lesson material and conversation are transmitted to your configured server.

The four-part merge-sort lesson and three questions are bundled demo content. Custom lessons display source material; the connected tutor can explain it and ask questions in chat. Dynamic structured lesson and quiz generation, authentication, cross-device persistence, and the Python backend remain future work.

## Styling

Edit the CSS variables at the start of `styles.css` to change the cream backgrounds, olive accents, or typefaces. Responsive breakpoints cover desktop, tablet, and mobile. Keyboard navigation works across tabs; dialogs use the native dialog API and close with Escape. Enter sends chat messages; Shift+Enter inserts a newline.
