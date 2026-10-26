#!/usr/bin/env python3
# =====================================================================
# render.py —— Playwright 导帧
#   --keys "0.8,1.4,..."   渲染关键静帧到 checks/
#   --full                 渲染全片 1800 帧到 frames/
# 画面由 window.draw(t) 完全决定，字体加载完成后才开始
# =====================================================================
import argparse, base64, os, sys, time

ROOT = os.path.dirname(os.path.abspath(__file__))
HTML = os.path.join(ROOT, "index.html")
FPS = 30
DUR = 60.0


def launch():
    import http.server, socketserver, threading
    global _httpd
    port = 8741
    while True:
        try:
            handler = http.server.SimpleHTTPRequestHandler
            _httpd = socketserver.TCPServer(("127.0.0.1", port), handler)
            break
        except OSError:
            port += 1
    _httpd.allow_reuse_address = True
    threading.Thread(target=_httpd.serve_forever, daemon=True).start()

    from playwright.sync_api import sync_playwright
    pw = sync_playwright().start()
    browser = pw.chromium.launch(args=["--force-color-profile=srgb"])
    page = browser.new_page(viewport={"width": 1920, "height": 1080}, device_scale_factor=1)
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    page.goto(f"http://127.0.0.1:{port}/index.html")
    page.wait_for_function("window.__ready === true", timeout=60000)
    page.wait_for_timeout(300)
    # 冒烟测试：全时间轴抽 30 个点各画一帧，任何 JS 异常都会在此暴露
    bad = page.evaluate("""() => {
      const bad = [];
      for (let i = 0; i <= 30; i++) {
        const t = i * 2;
        try { draw(t); } catch (e) { bad.push(t.toFixed(2) + 's: ' + e.message); }
      }
      return bad;
    }""")
    if bad:
        for b in bad: print("JS ERROR @", b)
        raise SystemExit("draw() 冒烟测试失败")
    if errors:
        for e in errors[:10]: print("PAGE:", e)
    return pw, browser, page


def save_dataurl(dataurl, path):
    assert dataurl.startswith("data:image/jpeg;base64,")
    with open(path, "wb") as f:
        f.write(base64.b64decode(dataurl.split(",", 1)[1]))


def key_frames(times, outdir="checks", q=0.93):
    pw, browser, page = launch()
    os.makedirs(os.path.join(ROOT, outdir), exist_ok=True)
    for tt in times:
        t0 = time.time()
        data = page.evaluate(
            "t => { draw(t); return document.getElementById('c').toDataURL('image/jpeg', %r); }" % q, tt)
        name = f"key_{tt:07.3f}s.jpg"
        save_dataurl(data, os.path.join(ROOT, outdir, name))
        print(f"{name}  {time.time()-t0:.2f}s")
    browser.close(); pw.stop()


def full_frames(outdir="frames", q=0.92, batch=30):
    pw, browser, page = launch()
    os.makedirs(os.path.join(ROOT, outdir), exist_ok=True)
    total = int(DUR * FPS)
    dt = 1.0 / FPS
    done = 0
    t_start = time.time()
    while done < total:
        n = min(batch, total - done)
        t0 = done * dt
        urls = page.evaluate(
            "(args) => renderBatch(args[0], args[1], args[2], args[3])", [t0, n, dt, q])
        assert len(urls) == n
        for i, u in enumerate(urls):
            save_dataurl(u, os.path.join(ROOT, outdir, f"f{done+i:05d}.jpg"))
        done += n
        el = time.time() - t_start
        print(f"frames {done}/{total}  elapsed {el:.0f}s  eta {el/done*(total-done):.0f}s", flush=True)
    browser.close(); pw.stop()


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--keys", type=str, default="")
    ap.add_argument("--full", action="store_true")
    ap.add_argument("--quality", type=float, default=0.92)
    args = ap.parse_args()
    if args.keys:
        key_frames([float(x) for x in args.keys.split(",") if x.strip()], q=max(args.quality, 0.93))
    if args.full:
        full_frames(q=args.quality)
    if not args.keys and not args.full:
        print("用法: render.py --keys '0.8,1.4' | --full")
