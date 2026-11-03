# Theme contrast correction

- Removed the global `--color-white` override from the light theme. This prevents `bg-white` and `border-white` utilities from unexpectedly becoming dark.
- Light theme text utilities now use the theme ink token, including common arbitrary white text classes.
- Preserved white foreground text on primary actions, brand/green status pills, and dark image labels.
- Root body foreground now follows the active theme token instead of a hard-coded light text colour.
- No brand palette colours were added or changed.

Source baseline: 50500-theme-switch-v24.zip.
