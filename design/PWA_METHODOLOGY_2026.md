# Delmaine PWA design methodology

Research checked 7 October 2026. This is a project-specific synthesis, not a universal 2026 style or a usability certification.

## Evidence and decisions

| Source | What informs the implementation |
| --- | --- |
| [Apple WWDC26 design guide](https://developer.apple.com/wwdc26/guides/design/) | Make content and readable controls the priority; adapt to available space. Reading surfaces remain opaque. |
| [Google Material expressive research](https://design.google/library/expressive-material-design-google-research) | Use emphasis selectively. Retain familiar lists and visible labels; some participants preferred calmer designs. Vendor study outcomes are not performance claims for these apps. |
| [Microsoft Fluent tokens](https://fluent2.microsoft.design/design-tokens) | Separate raw palette values from semantic roles; use matching roles across appearance variants. |
| [IBM Carbon spacing](https://www.carbondesignsystem.com/building-blocks/foundations/spacing/overview) | Use one spacing scale and vary density according to the task. |
| [Instrument: Now in Android](https://www.instrument.com/work/now-in-android/) | Theme testing and flexible layouts support a coherent component family. This is a studio case study, not independent validation. |
| [Work & Co: PGA TOUR](https://www.work.co/clients/pga-tour/) | Share components across products while distinguishing utility from editorial typography. |
| [NN/G progressive disclosure](https://www.nngroup.com/articles/progressive-disclosure/) | Reveal solutions and secondary course links on request while keeping essential navigation visible. Foundational guidance predates 2026. |
| [Tailwind theme variables](https://tailwindcss.com/docs/theme) | Existing Tailwind 4 uses CSS-first semantic aliases. Buildless apps use the same ordinary custom properties; a framework migration adds no value to these changes. |
| [shadcn theming](https://ui.shadcn.com/docs/theming) | Pair surface and foreground roles. Retain the existing components and override semantic tokens. |
| [Radix accessibility](https://www.radix-ui.com/primitives/docs/overview/accessibility) | Existing primitives support keyboard and focus behaviors; authors still supply meaningful labels and validate the resulting application. |
| [WCAG 2.2](https://www.w3.org/TR/WCAG22/) | Check text and control contrast, focus visibility, reflow, status labels, and unobscured focus. The project's 44px primary controls exceed the AA target-size minimum of 24px with exceptions. |
| [MDN installability](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable) | Installation and offline support are separate. Instructions depend on browser/device; never infer a successful installation from a manifest alone. |
| [Google offline data](https://web.dev/learn/pwa/offline-data) | Preserve structured notebook storage and cache identities. Downloaded URL resources and notebook records serve different purposes. |
| [Google PWA updates](https://web.dev/learn/pwa/update) | Offer updates at a stopping point and save work before activating them. |
| [Google offline UX](https://web.dev/articles/offline-ux-design-guidelines) | Explain availability honestly and make large downloads explicit. Its enduring UX principles are useful; its older platform tables are not current installation evidence. |
| [Core Web Vitals](https://web.dev/articles/vitals) | Measurement targets: LCP ≤2.5s, INP ≤200ms, CLS ≤0.1 at the 75th percentile. No field performance results are claimed without measurements. |

## Shared language

The foundations file defines canvas, surface, text, muted text, border, action, action foreground, focus and danger roles. Light and dark share the same semantic relationships. Course accents distinguish machine learning, calculus and robotics. The same foundations file is checked for byte equality across the three companion sources.

Spacing follows 4, 8, 12, 16, 24, 32, 48 and 64px. Primary controls are at least 44px high; control and card radii are 12 and 18px. Controls use system sans; textbook reading uses an editorial serif, 18px equivalent default size, approximately 70ch measure and 1.75 line height. Values are project choices, not copied vendor mandates.

Navigation uses Home, Chapters, Experiments, Notebook and Offline. Mobile destinations have visible labels and a semantic selected state. Space is reserved below content for the navigation and device safe area. Wide equations, code and tables scroll inside their own content areas. Motion respects reduced-motion preferences and keyboard focus remains visible in forced-color mode.

One prominent continuation action anchors the learning home. Chapter navigation explicitly names previous/next. Experiment indexes expose all models. Course switching opens another tab so the current notebook remains available. No streak penalties, decoration over equations, mandatory session targets, or forced library upgrades are introduced.

## PWA and validation methodology

Keep app IDs, database names, state schemas, chapter IDs, existing preference keys, authentication, audiences and backup compatibility. Display-name corrections do not rename stored data. Treat online/offline connection state, saved-on-device state, and verified offline availability as distinct facts. Existing save-before-update behavior stays intact. Regenerate offline hashes after shipped code/style changes.

Run the application's existing math, learning, storage, merge and worker tests; typecheck and production-build the framework app. Validate new navigation destinations, complete experiment discovery, chapter boundaries, CSS syntax and actual light/dark semantic contrast pairs. Re-audit observed issues after fixing them. Avoid claiming a visual or screen-reader audit from source checks.

Browser/device checks remain a separate stage: 320px reflow, 200% zoom and text-spacing overrides, keyboard traversal and overlays, screen-reader announcements, installation, disconnected reload, upgrade with an unfinished draft, and field performance. If the supported browser QA capability is unavailable, document that limit and report the automated evidence precisely.

Older products keep their existing brand and supported appearance modes. A shared methodology does not justify replacing their established palette, identity, authentication flows or offline policy without app-specific verification.
