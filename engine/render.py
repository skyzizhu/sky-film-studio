#!/usr/bin/env python3
"""sky-film-studio · render.py —— Playwright 确定性导帧
  --project <dir> --keys "1.5,6,..."   关键静帧 → <dir>/checks/
  --project <dir> --full               全片帧   → <dir>/frames/
内置：127.0.0.1 HTTP 服务（绕 file:// 字体 CORS）、__ready 字体门控、
draw() 全时间轴冒烟（导帧前抓 JS 异常）。"""
import argparse, base64, glob, http.server, os, socketserver, threading, time


def launch(project):
    os.chdir(project)
    port = 8741
    while True:
        try:
            httpd = socketserver.TCPServer(("127.0.0.1", port), http.server.SimpleHTTPRequestHandler)
            break
        except OSError:
            port += 1
    threading.Thread(target=httpd.serve_forever, daemon=True).start()

    from playwright.sync_api import sync_playwright
    pw = sync_playwright().start()
    browser = pw.chromium.launch(args=["--force-color-profile=srgb"])
    import json as _json
    with open("film.json") as _fp:
        _film = _json.load(_fp)
    vw, vh = int(_film.get("width", 1920)), int(_film.get("height", 1080))
    page = browser.new_page(viewport={"width": vw, "height": vh}, device_scale_factor=1)
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto(f"http://127.0.0.1:{port}/index.html")
    page.wait_for_function("window.__ready === true", timeout=120000)
    page.wait_for_timeout(300)
    dur = page.evaluate("FILM_META ? FILM_META.duration : 60")
    bad = page.evaluate("""(dur) => {
      const bad = [];
      for (let i = 0; i <= 60; i++) {
        const t = i * dur / 61;
        try { draw(t); } catch (e) { bad.push(t.toFixed(2) + 's: ' + e.message); }
      }
      return bad;
    }""", dur)
    if bad:
        for b in bad[:10]:
            print("JS ERROR @", b)
        raise SystemExit("draw() 冒烟测试失败")
    if errors:
        for e in errors[:10]:
            print("PAGE:", e)
    return pw, browser, page, httpd, dur


def save_dataurl(u, path):
    assert u.startswith("data:image/jpeg;base64,")
    with open(path, "wb") as f:
        f.write(base64.b64decode(u.split(",", 1)[1]))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--project", required=True)
    ap.add_argument("--keys", default="")
    ap.add_argument("--full", action="store_true")
    ap.add_argument("--quality", type=float, default=0.92)
    args = ap.parse_args()

    pw, browser, page, httpd, dur = launch(args.project)
    try:
        if args.keys:
            os.makedirs("checks", exist_ok=True)
            for tt in [float(x) for x in args.keys.split(",") if x.strip()]:
                t0 = time.time()
                u = page.evaluate(
                    "t => { draw(t); return document.getElementById('c').toDataURL('image/jpeg', %r); }"
                    % max(args.quality, 0.93), min(tt, dur - 0.01))
                save_dataurl(u, f"checks/key_{tt:07.3f}s.jpg")
                print(f"key {tt}s  {time.time()-t0:.2f}s")
        if args.full:
            os.makedirs("frames", exist_ok=True)
            for f in glob.glob("frames/*.jpg"):
                os.remove(f)
            fps = page.evaluate("(FILM_META && FILM_META.fps) || 30")
            total = int(dur * fps) + 1
            dt = 1.0 / fps
            done = 0
            t0 = time.time()
            while done < total:
                n = min(30, total - done)
                urls = page.evaluate(
                    "(a) => renderBatch(a[0], a[1], a[2], a[3])", [done * dt, n, dt, args.quality])
                for i, u in enumerate(urls):
                    save_dataurl(u, f"frames/f{done+i:05d}.jpg")
                done += n
                el = time.time() - t0
                print(f"frames {done}/{total}  {el:.0f}s  eta {el/done*(total-done):.0f}s", flush=True)
    finally:
        browser.close(); pw.stop(); httpd.shutdown()


if __name__ == "__main__":
    main()
