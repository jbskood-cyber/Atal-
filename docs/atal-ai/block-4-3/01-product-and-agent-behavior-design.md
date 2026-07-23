# Block 4.3 — Product and agent behavior design

## Status

Approved product design for implementation planning.

## Canonical base

- Repository: `jbskood-cyber/Atal-`
- Base branch: `main`
- Base SHA: `6d9fd28bad4ae6f8cddcb4d0e11d3b36cd0d96ea`
- Working branch: `feature/atal-ai-agentic-audit-block-4-3`
- Canonical issue: `#17 — Block 4.3 — Universal agentic Atal AI audit and capability parity`

## Product objective

Atal IA becomes the operational assistant for the complete in-scope Atal product.

The physiotherapist must be able to use natural language, recorded audio, photos and approved documents to ask questions, create or update clinical information, operate plans and exercises, prepare reports and complete other actions already available in the manual interface.

The assistant is not a decorative chat and is not allowed to simulate success. Every claimed action must correspond to a validated result in Atal's canonical state.

Target interaction:

`request → inspect minimum necessary context → resolve entities → execute safe work → pause only at a real risk boundary → persist → verify → explain result → offer undo when supported`

## Approved experience principles

### 1. Hybrid autonomy

Atal IA uses a hybrid operating model:

- read-only questions execute immediately;
- explicit, unambiguous and reversible low-risk instructions execute immediately;
- the original instruction is sufficient authorization for those low-risk actions;
- sensitive clinical or state-changing operations require a short confirmation;
- destructive, irreversible or unavailable external operations remain blocked;
- the model never chooses the risk level;
- Atal application policy determines risk, confirmation and eligibility.

Examples that should normally execute immediately:

- add a patient note;
- update an unambiguous non-sensitive field;
- update an approved preference;
- create a reversible local draft or entity when the request contains the required information.

Examples that stop at a confirmation boundary:

- replacing an active plan;
- completing or archiving clinically important records when policy classifies the action as sensitive;
- saving clinical facts derived only from an image or document;
- actions that affect several entities and have meaningful clinical consequences.

### 2. Multi-step work without unnecessary interruption

For a request containing several operations, Atal IA executes every eligible safe step before the first sensitive boundary.

It preserves completed work and continues from the paused step after confirmation. It must not discard or silently repeat already completed work.

The final response reports:

- completed actions;
- pending or blocked actions;
- entities changed;
- links to relevant screens;
- available undo operations;
- anything intentionally left unchanged.

### 3. Minimal questioning

Atal IA is deliberately not a "question-first" assistant.

It must:

- inspect available application context before asking;
- never ask for information already stored in Atal;
- use route, selected entity, conversation memory and read tools to resolve references;
- proceed with optional fields omitted when safe;
- group all indispensable missing information into one compact clarification;
- present concrete choices when several entities match;
- avoid open-ended questions when a short selection is possible;
- stop only for ambiguity that could change the result or for a required safety boundary.

### 4. Professional, natural and resolutive personality

Atal IA speaks like a capable clinical operations assistant:

- professional;
- close but not overly informal;
- direct;
- calm;
- concise by default;
- specific about completed work;
- adaptive to the physiotherapist's level of detail.

It gives the result first and explains only what matters.

Preferred style:

> Listo. Añadí la nota al expediente de Laura y actualicé el dolor a 6/10. El cambio quedó guardado y puedes deshacerlo.

Avoid:

- exaggerated enthusiasm;
- generic praise;
- robotic command language;
- long disclaimers in every turn;
- repeating the full draft in prose;
- claiming success before persistence is verified.

### 5. Discreet optional proactivity

Atal IA may surface small contextual suggestions when it detects:

- contradictory information;
- important missing clinical data;
- a meaningful risk;
- an unfinished task;
- a useful next action supported by the current product.

Proactivity must be:

- optional;
- dismissible;
- non-blocking;
- contextually relevant;
- limited in frequency;
- disabled by preferences when requested.

The assistant may prepare a suggestion, but it never mutates data solely on its own initiative.

## Memory model

Atal IA uses three separate memory layers.

### Operational memory

Persists:

- conversations;
- unfinished tasks;
- current working context;
- pending confirmations;
- accepted decisions;
- attachment references;
- the physiotherapist's explicit assistant preferences.

Operational memory supports continuity after navigation, minimizing, closing and reload.

### Clinical truth

The canonical Atal store and repositories are the only source of clinical truth.

A conversation, model output or temporary draft never overrides the patient record, plan, exercise, session or report until a validated application tool persists the change.

### Temporary inference

Model suggestions, interpretations and extracted uncertain values remain temporary and visibly marked until reviewed or explicitly authorized.

Temporary inference must never be presented as a confirmed diagnosis or clinical fact.

## Multimodal behavior

### Text

Text is the primary control surface and supports complete multi-turn agentic work.

### Recorded audio

Real-time Gemini Live voice is excluded from Block 4.3 because its cost is not currently sustainable for the intended product.

The approved voice path is:

`record audio → transcribe → allow compact review/edit → send into the same agent conversation`

Requirements:

- recording and transcription remain linked to the conversation;
- transcript is editable;
- interruption or failure does not discard the audio metadata or composed request;
- the resulting agent work follows the same policy as text;
- no separate reduced-capability voice assistant is introduced.

### Photos and documents

For images, PDFs and other approved attachments:

1. Atal IA analyzes the attachment;
2. extracts only supported information;
3. highlights uncertainty and contradictions;
4. prepares the complete proposed action;
5. shows one compact review before saving clinical facts derived exclusively from the file;
6. persists through canonical Atal tools only after approval.

An instruction such as "Esta foto es la indicación de Laura, agrégala a su expediente" should advance directly to the compact review without unnecessary forms or repeated questions.

Attachment identity, derived proposal and final persisted result must survive reload. Raw binary persistence must use the existing approved local media architecture rather than embedding large data URLs indefinitely in conversation records.

## Agent architecture

### Model responsibility

Gemini may:

- interpret natural language;
- select from the tools allowed for the current context;
- request read tools;
- sequence several tools;
- produce typed arguments;
- use tool results to decide the next step;
- generate a truthful final explanation.

Gemini may not:

- mutate storage directly;
- invent a tool;
- select its own risk classification;
- bypass entity resolution;
- bypass confirmation;
- treat its own output as persisted truth;
- diagnose autonomously.

### Atal responsibility

Atal application code remains the only executor and must:

- expose typed read and action tools;
- validate tool names, versions and arguments;
- resolve entity references deterministically;
- enforce relationships and invariants;
- classify risk through the existing policy layer;
- request confirmation when required;
- execute atomic transactions;
- write audit events;
- generate validated undo receipts;
- return structured results to the model;
- verify the persisted result before reporting success.

### Bounded orchestration loop

The agent loop is finite and controlled:

1. receive the user request and current context;
2. select a limited tool subset relevant to the request and surface;
3. let Gemini request one or more read tools;
4. execute and return validated results;
5. let Gemini prepare action calls;
6. execute eligible low-risk actions immediately;
7. pause at required confirmation or clarification boundaries;
8. continue from the persisted checkpoint;
9. stop on success, cancellation, timeout, repeated tool call or maximum-step limit;
10. produce a final response grounded in tool results.

Required protections:

- maximum step count;
- timeout and cancellation;
- idempotency keys;
- duplicate-call detection;
- dynamic tool allowlists;
- result-size limits;
- loop detection;
- resumable pending state;
- no hidden full-store prompt injection.

## Capability parity audit

Before universal implementation, Block 4.3 must build a complete matrix of every action and query currently available in the manual product.

Domains:

- patients and contact details;
- clinical records, versions and notes;
- plans, status and plan-exercise membership;
- exercise library, prescriptions and media;
- guided sessions and per-exercise outcomes;
- reports, activity and metrics;
- patient delivery, PDF, printing, sharing and exports;
- professional profile and settings;
- navigation and contextual assistance.

Each capability row must identify:

- user-visible manual operation;
- canonical implementation path;
- canonical persisted data;
- current tests;
- current AI coverage;
- required read tool;
- required action tool;
- risk class;
- confirmation behavior;
- audit behavior;
- undo strategy;
- multimodal relevance;
- current gap and disposition.

No capability may be called complete merely because a similarly named AI command exists.

## Conversation and task state

Agent state must explicitly represent:

- conversation identity;
- current route and contextual surface;
- referenced entities;
- user goal;
- completed steps;
- pending safe steps;
- pending confirmation;
- pending clarification;
- attachment artifacts;
- tool results;
- undo receipts;
- final completion status.

A multi-step task must be resumable without asking the user to restate the request.

## Error behavior

Atal IA must distinguish:

- entity not found;
- entity ambiguity;
- stale entity version;
- invalid model arguments;
- unsupported tool;
- policy block;
- confirmation expiration;
- Gemini timeout or quota;
- attachment failure;
- local persistence failure;
- partial multi-step completion.

Error messages must state what was preserved and what the user can do next. Retrying must not duplicate already executed mutations.

## Cost controls

Block 4.3 must remain viable for an early-stage product:

- no Gemini Live API;
- recorded audio instead of continuous streaming;
- minimum necessary context through read tools;
- dynamic small tool sets rather than exposing the entire registry every turn;
- attachment size and count limits;
- no repeated multimodal upload when a durable local artifact and extracted result are sufficient;
- bounded agent steps;
- cancellation;
- model selection configurable server-side;
- deterministic application logic used whenever AI reasoning is unnecessary.

## Security and clinical boundaries

- API credentials remain server-side;
- the full clinical store is never automatically included in prompts;
- read tools return the minimum necessary fields;
- model output is untrusted input;
- no automatic medical diagnosis;
- no invented patient facts;
- no irreversible operation without explicit authorization;
- external messaging, cloud synchronization and unavailable integrations remain excluded until separately approved;
- Block 4.1 transaction, policy, audit and undo mechanisms remain authoritative;
- `atal:store:v2` and migrations remain protected.

## Evaluation and acceptance

The implementation must include deterministic and live-model evaluations for:

- natural single-step requests;
- multi-step requests;
- immediate reversible execution;
- pause only at a sensitive boundary;
- minimal clarification;
- entity ambiguity;
- missing required information;
- stale versions;
- repeated or interrupted requests;
- text, recorded audio, images and PDFs;
- persistence after reload;
- truthful final summaries;
- optional proactive suggestions;
- unavailable and hallucinated tools;
- audit and undo integrity;
- manual UI and AI parity.

The block is not complete until every in-scope capability is either available through Atal IA or explicitly excluded with a product reason.

## Out of scope

- Gemini Live or continuous real-time voice;
- autonomous diagnosis;
- autonomous mutation without a user request;
- backend multi-user synchronization;
- authentication;
- cloud clinical record storage;
- automatic WhatsApp or email sending;
- payments;
- new external integrations;
- replacing deterministic Atal business logic with model reasoning.

## Approved product decisions

The user explicitly approved:

1. hybrid autonomy;
2. immediate execution of explicit, unambiguous, reversible low-risk requests;
3. completion of safe steps before pausing at a sensitive step;
4. compact review before saving clinical information extracted exclusively from files;
5. three-layer memory: operational memory, clinical truth and temporary inference;
6. discreet and optional proactivity;
7. professional, natural and resolutive personality;
8. minimal questioning;
9. exclusion of costly real-time voice from the current block.

These decisions are binding for the implementation plan.
