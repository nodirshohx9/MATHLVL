# MATHLVL

Canonical browser source lives in index.html and assets/app/. Server routes live in api/ and shared server helpers in lib/.

Run `python scripts/build_all.py` to validate JavaScript, required reader helpers, local asset references and regression tests. The build is read-only and repeatable. Do not run historical migration scripts against canonical source; they are retained only as history.

DOMPurify 3.4.16 is vendored in assets/vendor/purify.min.js with its upstream license header. All chat Markdown must pass through safeMarkdown. If sanitization is unavailable, show escaped plain text.

Book tutor history is bounded and in-memory per book, and is cleared on page reload. Persistent cross-device AI memory is a separate future database integration.
