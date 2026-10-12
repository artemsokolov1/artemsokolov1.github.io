"""Render a looping money portrait from imagegen assets, then encode it as GIF.

Requires Playwright with Chromium and FFmpeg. Run from the repository root:
    python tools/render-money-gif.py
"""

import base64
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import shutil
import subprocess
from tempfile import TemporaryDirectory
from threading import Thread

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets" / "img"
FPS = 20
FRAMES = 48

RENDERER = r"""
async (base) => {
  const load = (name) => new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = base + '/assets/img/' + name;
  });
  const [face, closed] = await Promise.all([load('face-money-scrooge.png'), load('face-money-scrooge-blink.png')]);
  const canvas = document.createElement('canvas');
  canvas.width = 384;
  canvas.height = 560;
  document.body.replaceChildren(canvas);
  const ctx = canvas.getContext('2d');
  const period = 2.4;
  const columns = 32;
  const rows = 44;
  const imageWidth = face.naturalWidth;
  const imageHeight = face.naturalHeight;
  const fit = Math.min(canvas.width / imageWidth, canvas.height / imageHeight) * .95;
  const left = (canvas.width - imageWidth * fit) / 2;
  const top = (canvas.height - imageHeight * fit) / 2;
  const smooth = (a, b, n) => {
    const v = Math.max(0, Math.min(1, (n - a) / (b - a)));
    return v * v * (3 - 2 * v);
  };
  const zone = (n, center, inner, outer) => 1 - smooth(inner, outer, Math.abs(n - center));
  const eyeCenters = [.30, .70];
  const eyeY = .405;
  const actor = document.createElement('canvas');
  actor.width = imageWidth; actor.height = imageHeight;
  const paint = actor.getContext('2d');
  const eyelids = document.createElement('canvas');
  eyelids.width = imageWidth; eyelids.height = imageHeight;
  const lids = eyelids.getContext('2d');
  lids.drawImage(closed, 0, 0, imageWidth, imageHeight);
  const mask = document.createElement('canvas');
  mask.width = imageWidth; mask.height = imageHeight;
  const feather = mask.getContext('2d');
  for (const center of eyeCenters) {
    feather.save();
    feather.translate(center * imageWidth, eyeY * imageHeight);
    feather.scale(imageWidth * .165, imageHeight * .19);
    const gradient = feather.createRadialGradient(0, 0, .76, 0, 0, 1);
    gradient.addColorStop(0, '#fff'); gradient.addColorStop(1, '#fff0');
    feather.fillStyle = gradient;
    feather.fillRect(-1, -1, 2, 2);
    feather.restore();
  }
  lids.globalCompositeOperation = 'destination-in';
  lids.drawImage(mask, 0, 0);

  // Animate the face as a continuous surface. The currency pupils are
  // already part of this portrait; there are no separate money sprites.
  function triangle(source, target) {
    const [s0, s1, s2] = source;
    const [d0, d1, d2] = target;
    const ux = s1.x - s0.x, uy = s1.y - s0.y;
    const vx = s2.x - s0.x, vy = s2.y - s0.y;
    const dx1 = d1.x - d0.x, dy1 = d1.y - d0.y;
    const dx2 = d2.x - d0.x, dy2 = d2.y - d0.y;
    const determinant = ux * vy - uy * vx;
    const a = (dx1 * vy - dx2 * uy) / determinant;
    const c = (dx2 * ux - dx1 * vx) / determinant;
    const b = (dy1 * vy - dy2 * uy) / determinant;
    const d = (dy2 * ux - dy1 * vx) / determinant;
    const middle = { x: (d0.x + d1.x + d2.x) / 3, y: (d0.y + d1.y + d2.y) / 3 };
    const expand = (point) => {
      const x = point.x - middle.x, y = point.y - middle.y;
      const length = Math.hypot(x, y);
      return { x: point.x + x / length * .75, y: point.y + y / length * .75 };
    };
    const clip = [d0, d1, d2].map(expand);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(clip[0].x, clip[0].y);
    ctx.lineTo(clip[1].x, clip[1].y);
    ctx.lineTo(clip[2].x, clip[2].y);
    ctx.closePath();
    ctx.clip();
    ctx.transform(a, b, c, d, d0.x - a * s0.x - c * s0.y, d0.y - b * s0.x - d * s0.y);
    ctx.drawImage(actor, 0, 0);
    ctx.restore();
  }

  window.renderMoneyFrame = (time) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const phase = time / period * Math.PI * 2;
    const winkTime = (time / period - .72 + 1) % 1;
    const blink = 1 - smooth(.028, .072, Math.abs(winkTime - .06));
    paint.clearRect(0, 0, imageWidth, imageHeight);
    paint.drawImage(face, 0, 0);
    paint.globalAlpha = blink;
    paint.drawImage(eyelids, 0, 0);
    paint.globalAlpha = 1;
    const source = [], target = [];
    for (let row = 0; row <= rows; row++) {
      source[row] = []; target[row] = [];
      for (let column = 0; column <= columns; column++) {
        const x = column / columns, y = row / rows;
        let dx = 0, dy = 0;
        for (const center of eyeCenters) {
          const eye = zone(x, center, .11, .185) * zone(y, eyeY, .14, .205);
          dx += (x - center) * .035 * Math.sin(phase) * eye;
        }
        const tongue = zone(x, .48, .10, .205) * zone(y, .82, .12, .205);
        dx += .012 * Math.sin(phase * 2) * tongue;
        dy += .018 * Math.sin(phase) * tongue;
        const cheeks = zone(x, .5, .28, .46) * zone(y, .68, .08, .19);
        dy -= .006 * (1 - Math.cos(phase)) * cheeks;
        source[row][column] = { x: x * imageWidth, y: y * imageHeight };
        target[row][column] = { x: left + (x + dx) * imageWidth * fit, y: top + (y + dy) * imageHeight * fit };
      }
    }
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2 + Math.sin(phase) * 1.8);
    ctx.rotate(Math.sin(phase) * .022);
    ctx.translate(-canvas.width / 2, -canvas.height / 2);
    for (let row = 0; row < rows; row++) {
      for (let column = 0; column < columns; column++) {
        triangle([source[row][column], source[row][column + 1], source[row + 1][column]],
          [target[row][column], target[row][column + 1], target[row + 1][column]]);
        triangle([source[row + 1][column + 1], source[row + 1][column], source[row][column + 1]],
          [target[row + 1][column + 1], target[row + 1][column], target[row][column + 1]]);
      }
    }
    ctx.restore();
    return canvas.toDataURL('image/png').split(',')[1];
  };
}
"""


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def main():
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        raise RuntimeError("FFmpeg is required to encode the GIF")
    server = ThreadingHTTPServer(("127.0.0.1", 0), partial(QuietHandler, directory=str(ROOT)))
    Thread(target=server.serve_forever, daemon=True).start()
    base = f"http://127.0.0.1:{server.server_port}"
    try:
        with TemporaryDirectory(prefix="artem-money-frames-") as temporary:
            frames = Path(temporary)
            with sync_playwright() as playwright:
                browser = playwright.chromium.launch(headless=True)
                page = browser.new_page()
                page.goto(base + "/robots.txt", wait_until="domcontentloaded")
                page.evaluate(RENDERER, base)
                for index in range(FRAMES):
                    data = page.evaluate("(t) => window.renderMoneyFrame(t)", index / FPS)
                    (frames / f"{index:03}.png").write_bytes(base64.b64decode(data))
                browser.close()
            # PNG frames are rendered by the browser. FFmpeg only encodes them.
            shutil.copyfile(frames / "000.png", ASSETS / "face-money-still.png")
            subprocess.run([
                ffmpeg, "-hide_banner", "-loglevel", "error", "-y",
                "-framerate", str(FPS), "-i", str(frames / "%03d.png"),
                "-filter_complex",
                "[0:v]split[a][b];[a]palettegen=max_colors=255:reserve_transparent=1[p];"
                "[b][p]paletteuse=dither=bayer:bayer_scale=3:alpha_threshold=128:diff_mode=rectangle",
                "-loop", "0", str(ASSETS / "face-money.gif")
            ], check=True)
    finally:
        server.shutdown()
    # Smaller browser assets retain the GIF as a standalone download.
    for source, target, filters, quality in [
        ("face-money.gif", "face-money.webp", ["-vf", "scale=288:420", "-loop", "0"], "80"),
        ("face-money-still.png", "face-money-still.webp", [], "86"),
        ("money-bill.png", "money-bill.webp", ["-vf", "scale=240:-1"], "86")
    ]:
        subprocess.run([
            ffmpeg, "-hide_banner", "-loglevel", "error", "-y",
            "-i", str(ASSETS / source), *filters,
            "-c:v", "libwebp_anim" if source.endswith(".gif") else "libwebp",
            "-quality", quality, "-compression_level", "6", str(ASSETS / target)
        ], check=True)
    gif = ASSETS / "face-money.gif"
    print(f"GIF: {gif} ({gif.stat().st_size:,} bytes, {FRAMES} frames, {FPS} fps)")
    print(f"Still: {ASSETS / 'face-money-still.png'}")


if __name__ == "__main__":
    main()
