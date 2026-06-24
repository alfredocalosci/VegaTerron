# Terrain Data Sources & Mapping

## Land Cover — ESA WorldCover 2021

**Collection:** `ESA_WORLDCOVER_10M_2021_V2`
**Resolution:** 10m
**Coverage:** Global
**Source:** ESA, derived from Sentinel-1 + Sentinel-2 data
**Type:** Static annual product (single 2021 epoch, no cloud masking issues)

### Class mapping

| WorldCover value | Class | Terrain symbol |
|---|---|---|
| 10 | Tree cover | `forest` |
| 20 | Shrubland | `shrubland` |
| 30 | Grassland | `grassland` |
| 40 | Cropland | `farmland` |
| 50 | Built-up | `urban` |
| 60 | Bare / sparse vegetation | `scorched` |
| 70 | Snow and Ice | `snow` |
| 80 | Permanent water bodies | `water` |
| 90 | Herbaceous wetland | `swamp` |
| 95 | Mangroves | `swamp` |
| 100 | Moss and lichen | `tundra` |
| 0 / anything else | Unknown / no data | `desert` *(fallback)* |

---

## Elevation — COP-DEM GLO-30

**Collection:** `COPERNICUS_30`
**Resolution:** 30m
**Coverage:** Global (near-global)
**Source:** TanDEM-X radar acquisitions
**Type:** Static (acquired 2010–2015)

### Usage

Elevation does **not** affect which terrain symbol is shown. It is used for:

- **Blob fill colours** — pixels are grouped into 3 bands (low / mid / high) relative to the min–max range within the fetched area, rendered as 3 dark tones
- **River pathfinding** — the A* river route is constrained to mid-elevation cells (between ⅓ and ⅔ of the local range)

Normalization is **local** (min–max within the bounding box), so the three bands always span the full relief of whatever area is shown.

---

## What Vega Terrón actually returns

From a probe of the 40km area, the classes present are:

| Class | % |
|---|---|
| Tree cover (oak woodland) | ~27% |
| Built-up | ~26% |
| Cropland (cereal meseta) | ~18% |
| Grassland | ~16% |
| Unknown / no data | ~10% |
| Shrubland | ~2% |
| Bare soil | ~0.3% |
| Water (Douro river) | ~0.3% |
