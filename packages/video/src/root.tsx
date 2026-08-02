import "./index.css";
import { Composition } from "remotion";

import {
  FIX_CODEX_VIDEO_DURATION,
  FixCodexVideo,
} from "./fix-codex-composition";

export const RemotionRoot: React.FC = () => (
  <Composition
    id="FixCodexVideo"
    component={FixCodexVideo}
    durationInFrames={FIX_CODEX_VIDEO_DURATION}
    fps={30}
    width={1920}
    height={1080}
  />
);
