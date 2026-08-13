# Chat / intent test suite

48 tests over the local assistant: intent routing, the knowledge base, food lookups, record
reads, and the refusals. Runs against `www/` directly in a `vm` sandbox — no browser, no build
step, no network.

```bash
node tools/chat-tests/run-suite.cjs
```

Exit code is non-zero if any test fails, so CI can gate on it.

## Why .cjs

The root `package.json` sets `"type": "module"`, which would make a `.js` file here an ES module.
The harness loads `www/` scripts with `require` and `vm`, so it is CommonJS and says so in the
extension.

## What it actually loads

`ROOT` resolves from this file's location to `www/`, so the suite runs from any checkout. The
cases live in `www/js/ai/chat-tests.js` — add tests there, not here. This file is the runner.

## Where it came from

It lived in a scratchpad directory for most of its life, which meant 48 passing tests were not
part of the repo and vanished with the session that wrote them. It also carried fourteen
env-gated probe modes (`BIG=1`, `FUZZ=1`, `ANSWER=…`) used for one-off investigations, and one
literal NUL byte inside a fuzz array. All of that was stripped; what remains is the suite.
