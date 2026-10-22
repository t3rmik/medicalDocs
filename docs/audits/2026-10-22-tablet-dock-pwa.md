# MedicalDocs Pro — tablet dock and PWA handoff

Date: 2026-10-22

## Changes
- Tablet layout (768–1440 CSS px with a coarse/touch pointer): move editor ribbon sections into a vertical left dock. Selecting a section opens a contextual panel over the workspace instead of consuming a full-width row above the paper. Desktop without a touch pointer retains the horizontal ribbon.
- Move the handwriting toolbar to a compact, scrollable left-side panel on tablet, preserving the pen/finger toggle and existing annotation controls.
- Add a web app manifest with 192px/512px PNG icons, service-worker registration and an install action in the main toolbar.
- Support files shared into the installed app through Web Share Target. Incoming files are stored only in local IndexedDB; they are not uploaded to a server. The app then hands the file to the existing PDF-mode chooser.
- Add Chromium desktop File Handling support where browser-supported.

## Limits to validate on device
- Android PWAs do not currently provide the same general file-handler "Open with" registration as Chromium desktop; the mobile workflow is through the system Share sheet.
- Chrome Android stable 153 has a documented regression where Web Share Target can launch the PWA but omit the shared file payload. MedicalDocs shows a recovery message and retains manual import as a fallback. Re-test after the browser updates.
- The site has not been physically tested on the user's tablet. Verify installation, home icon, PDF sharing from WhatsApp/Files, annotation and text conversion.

## Manual test checklist
- [ ] 768–900 px tablet portrait dock
- [ ] 901–1440 px tablet landscape dock
- [ ] Desktop horizontal ribbon unaffected
- [ ] Pen mode toolbar doesn't overlap dock tools; document scrolling remains usable
- [ ] Install app and launch standalone
- [ ] Share PDF/DOCX from WhatsApp and Files
- [ ] Missing-file fallback and manual import
