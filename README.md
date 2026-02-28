
# Relative Light Slider (HACS)

A Home Assistant Lovelace card that adjusts brightness **relative** to the current brightness of all lights that are ON in a group.

## Features

- Relative brightness (-100% to +100%)
- Only affects lights that are ON
- Automatically resets slider after use

## Installation

### HACS

1. Open HACS
2. Go to Frontend
3. Click the 3 dots → Custom Repositories
4. Add this repo URL
5. Category: Frontend
6. Install
7. Reload

## Usage

```yaml
type: custom:relative-light-slider
entity: light.living_room_group
title: Living Room Relative Brightness
```

---

# 📜 5️⃣ LICENSE (MIT recommended)

Create a file called `LICENSE` and use MIT license text.

---

# 🚀 6️⃣ Publish on GitHub

1. Create new GitHub repo (public)
2. Upload files
3. Create a Release (VERY IMPORTANT)

Example:
- Tag: `v1.0.0`
- Title: `Initial Release`

HACS requires at least one release.

---

# 🔌 7️⃣ Install in HACS

In Home Assistant:

1. HACS → Frontend
2. ⋮ → Custom Repositories
3. Add:
