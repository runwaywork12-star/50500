"""Compose the reviewed car cutouts without changing their bodywork or badges.

Requires Pillow, numpy and scipy. Source cutouts and provenance live in
artifacts/car-images; only the four final JPEGs are published.
"""

from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter
from scipy import ndimage


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public/images/cars"
OUT.mkdir(parents=True, exist_ok=True)
WIDTH, HEIGHT = 1280, 800

PHOTOS = [
    ("domestic", "dena", "IKCO Dena Plus", "Jeeputer", "CC BY-SA 4.0"),
    ("chinese", "tiggo", "Chery Tiggo 8 Pro PHEV", "User3204", "CC BY-SA 4.0"),
    ("asian", "azera", "Hyundai Grandeur (Azera)", "Hyundai Motor Group", "Pexels License"),
    ("european", "challenger", "Dodge Challenger SRT", "MOHAMAD ALOUL", "Pexels License"),
]

y_grid, x_grid = np.mgrid[0:HEIGHT, 0:WIDTH]
light = np.exp(-2 * (((x_grid - WIDTH * 0.5) / (WIDTH * 0.65)) ** 2 + ((y_grid - HEIGHT * 0.2) / (HEIGHT * 0.75)) ** 2))
pixels = np.array([25, 30, 37]) + light[..., None] * np.array([51, 53, 57])
pixels += np.exp(-((y_grid - HEIGHT * 0.74) / (HEIGHT * 0.21)) ** 2)[..., None] * np.array([7, 7, 7])
background = Image.fromarray(np.uint8(np.clip(pixels, 0, 255))).convert("RGBA")
contact_sheet = Image.new("RGB", (1280, 800), "#171c23")

for index, (key, source, model, author, license_name) in enumerate(PHOTOS):
    car = Image.open(ROOT / f"artifacts/car-images/{source}-isolated.png").convert("RGBA")
    alpha = np.array(car.getchannel("A"))

    # Discard detached background objects, retaining antialiased vehicle edges.
    labels, _ = ndimage.label(alpha > 95)
    sizes = np.bincount(labels.ravel())
    sizes[0] = 0
    main_object = labels == sizes.argmax()
    keep = ndimage.binary_dilation(ndimage.binary_fill_holes(main_object), iterations=3)
    alpha = np.where(keep, alpha, 0)
    alpha = np.uint8(np.clip((alpha.astype(float) - 14) * 255 / 225, 0, 255))
    car.putalpha(Image.fromarray(alpha))
    car = car.crop(Image.fromarray(alpha).getbbox())

    scale = min(1110 / car.width, 550 / car.height)
    car = car.resize((round(car.width * scale), round(car.height * scale)), Image.Resampling.LANCZOS)
    if source == "azera":
        adjusted = ImageEnhance.Brightness(car.convert("RGB")).enhance(1.13).convert("RGBA")
        adjusted.putalpha(car.getchannel("A"))
        car = adjusted
    x = (WIDTH - car.width) // 2
    y = 655 - car.height
    frame = background.copy()

    contact = Image.new("RGBA", (WIDTH, HEIGHT))
    tire_contacts = {
        "dena": [(0.12, 0.86), (0.54, 0.99), (0.9, 0.9)],
        "tiggo": [(0.07, 0.71), (0.37, 0.99), (0.91, 0.87)],
        "azera": [(0.34, 0.99), (0.88, 0.91), (0.12, 0.9)],
        "challenger": [(0.05, 0.87), (0.25, 0.99), (0.91, 0.94)],
    }[source]
    points = [(x + round(px * car.width), y + round(py * car.height)) for px, py in tire_contacts]
    ImageDraw.Draw(contact).polygon(points, fill=(0, 0, 0, 145))
    frame.alpha_composite(contact.filter(ImageFilter.GaussianBlur(18)))
    close_shadow = Image.new("RGBA", (WIDTH, HEIGHT))
    for px, py in points:
        ImageDraw.Draw(close_shadow).ellipse((px - 45, py - 6, px + 45, py + 5), fill=(0, 0, 0, 145))
    frame.alpha_composite(close_shadow.filter(ImageFilter.GaussianBlur(8)))
    frame.alpha_composite(car, (x, y))

    exif = Image.Exif()
    exif[270] = f"{model}. Photo composite: isolated background, reframed, studio backdrop. Credits: /images/cars/credits.html"
    exif[315] = author
    license_url = "https://creativecommons.org/licenses/by-sa/4.0/" if license_name == "CC BY-SA 4.0" else "https://www.pexels.com/license/"
    exif[33432] = f"{author}; {license_name}; {license_url}"
    file = OUT / f"{key}.jpg"
    frame.convert("RGB").save(file, "JPEG", quality=90, subsampling=0, optimize=True, progressive=True, exif=exif)
    contact_sheet.paste(frame.convert("RGB").resize((640, 400), Image.Resampling.LANCZOS), ((index % 2) * 640, (index // 2) * 400))
    print(f"{key}: {model}, {WIDTH}x{HEIGHT}, {file.stat().st_size:,} bytes")

contact_sheet.save(ROOT / "artifacts/car-images/final-contact-sheet.jpg", quality=94)