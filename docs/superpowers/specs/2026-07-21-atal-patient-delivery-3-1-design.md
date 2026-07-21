# Atal Patient Delivery 3.1 — Universal Premium Design

## Goal

Produce one repeatable patient-delivery system that works for different patients, exercise counts and prescriptions without forcing clinical data into a rigid template.

## Product principle

> The template adapts to the plan; the plan is never distorted to fit the template.

## Primary document

The default mode is **Plan + registro**:

1. one or more premium monochrome plan pages;
2. numbered rehabilitation-session records selected by the physiotherapist.

Alternative modes are **Solo plan**, **Solo registro**, and the preserved **Plan detallado** under advanced options.

## Universal plan pages

Every exercise uses the saved clinical snapshot and shows:

- order and name;
- real prescription (`doseLabel`), regardless of whether it uses repetitions, seconds, minutes, distance, laterality, load or tolerance;
- rest;
- one key instruction, preferring the therapist note and falling back to the exercise objective.

The composer measures the visible wrapped lines for the exercise name, prescription and key instruction. Row height and page breaks are calculated from those measurements. Typical short exercises remain compact; longer exercises receive more vertical space and may move to a continuation page.

No row is split. The final plan page reserves room for safety and professional information. Font size is never reduced to force content into a page.

## Universal session record

Each session uses the same four-column table:

| Exercise | Prescribed | Actual result | Discomfort |
|---|---|---|---|

`Actual result` accepts human-readable entries such as:

- `10 / 10 / 8`;
- `30 s / 25 s / 20 s`;
- `12 min`;
- `D: 10 / I: 8`;
- `8 rep with 6 kg`;
- `not performed`.

The PDF does not create fixed columns for series. That keeps the template universal and implementation reliable.

Session rows are also measured from their wrapped exercise name and prescription. A session continues on another clearly labelled page only when its measured rows do not fit. Exercise rows are never split. The final part contains:

- date;
- pain before and after;
- complete, partial or stopped result;
- light, adequate or intense perceived effort;
- observations.

## Delivery screen

The screen follows the existing Atal metrics and removes the previous four-step wall of controls. It exposes only:

- document mode;
- session count when a log is included;
- large or extra-large type;
- compact advanced detailed-plan option;
- recipient and document estimate;
- download, WhatsApp, native share and print actions.

The screen is designed for future Atal AI orchestration: all user choices map to the small `PatientPlanDeliveryOptions` object instead of a large collection of independent switches.

## WhatsApp behavior

Atal resolves the patient phone first and the responsible-contact phone as fallback.

The WhatsApp action:

- accepts common punctuation and an optional `00` international prefix;
- opens `wa.me` with the resolved recipient and a prepared message;
- does not upload, attach or send the PDF;
- leaves the final attachment and send decision to the physiotherapist.

Native Share remains the action that can hand the generated PDF file to installed apps.

## Privacy and safety

- PDF generation stays local and dependency-free.
- No clinical data or media is uploaded.
- No public link is created.
- Non-active plans require confirmation and keep their real status.
- Archived patients, archived plans, empty plans and missing exercises remain blocked.
- Detailed multimedia remains opt-in and local.
- The generated document is an immutable snapshot of the saved plan.

## Visual language

The PDF is premium and monochrome:

- white paper;
- black and neutral gray text;
- fine rules;
- readable large typography;
- professional and next-review information on the final plan page;
- no gradients, shadows, rounded app cards or large color bars.

The application screen preserves the approved Atal UI, green `#7EB695`, themes and dock.