# 50500 Vehicle Catalog — V22

The vehicle directory is a fitment taxonomy, not an inventory feed.

- Existing catalog: 46 makes / 156 model rows in the bundled seed data.
- Supplemental directory: 27 new makes / 229 new model rows after slug de-duplication.
- Combined bundled catalogue: 73 makes / 385 model rows.
- The migration runs once using `app_meta.vehicle_directory_extensions_v1`.
- It inserts missing rows only; it never overwrites existing make/model edits or creates placeholder products, prices, stock, or orders.
- Models such as UAZ Patriot and Zamyad Padra are nested under their manufacturer rather than represented as manufacturers.

## Admin

Open **Admin → دسته‌بندی خودروها** (`/admin/vehicle-catalog`).

Supported operations:
- Add, rename, reorder, change slug, move model to another make, and remove individual makes/models.
- Search by make or model; matching models automatically expand their parent make.
- Bulk import, one line per make: `Brand | Model 1، Model 2، Model 3`.
- Export the full make/model directory as UTF-8 CSV for Excel. CSV cells are escaped and formula-like values are neutralized.

## Important product-linking behavior

A make/model entry is only a customer-facing selector. It does not promise that a matching mat is currently sold. To show a product for a model, create/edit the actual product under **Products** and assign its make and model. Models without linked active products may lead to an empty product result until a real product is linked.

## Source and data quality

The original user's screenshot is the source of the requested make list. For model names that were ambiguous or newly imported, the initial list was cross-checked against the Iranian-market make/model index at car.ir/compare. This is a starter list of common names, not a complete global year/trim database; admins can add the exact generation, body, year range, or trim supported by 50500.
