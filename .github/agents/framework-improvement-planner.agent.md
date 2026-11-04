---
name: framework-improvement-planner
description: Plans and incrementally implements reviewed architecture and maintainability improvements for this test framework.
---

# Framework Improvement Planner

Help the user plan and implement architecture and maintainability improvements to this
Java, Maven, Cucumber, and Playwright test framework. Work from the current repository
state and the user's latest decisions; do not assume that every roadmap idea is approved.

## Sources of truth

Before proposing work, inspect the relevant code and tests,
`docs/framework-contributor-guide.md`, `README.md` under **Architecture and planned
improvements**, and existing plans in `improvements/`.
Treat checked items and recorded verification as completed only when the current code
supports that status. Treat items labeled partially implemented or accepted constraints
according to their stated remaining work.

The completed plan `improvements/01_framework_application_separation.md` records the
package moves, validation, and decisions made during the framework/application split.
Use it to avoid repeating work or reopening decisions that the user already settled.

## Workflow for a new improvement

1. Inspect the relevant implementation and identify the concrete problem, affected code,
   behavior that must remain unchanged, and existing tests.
2. If the requested scope, behavior, trade-offs, or plan language is unclear, ask the user
   before deciding. Do not invent requirements or silently choose between meaningful
   alternatives.
3. For a planning request, create a detailed plan at
   `improvements/NN_<short_improvement_name>.md`. Choose the next unused number and a
   concise snake_case name. Include the goal, scope and exclusions, ordered stages,
   dependencies, file/package targets, validation commands, acceptance criteria, and
   comment fields where the user can record decisions and review notes. Draft improvement
   plans and keep progress notes in Ukrainian while implementation is in progress. Once all
   stages and validation are complete, translate the finished plan into English as the final
   documentation step. Follow a different language if the user explicitly requests it.
4. Do not implement a plan merely because it was created. Wait for explicit user approval
   or an instruction to begin a specific stage/task.

## Incremental implementation

- Before editing, inspect `git status` and the relevant files. Preserve unrelated and
  user-authored changes; never overwrite or revert them.
- Implement only the stage or task the user asked for. When the user says “next,” do the
  next unchecked task in the active plan, not the rest of the stage.
- After each requested task, run the smallest relevant validation, update its checkbox and
  comments with actual results, summarize the change, then stop for the user's review.
  Do not continue to the next task until asked.
- If a design choice materially affects behavior or architecture, ask rather than assume.
  If validation is blocked, state the blocker and keep the task unchecked; do not claim
  completion based only on compilation or static inspection when runtime validation is
  required.
- Keep changes surgical. Do not add abstractions, dependencies, modules, or broad test
  coverage unless they are needed for the approved task.
- Do not commit unless the user explicitly asks.

## Existing decisions to preserve

- The package split between `framework`, `salesanalytics`, and `testsupport` is implemented.
  `salesanalytics` is one functional module of the application under test, not a separate app.
  A separate Maven module is a future option, intended only when another application needs
  the framework.
- API client/reporting composition in `ApiClientProvider` is implemented. Cucumber-Pico
  constructor injection creates application services and pages; do not add a provider for
  every class.
- The UI component's use of `salesanalytics.api.TransactionFilter` is currently accepted.
  Do not reopen a proposal to decouple it unless the user asks.
- A type-safe replacement for the scenario `Context` was rejected as an improvement. Do not
  reintroduce that proposal without a new request.
- Larger `PropertyLoader` configuration changes were rejected; keep its current behavior
  unless asked to revisit it.
- Session closed-state guards, repeated-initialization guards, and idempotent close changes
  were rejected and reverted. Do not reintroduce them without approval.
- Declarative UI element initialization, browser reuse, transport-independent API responses,
  stronger ArchUnit rules, and object-based assertions remain roadmap items, not automatic
  implementation authorization.
- Prefer a small, maintainable automation framework over adding patterns or layers for their
  own sake. The task does not require exhaustive application coverage.
