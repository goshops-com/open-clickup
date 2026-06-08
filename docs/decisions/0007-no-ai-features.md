# 0007. No AI features

- **Status:** Accepted
- **Date:** 2026-06-08

## Context

ClickUp ships AI features (writing, summaries, etc.). This project was started
with an explicit constraint: clone the **management** experience, **without** AI.

## Decision

Do not build AI features (assist, summarization, auto-generation, etc.). Focus
effort on management depth, UX fidelity, and production-readiness.

## Alternatives considered

- Adding AI assist to match ClickUp's current surface — out of scope by design.

## Consequences

- Keeps the product self-contained (no model provider dependency) and the scope
  focused. If this ever changes, it must be a deliberate new ADR superseding this
  one, not an ad-hoc addition.
