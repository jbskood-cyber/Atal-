# Atal IA — Linear-style agent experiment

## Canonical isolation

- Base: `feature/atal-ai-agentic-audit-block-4-3`
- Head: `feature/atal-ai-linear-agent`
- Starting SHA: `f12fadede8fe1badd5ae16e64d1fdf2b2cc676d9`
- Current implementation SHA: `9e533d4e87aec477388a359d278f2a47e4ccf0c0`
- Pull request: #19
- `main`, PR #18 and its source branch remain untouched.

## Product contract

Atal IA is a conversational agent embedded in the clinical application. Gemini generates responses from the current conversation and decides whether it needs one of the tools exposed for that turn. Atal remains the authority for entity resolution, context boundaries, validation, risk, confirmation, transactions, persistence, audit and Undo.

The assistant must not use a catalogue of canned answers. Normal questions are answered directly. Workspace-dependent questions may use typed read tools. Mutation tools are exposed only for explicit actions. Global and contextual conversations remain isolated.

## Reviewable drafts

The structured draft is conditional. It appears between the conversation and composer only when reviewable work exists, remains available while the user asks unrelated questions, and is removed from persistent storage after a successful application.

## Resilient Gemini model cascade

Atal uses the following default order:

1. `gemini-3.6-flash` — primary agent model.
2. `gemini-3.5-flash-lite` — fast agentic fallback.
3. `gemini-3.1-flash-lite` — stable lower-cost fallback.
4. `gemini-2.5-flash-lite` — final economical fallback.

`GEMINI_MODEL` may override the preferred first model. `GEMINI_MODEL_CASCADE` may define a complete comma-separated order. Values are trimmed and deduplicated.

Atal advances to another model only after transient provider failures such as quota exhaustion, rate limiting, temporary unavailability, timeout or network interruption. Authentication, authorization, schema, invalid-argument and safety errors stop immediately and are never hidden by a fallback.

Fallback waits use short exponential delays: 250 ms, 500 ms and 1,000 ms. Streaming may switch models only before visible text has been emitted. If a stream is interrupted after text begins, Atal stops rather than duplicating or mixing responses.

The same cascade covers:

- general and contextual agent turns;
- structured draft generation;
- image and PDF draft extraction;
- audio transcription.

If every model is temporarily unavailable, the user message remains stored and the interface displays one recoverable error card. Provider failures are never persisted as assistant answers and are not duplicated in the conversation.

## Visual behavior

- User messages use the Atal green surface with white text.
- Assistant output streams progressively.
- Assistant Markdown is rendered as safe headings, paragraphs and lists.
- Internal `CORE_*` codes are not product copy.
- No empty draft card is shown.

## Verification on the implementation SHA

- dependency installation: PASS
- TypeScript and Node quality suite: PASS
- production build: PASS
- AI capability matrix: PASS
- live Gemini function-calling smoke: PASS
- fallback policy unit tests: PASS
- Playwright: 43 passed, 0 failed, 0 skipped
- mobile provider-limit regression: PASS

The remaining gate is product-owner visual and conversational validation in Google AI Studio. PR #19 must remain draft and unmerged until explicit authorization.
