# MedicalDocs Pro — Premium Design System

## Product direction
A calm, polished study workspace for long study sessions: a dark teal command header, paper-like editor canvas, clear study tools, low-noise controls, and PDF workbench surfaces designed around reading and writing rather than a generic admin dashboard.

## Visual tokens
- Brand: deep teal/navy (#062a35, #073642, #0b4b58).
- Accent: mint teal (#0f9488, #5eead4); amber is reserved for caution and attention.
- Paper: white with a soft blue-grey canvas (#edf3f6).
- Text: ink blue (#132f3e), muted slate (#5a7180).
- Surfaces use restrained borders, medium radii and soft shadows. Keep document paper neutral white.

## Component rules
- Prefer the custom SVG components in src/components/icons/MedicalDocsIcons.tsx for navigation, document, PDF, pen, OCR, AI and export affordances.
- Buttons need clear hierarchy and explicit disabled, focus, pressed, selected and loading states.
- Forms retain visible labels; text fields use comfortable touch heights, and long text uses readable 16 px input text on mobile.
- Tables need readable header contrast, subtle row separation and comfortable cell padding; preserve horizontal scrolling for wide tables.
- Modals need a clear heading/close action, bounded viewport height, scrollable content and safe-area padding.
- Keep document pages white against a calm canvas; no decorative backgrounds inside document content.
- PDF needs strong page contrast, finger scrolling, pen drawing only in an explicit pen mode, readable selection panels and visible redaction limitations.
- Motion is subtle and respects reduced-motion settings.

## Device contract
- Phone: bottom navigation, compact horizontal toolbar, safe-area padding, scrollable panels and dialogs.
- Tablet portrait/landscape: touch-sized controls, responsive page width, usable ribbon, stable page navigation, and pen drawing separated from ordinary panning.
- Desktop: compact header, vertical library rail, generous editor canvas and keyboard shortcuts.

## Acceptance checks
1. No unexpected horizontal overflow on phone, tablet, and desktop.
2. Navigation and important controls remain reachable with one touch/pen action.
3. Icon-only buttons have accessible names; decorative SVGs use aria-hidden.
4. Document writing remains responsive; avoid unnecessary large rerenders.
5. PDF selection supports a whole row/phrase, explicit multi-row selection, and a legible multiline editor; AI output remains readable.
6. PDF overlay/redaction limitations remain visible and accurate.
7. Build/typecheck succeeds on the exact PR commit before any promotion.
