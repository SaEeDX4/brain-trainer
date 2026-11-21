# Architecture and QA guide

## Structure

The application runs fully in the browser. Keep `index.html` in the repository root for static hosting. CSS is under `assets/css/` and JavaScript under `assets/js/`. No bundler or external runtime packages are needed. The only third-party resource used by the page is the Google Fonts stylesheet.

Regular mode and Time Attack share screen-switching, sound and local statistics helpers. The normal game counts down from a selected difficulty time limit, awards points for correct answers, and awards more time when leveling up. Time Attack counts upward across 20 questions and updates the best-time record only after a perfect run.

Records and sound preferences use `localStorage`; these are per browser/profile and are not synced.

## Safety improvements

- All screens are deactivated on navigation, including the challenge guide.
- Each generated question can be submitted at most once.
- Session IDs protect against delayed callbacks from previous games.
- Intervals and pause controls are reset when rounds restart or the game ends.
- Web Audio is initialized only after interaction; games remain functional without audio.
- Inputs have accessible names, feedback uses a polite live region and narrow screens stack input/buttons.

## Manual QA checklist

1. Play Easy, Medium and Hard through countdown, scoring and game-over.
2. Check incorrect and correct answers, decimal rounding, and repeated rapid submissions.
3. Pause/resume using buttons and Escape; Space is available outside focused inputs/buttons.
4. Start, pause, resume and finish a 20-question Time Attack.
5. Try Challenge → Back → Start → Home. Confirm only the selected screen is visible.
6. Retry a challenge and verify its clock resets and records persist after refresh.
7. Test on narrow mobile screens, with keyboard-only focus and with sound disabled.
8. Check browser console; run tests and verify CI.

## Limits and future changes

- Precision Challenge and Endurance Test are deliberately disabled placeholders.
- JavaScript is still a single controller file; separate modules later if features grow.
- The included Node tests catch structural regressions and JavaScript syntax, **not** visual issues or complete gameplay correctness. Add browser automation for future releases.
