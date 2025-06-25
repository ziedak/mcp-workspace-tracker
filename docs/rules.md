remember and memorize this

if \*.ts is complex refactor it to make your tests easier
start by creating easiest teste senarios first
Always follow solid principles
very Important :
never ever take shortcuts instead of addressing the real issue
always double check
you can't start next step or next phase if the coverage threshold or branch coverage <70% or there is failing tests
your role is to assist me and help me implement and optimize a production ready app
Most Important :always start by creating a plan of action strict and you nust flow it if i approve it

## ✅ Strict Development Rules (Updated)

### 🧠 Planning & Strategy

1. Always begin with a strict, structured plan of action before any task or feature.
2. No implementation begins until the plan is explicitly approved.
3. Features must be broken into small, testable, logically isolated units.
4. Every step must be estimated for time and complexity.
5. Prioritize meaningful value over premature optimization or feature creep.

### 💪 Testing & Quality Assurance

6. Testing always starts with the easiest, most deterministic scenarios first.
7. Complex TypeScript files must be refactored to improve testability before tests are written.
8. All logic must be covered by unit, integration, or scenario tests — no business logic should go untested.
9. No shortcuts allowed — tests must validate real outcomes, not mocked assumptions.
10. All tests must be reviewed for accuracy, completeness, and real-world relevance.
11. The following conditions must be met before moving to the next step or phase:

    - Total test coverage ≥ 70%
    - Branch/conditional path coverage ≥ 70%
    - No failing tests

12. Edge cases and regressions must be explicitly tested.
13. No commented-out code is allowed in any commit or merge.
14. No TODO or FIXME comments allowed in production unless tied to a valid task or ticket ID.
15. All files modified in a PR must have corresponding test coverage.

### 🛡️ Architecture & Design

16. All code must strictly follow SOLID principles and modern architectural best practices.
17. Code must be modular, composable, and built for dependency injection.
18. Business logic must be abstracted from framework or platform specifics.
19. Avoid shared mutable state or side effects unless explicitly controlled.
20. No unused exports, unreachable code, or dead functions allowed.
21. Components, plugins, and services must be independently testable and replaceable.

### 🛠️ Coding Practices

22. Strict TypeScript settings must always be enabled (strict, noImplicitAny, etc.).
23. Code must be intentionally readable and clearly document why something is done, not just what.
24. All error handling must be explicit, purposeful, and auditable.
25. Feature flags or toggles must be stable, reversible, and fully isolated.
26. No commented-out code, debug prints, or console logs in production commits.
27. Code must follow consistent naming, commit message conventions, and linters.

### 🤔 Mindset & Culture

29. The goal is not just functional code, but production-grade, maintainable, observable systems.
30. You are expected to double-check everything before moving on.
31. You are responsible for both correctness and clarity — your code must make the intent obvious.
32. Tech debt must be acknowledged, tracked, and addressed — not postponed.
33. Think like a systems owner, not just a developer. Optimize for long-term resilience, not short-term velocity.
