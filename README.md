# MATHLVL

Canonical browser source lives in index.html and assets/app/. Server routes live in api/ and shared server helpers in lib/.

Run `python scripts/build_all.py` to validate JavaScript, required reader helpers, local asset references and regression tests. The build is read-only and repeatable. Do not run historical migration scripts against canonical source; they are retained only as history.

DOMPurify 3.4.16 is vendored in assets/vendor/purify.min.js with its upstream license header. All chat Markdown must pass through safeMarkdown. If sanitization is unavailable, show escaped plain text.

Book tutor history is bounded and in-memory per book, and is cleared on page reload. Persistent cross-device AI memory is a separate future database integration.

Teacher memory is now persisted in Supabase project nbpqyodesukgbznzgfek. The teacher-memory Edge Function validates the existing MATHLVL session against the fixed production auth endpoint before deriving the owner hash. Only the service backend can access teacher_memory; public database roles have no grants. No database keys ship to the browser or repository. Only the last 20 text messages (2500 characters each) are stored; image bytes are excluded. The UI provides a clear-history action. Book-specific drawer history remains session-local.
