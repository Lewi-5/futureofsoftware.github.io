# Neon Career-Path Platformer (three.js)

## Context
The repo `futureofsoftware.github.io` is empty (README + .gitignore) and is a GitHub Pages site. The goal is a browser 3D platformer built from the YouTube video `pCh6lQ3-bgE` ("Lucas Explains Everything"):
- A small figure in a green hoodie and green hat starts on a central platform labelled **Software Engineering** in neon.
- A **left path** starts at **Design Engineer** and continues through that branch's sub-disciplines. A **right path** starts at **Systems-Oriented Engineer** and continues through its sub-disciplines. The transcript decides the labels and how many platforms each path has.
- A huge jumbotron far away plays the video. It is always in view and always audible.
- If you fall into the black void, you float back down onto the central platform.

What you chose: the jumbotron is a **YouTube embed layered behind the 3D scene**, each path ends on a **goal platform with a celebration**, and controls are **keyboard and mouse only**.

## Step 1: Get the transcript (yt-dlp)
yt-dlp isn't installed. Python 3.12 is.
1. `python -m pip install --user yt-dlp`
2. `python -m yt_dlp --skip-download --write-subs --write-auto-subs --sub-langs "en.*" --sub-format vtt -o "<scratchpad>/yt/%(id)s" https://www.youtube.com/watch?v=pCh6lQ3-bgE`
3. Clean the VTT into plain text. This drops timestamps, tags and the rolling duplicate lines that auto-captions produce. Save it as `content/transcript.txt` so the source for the labels is in the repo.
4. Read the transcript. Map the taxonomy (design-oriented vs systems-oriented, and the sub-roles under each) into a level data file. Each platform gets a short neon label and a one-line summary I write myself, shown in the HUD when you land.
   - Placeholder guess until I've read it: Left = Design Engineer → UX/Interaction → Prototyping → Front-end/UI → Design Systems → goal. Right = Systems-Oriented Engineer → Backend → Infrastructure/Cloud → Distributed Systems → Reliability/Performance → goal. Expect about 5–7 platforms per side. **The final labels will follow the transcript.**

## Architecture (static, no build step, deployable to Pages as is)
three.js pinned through an `importmap` (`three@0.169.0` + `three/addons/` from cdn.jsdelivr.net). ES modules:

| File | Responsibility |
|---|---|
| `index.html` | importmap, the CSS3D layer under the WebGL canvas, start overlay, HUD |
| `style.css` | black page background, overlay, HUD, neon fonts |
| `src/main.js` | renderer, scene, game loop, state machine (`intro → playing → respawning → goal`) |
| `src/levels.js` | **data only**: platforms `{id, label, blurb, branch, pos, size, goal?}` from the transcript |
| `src/world.js` | builds platforms, neon signs, starfield and void particles from `levels.js` |
| `src/neonSign.js` | canvas-texture neon text with tube border and flicker, plus a colored PointLight |
| `src/player.js` | hoodie character mesh, procedural animation, movement and collision physics |
| `src/cameraRig.js` | third-person orbit and follow camera |
| `src/jumbotron.js` | CSS3D YouTube iframe, the transparent "hole" mesh, screen frame and scaffolding |
| `src/hud.js` | current topic and blurb, path progress, mute toggle, celebration |

### Jumbotron (YouTube embed behind the scene)
- `CSS3DRenderer` puts a youtube-nocookie iframe (`enablejsapi=1&controls=0&loop=1&playlist=pCh6lQ3-bgE&playsinline=1`) in a layer **behind** a transparent WebGL canvas (`alpha:true`, clear alpha 0). The CSS3D camera is kept in sync with the WebGL camera.
- A plane with the same size and transform is drawn with `opacity:0, blending:NoBlending, fog:false`. It punches a hole in the WebGL canvas so the video shows through, and it still writes depth, so platforms and the player correctly cover the screen.
- Size and placement: about 160×90 units, roughly 400 units down the −z axis and raised up. It sits on emissive scaffolding with light strips. Camera far plane is about 2000. The paths fan left and right while trending toward −z, so the screen stays in frame.
- Audio comes from the iframe, so it doesn't change with camera direction. You hear it everywhere, as you asked. Browsers block autoplay with sound until the user interacts, so a **"Click to start"** overlay calls `player.playVideo()` through the YouTube IFrame API. **M** mutes and unmutes.
- The CSS3D layer has `pointer-events:none` so mouse-drag orbit still works. If the video can't be embedded, the screen shows a fallback message.

### Neon signs
Text is drawn to canvas with stacked `shadowBlur` glows on a transparent plane with additive blending, and the plane always faces the camera's yaw. Each sign has a colored PointLight that tints its platform. I'm not using a bloom pass on purpose: bloom would break the alpha hole the jumbotron needs. Branch colors: center green or white, design path magenta, systems path cyan, goals gold. Signs flicker slightly and flare when you first land under them.

### Player
- The figure is about 1.6 units tall and built from primitives. It has a green hoodie torso with hood and drawstrings, green sleeves, dark pants, shoes, a skin-tone head and a green cap. There are procedural animations for idle bob, run (arm and leg swing), jump and float.
- Physics are custom with no library. Gravity and jump velocity are tuned so the max jump is about 6 units across and 2.2 up. The player is a cylinder that collides with platform boxes (land on top, push out at the sides). There's coyote time and jump buffering so it feels good. Movement is relative to camera yaw with acceleration and air control.
- `levels.js` gets a dev-time check that warns if any gap is larger than about 75% of max jump reach, so every path can be completed.

### Fall and respawn
If `y < −40`, there's a quick fade. The player then appears about 25 units above the center platform and **floats down slowly** with a gentle sway in a float pose. Controls are locked until landing, then normal play resumes.

### Camera and controls
WASD or arrow keys to move, Space to jump, drag to orbit, scroll to zoom, M to mute. The follow camera is damped. The default view is behind the player looking toward the jumbotron.

### Goal
Each path ends on a larger gold-trimmed goal platform. Reaching it triggers a confetti burst, a "Design path complete ✓" or "Systems path complete ✓" banner, and a HUD tracker for both paths. When both are complete, a final message appears.

## Verification
1. Add `.claude/launch.json` with `python -m http.server 8000` and open it with `preview_start`.
2. Check the console for zero errors. Click to start and confirm the video plays with sound on the jumbotron, and that platforms and the player cover it correctly.
3. Walk both paths to their goals and confirm every gap can be cleared. Use a JS check of the reach assert, and also play it through.
4. Jump off on purpose and confirm the float-down respawn onto the center platform.
5. Turn the camera away from the screen and confirm the audio keeps playing.
6. Take screenshots of start, mid-path and goal to check the neon signs and the character read well.
7. Committing and pushing to GitHub Pages happens only after you approve.
