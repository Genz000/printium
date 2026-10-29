# Printium

Retro print effect for photos. An image becomes a one-colour print: grainy speckle in the highlights, a halftone and crack texture in the midtones and solid ink in the shadows, in any ink and paper colour.

**Try it:** https://genz000.github.io/printium/ (desktop browser, window at least 1024 px wide)

## What it does

- Rebuilds a Photoshop retro-print recipe as live controls: Grain, a 50% grey layer with Halftone Pattern and Craquelure blended Lighter Color, Threshold, then a gradient map to ink and paper
- Defaults are the recipe's values (Grain 100/25/50, dots 2/12, cracks 35/15/3, opacity 60%, threshold 161), and every control uses Photoshop's units
- Highlights and Shadows adjust the light and dark tones separately before the print pattern
- Cuts away a plain white surround so only the object is printed; white highlights inside the object stay
- Fit the image to the canvas (Contain or Cover) and scale it; rotate and flip in the uploader
- Ink colour, paper colour, or ink only over the background
- Export PNG/JPG at 2K, 4K or 8K, with or without the background

## How to use

1. Add a photo in **Image**. An object shot on white works best.
2. In **Placement**, choose Contain or Cover and set **Scale**. **Cut out white** removes the white surround; raise **Tolerance** if an off-white edge remains.
3. Set how much prints as ink in **Tone**: **Threshold** is the main control, **Brightness** and **Contrast** adjust the photo first, and **Highlights** and **Shadows** change only the light or dark tones (lower Highlights brings speckle into bright areas, higher Shadows opens solid ink into texture).
4. Shape the texture in **Grain** (speckle) and **Texture** (dots and cracks; **Opacity** 0 gives a plain threshold).
5. Pick colours in **Ink**, and the background and canvas size in **Settings**.
6. Choose format and size in **Image Export** and press **Export PNG** at the bottom of the panel.

## Run locally

```bash
npm install
npm run dev
```

## Author

Made by Nader Boulaich — [naderboulaich.net](https://naderboulaich.net).

Third-party code included in this repository keeps its own license; see `LICENSE.md` and `NOTICE.md`.
