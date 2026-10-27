#!/usr/bin/env python3
"""sky-film-studio · render.py —— Playwright 确定性导帧
  --project <dir> --keys "1.5,6,..."   关键静帧 → <dir>/checks/
  --project <dir> --full               全片帧   → <dir>/frames/
内置：127.0.0.1 HTTP 服务（绕 file:// 字体 CORS）、__ready 字体门控、
draw() 全时间轴冒烟（导帧前抓 JS 异常）。"""
import argparse, base64, glob, http.server, os, socketserver, threading, time, math, pathlib
from project import mark_build, timeline_errors


def launch(project, strict_fonts=False, determinism=False):
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
    resources = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("requestfailed", lambda request: resources.append(request.url))
    page.on("response", lambda response: resources.append(response.url)
            if response.status >= 400 and "/assets/fonts/" not in response.url and not response.url.endswith("favicon.ico") else None)
    page.goto(f"http://127.0.0.1:{port}/index.html")
    page.wait_for_function("window.__ready === true || window.__bootError", timeout=120000)
    boot_error = page.evaluate("window.__bootError || null")
    if boot_error: raise SystemExit(f"加载失败: {boot_error}")
    font_errors = page.evaluate("window.__fontErrors || []")
    if font_errors:
        if strict_fonts: raise SystemExit(f"字体加载失败: {font_errors}")
        print(f"⚠ 预览字体回退: {font_errors}；交付须 --strict-fonts")
    cue_state = page.evaluate("({film:FILM_META,cues:CUES})")
    timeline = timeline_errors(cue_state['film'],cue_state['cues'])
    if timeline: raise SystemExit("; ".join(timeline))
    page.wait_for_timeout(300)
    dur = page.evaluate("FILM_META ? FILM_META.duration : 60")
    bad = page.evaluate("""(dur) => {
      const bad = [];
      const samples = new Set(Array.from({length:61},(_,i)=>i*dur/61));
      for (const beat of FILM_META.beats || [])
        for (const dt of [0,.05,.2,.5,.9]) samples.add(Math.min(dur-.001,beat.start+dt));
      for (const t of samples) {
        try { draw(t); } catch (e) { bad.push(t.toFixed(2) + 's: ' + e.message); }
      }
      return bad;
    }""", dur)
    if bad:
        for b in bad[:10]:
            print("JS ERROR @", b)
        raise SystemExit("draw() 冒烟测试失败")
    if errors or resources:
        raise SystemExit(f"页面/必需资源错误: {errors[:10]} {resources[:10]}")
    if determinism:
        result = page.evaluate("""(duration)=>{
          const times=[0.1,duration*.27,duration*.51,duration-.15];
          const snapshot=t=>{draw(t);return document.getElementById('c').toDataURL('image/png');};
          const expected=times.map(snapshot);
          for (const i of [3,1,0,2,2,0,3,1]) if(snapshot(times[i])!==expected[i]) return times[i];
          return null;
        }""",dur)
        if result is not None: raise SystemExit(f"确定性检查失败 @ {result}s")
        print("✓ 同环境重复/乱序渲染像素一致")
    return pw, browser, page, httpd, dur


def save_dataurl(u, path):
    assert u.startswith("data:image/jpeg;base64,")
    with open(path, "wb") as f:
        f.write(base64.b64decode(u.split(",", 1)[1]))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--project", required=True)
    ap.add_argument("--keys", nargs="?", const="auto", default="")
    ap.add_argument("--strict-fonts", action="store_true")
    ap.add_argument("--determinism", action="store_true")
    ap.add_argument("--full", action="store_true")
    ap.add_argument("--quality", type=float, default=0.92)
    ap.add_argument("--preview", action="store_true", help="预览工作台：浏览器实时拖时间轴调 draw(t)")
    ap.add_argument("--port", type=int, default=8765)
    args = ap.parse_args()

    if args.preview:
        import http.server as _hs, socketserver as _ss, threading as _th, pathlib as _pl, webbrowser as _wb
        os.chdir(args.project)
        SKILL = _pl.Path(__file__).resolve().parents[1]
        preview_js = (SKILL / "engine" / "preview.js").read_text(encoding="utf-8")
        base_html = _pl.Path("index.html").read_text(encoding="utf-8")

        class H(_hs.SimpleHTTPRequestHandler):
            def do_GET(self):
                if self.path in ("/", "/index.html"):
                    html = base_html.replace("</body>", '<script>\n' + preview_js + "\n</script></body>", 1)
                    self.send_response(200)
                    self.send_header("Content-Type", "text/html; charset=utf-8")
                    self.end_headers()
                    self.wfile.write(html.encode("utf-8"))
                else:
                    super().do_GET()
            def log_message(self, *a):
                pass

        httpd = _ss.TCPServer(("127.0.0.1", args.port), H)
        url = f"http://127.0.0.1:{args.port}/"
        print(f"▶ 预览工作台：{url}（拍=金色线 · 口播=红条 · 拖动/空格/←→ · 点击取坐标；Ctrl+C 退出）")
        try:
            _wb.open(url)
        except Exception:
            pass
        httpd.serve_forever()
        raise SystemExit(0)

    project_path = pathlib.Path(args.project).resolve()
    pw, browser, page, httpd, dur = launch(project_path,args.strict_fonts,args.determinism)
    try:
        if args.keys:
            os.makedirs("checks", exist_ok=True)
            keys = args.keys
            if keys == "auto":
                beats = page.evaluate("FILM_META.beats")
                keys = ",".join(str(round(b['start']+(b['end']-b['start'])*q,3)) for b in beats for q in (.05,.2,.5,.9))
            for old in glob.glob("checks/key_*.jpg"): os.remove(old)
            for tt in [float(x) for x in keys.split(",") if x.strip()]:
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
            total = math.ceil(dur * fps)
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
            mark_build(project_path,"frames",count=total,fps=fps,duration=dur)
    finally:
        browser.close(); pw.stop(); httpd.shutdown()


if __name__ == "__main__":
    main()
