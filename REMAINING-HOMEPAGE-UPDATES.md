# Homepage updates in this package

This package is based on the user's V24 archive and keeps the existing orange / charcoal / white palette.

Implemented in this pass:
- Removed the forced line break from the hero headline so the title wraps naturally while preserving the existing hero image.
- Added a continuously moving, clickable vehicle-brand ticker under the vehicle finder. It is generated from the current database brand list, so new brands appear automatically; labels use English slugs.
- Replaced the FAQ-side promotional/contact card with a workshop editorial card using the repository's existing industrial sewing-machine and workshop assets.
- Expanded the homepage campaign banner settings: enable/disable, label, title, highlight, description, coupon, CTA text/link, image URL/path, start/end schedule, and campaign type. The banner respects visibility and schedule values.
- Preserved the existing theme palette and existing homepage structure.

Not yet implemented in this pass:
- A complete multi-banner CRUD manager with arbitrary banner count and independent scheduling.
- URL + local upload + replace + delete workflow across every image field in every admin module.
- Full admin editing/reordering/visibility controls for every homepage section and all five exploded-layer source assets/specifications.
- The exact supplied reference composition for the featured product section and the final Iranian/Japanese/Korean/Chinese/European vehicle-category photography. The archive does not contain the referenced vehicle photo assets, so no unrelated replacement images were fabricated.

Build verification was not possible in this environment because dependencies (Next.js, React, Lucide, Drizzle, etc.) are not installed in the extracted archive. Run `npm install` and `npm run build` before deployment.
