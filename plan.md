# Plan: CV Coaching Chat + Edit + Download Feature

## Context

After uploading a resume the app only shows extracted text. The user wants a full CV coaching experience on the Resume page:
- AI chat to help build a comprehensive master resume (more content = better future job matching)
- Ability to edit the resume text in-app and save it back
- Download the updated resume as PDF
- Visual aids: section navigator, keyword cloud, conversation starters per section

---

## Architecture Overview

```
Resume Page
├── ResumeUpload (existing)
├── [NEW] Section Navigator    — click section → auto-fills chat
├── [NEW] Keyword Cloud        — detected skills / ATS gaps
└── [NEW] ResumeChatPanel
    ├── Welcome AI message (on mount, includes completeness analysis)
    ├── Starter prompt chips
    ├── Scrollable message history
    ├── "Copy to resume" on each AI message
    └── Input + Send
```

---

## Backend Changes

### 1. `src/server/routes/chat.ts` (new file)

**Endpoint:** `POST /api/chat/resume`
**Body:** `{ messages: [{role: string, content: string}] }`
**Returns:** `{ reply: string }`

Logic:
1. Fetch resume from DB (`resume` table, limit 1) — if none, return 400
2. Fetch AI settings from `settings` table
   - Reuse same pattern as `src/server/lib/aiAnalyzer.ts`
   - API key: `openrouter_api_key` setting → fallback to `OPENROUTER_API_KEY` env
   - Model: `openrouter_model` setting → fallback to `OPENROUTER_MODEL` env
3. Reuse `createClient()` pattern from `src/server/lib/aiAnalyzer.ts:20-29`
4. Build messages: `[systemMessage, ...body.messages]`
5. Call OpenRouter: `temperature: 0.7`, 60s timeout
6. Return `{ reply: content }`

**System prompt:**
```
You are a career coach helping build the most complete, comprehensive master resume.
The user's current resume:
---
{resumeRow.extractedText}
---

Your goals:
1. Encourage adding MORE content — experiences, achievements, projects, skills
2. Ask probing questions to uncover things not yet written
3. Suggest quantified achievements (numbers, %, impact)
4. Identify ATS keywords missing for their tech field
5. Point out skill gaps based on current job market
6. Always end with a question or prompt to keep them writing

The more comprehensive their master resume, the better job matches they'll get later.
```

**Route validation:**
```typescript
body: t.Object({
  messages: t.Array(t.Object({ role: t.String(), content: t.String() }))
})
```
Uses `authPlugin` + `requireAuth: true`.

---

### 2. `src/server/routes/resume.ts` (modify — add PATCH)

**Endpoint:** `PATCH /api/resume`
**Body:** `{ extractedText: string }`
**Returns:** `{ filename, extractedText, uploadedAt }`

Logic:
1. Check resume exists (if none → 404)
2. `UPDATE resume SET extractedText = ? WHERE id = ?`
3. Return updated record

---

### 3. `src/server/app.ts` (modify)

Add import + `.use(chatRoutes)` after existing routes.

---

## Frontend Changes

### 4. `ui/src/api.ts` (modify — add 2 functions)

```typescript
// Send a chat message about the resume
export async function sendResumeChat(
  messages: { role: string; content: string }[]
): Promise<{ reply: string }>

// Update resume extracted text
export async function updateResumeText(
  extractedText: string
): Promise<ResumeData>  // PATCH /api/resume
```

---

### 5. `ui/src/components/ResumeChatPanel.tsx` (new)

**Props:** `{ resumeText: string }`

**State:**
- `messages: Message[]` — initialized with AI welcome message on mount
- `input: string`
- `isLoading: boolean`

**Welcome message (auto on mount):**
> "I've analyzed your resume! My goal is to help you build the most complete version possible — the richer your resume, the better your job matches will be. Let me know what you'd like to expand or improve!"

**Starter chips** (shown until user sends first message):
- "How complete is my resume?"
- "What am I missing?"
- "Expand my work experience"
- "Add more skills & keywords"
- "Find my skill gaps"
- "Make it ATS-friendly"

**Each AI message has:**
- "Copy" button — copies AI message text to clipboard

**Send flow:**
1. Append user message to `messages`
2. Set `isLoading = true`, POST `/api/chat/resume` with full messages array
3. Append AI reply, set `isLoading = false`
4. Auto-scroll to bottom

---

### 6. `ui/src/components/SectionNavigator.tsx` (new)

**Props:** `{ resumeText: string; onSectionClick: (section: string) => void }`

Client-side section detection — scan for:
- ALL CAPS lines (e.g., `EXPERIENCE`, `EDUCATION`, `SKILLS`)
- Known keywords: Experience, Education, Skills, Projects, Summary, Certifications, Awards, Languages, Volunteer

Render detected sections as clickable chips. Clicking sends to chat:
> "Help me improve and expand my [Section Name] section"

---

### 7. `ui/src/components/KeywordCloud.tsx` (new)

**Props:** `{ resumeText: string }`

Client-side extraction:
- Detect PascalCase and known tech terms from resume text (React, AWS, TypeScript, etc.)
- Show found keywords as cyan badges
- Show ~15 "commonly missing ATS keywords" suggestions for tech roles (e.g., CI/CD, Agile, Docker, REST API)

---

### 8. `ui/src/pages/ResumePage.tsx` (modify)

New state:
- `editedText: string` — in-memory copy of resume text (editable)
- `isEditing: boolean` — toggles textarea edit mode
- `isSaving: boolean`

**New buttons in header:**
- "Edit Resume" → `isEditing = true` (shows textarea)
- "Save Changes" → calls `updateResumeText(editedText)` → `isEditing = false`
- "Download PDF" → `window.print()`

**Full layout:**
```
Header: [Edit/Save button]  [Download PDF]
ResumeUpload (existing)

{resume && (
  <SectionNavigator resumeText={editedText} onSectionClick={fillChat} />
  <KeywordCloud resumeText={editedText} />
  {isEditing && <textarea value={editedText} onChange={...} />}
  <ResumeChatPanel resumeText={editedText} />
)}
```

Initialize `editedText` from `resume.extractedText` when resume loads.

---

## PDF Download

No new npm dependency. Uses browser print-to-PDF:

1. Inject print CSS (once, in component):
```css
@media print {
  body > * { display: none !important; }
  #resume-print { display: block !important; white-space: pre-wrap; font-family: monospace; font-size: 12px; }
}
```
2. Hidden div always in DOM:
```tsx
<div id="resume-print" style={{ display: 'none' }}>{editedText}</div>
```
3. Download button: `window.print()` → browser opens print dialog → user saves as PDF.

---

## CV Completeness Score

Integrated into the chat (no extra API call). System prompt instructs the AI to open with a quick assessment of completeness when it sends the welcome message. User can ask "Rate my resume out of 100" anytime.

---

## Files Summary

| File | Action |
|---|---|
| `src/server/routes/chat.ts` | **Create** |
| `src/server/routes/resume.ts` | **Modify** — add PATCH endpoint |
| `src/server/app.ts` | **Modify** — register chat routes |
| `ui/src/api.ts` | **Modify** — add `sendResumeChat`, `updateResumeText` |
| `ui/src/components/ResumeChatPanel.tsx` | **Create** |
| `ui/src/components/SectionNavigator.tsx` | **Create** |
| `ui/src/components/KeywordCloud.tsx` | **Create** |
| `ui/src/pages/ResumePage.tsx` | **Modify** — integrate all new components |

**No DB migrations needed** — `extractedText` column already exists on `resume` table.

---

## Reused Patterns

| Pattern | Source |
|---|---|
| `createClient()` OpenAI setup | `src/server/lib/aiAnalyzer.ts:20-29` |
| Settings fetch (API key/model) | `src/server/lib/aiAnalyzer.ts` — `analyzeJob()` |
| Elysia route + authPlugin | `src/server/routes/resume.ts` |
| `request<T>()` helper | `ui/src/api.ts:4-24` |
| CSS theme vars | All existing components |

---

## Verification Checklist

- [ ] Upload PDF → chat panel appears with welcome AI message
- [ ] Starter chips visible; clicking one sends that message
- [ ] Multi-turn conversation works (AI references resume content)
- [ ] Section navigator shows detected sections; clicking one pre-fills chat
- [ ] Keyword cloud shows detected tech skills + ATS suggestions
- [ ] "Edit Resume" → textarea appears with current text; edit it
- [ ] "Save Changes" → text saved to server; reload confirms persistence
- [ ] "Download PDF" → browser print dialog opens; saves formatted resume
- [ ] "Copy" button on AI messages copies text to clipboard
- [ ] All UI consistent with dark/light theme
- [ ] No resume uploaded → chat panel hidden, shows prompt to upload first
