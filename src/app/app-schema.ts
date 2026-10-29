import { defineToolcraft, imageExportModule, mediaSourceModule } from "@/toolcraft/runtime";

import {
  backgroundControls, colorControls, grainControls, imageControls, placementControls, textureControls, toneControls,
} from "../print/print-controls";
import appDefaults from "./app-defaults.json" with { type: "json" };
import { appIdentity } from "./app-identity";

export const appSchema = defineToolcraft({
  defaults: appDefaults,
  base: {
    canvas: {
      enabled: true,
      upload: true,
      size: { width: 1600, height: 1600, unit: "px" },
      sizing: { mode: "editable-output" },
    },
    identity: appIdentity,
    panels: {
      controls: {
        sections: [
          { id: "runtime.setup", title: "Settings", controls: backgroundControls },
          { id: "image", title: "Image", controls: imageControls },
          { id: "placement", title: "Placement", controls: placementControls },
          { id: "tone", title: "Tone", controls: toneControls },
          { id: "grain", title: "Grain", controls: grainControls },
          { id: "texture", title: "Texture", controls: textureControls },
          { id: "color", title: "Ink", controls: colorControls },
        ],
        title: "Controls",
      },
    },
    toolbar: {
      history: true,
      radar: true,
      theme: true,
      zoom: true,
    },
  },
  modules: [mediaSourceModule(), imageExportModule()],
});
