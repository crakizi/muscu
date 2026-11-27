// Test du format téléphone avec le VRAI moteur de Safari / de l'app Mac (WebKit), sur Mac seulement.
// Chrome (Playwright) ne voit pas certains défauts propres à WebKit (ex. 27/11 : « zoom » appliqué deux fois
// dans le cadre → bande blanche à droite). Usage, depuis dev/ avec un serveur local lancé :
//   swiftc -O testwebkit.swift -o /tmp/testwebkit && /tmp/testwebkit "http://localhost:8792/index.local.html?t=$(date +%s)" capture.png 900 600
// (le ?t=… évite que WebKit reprenne une ancienne version en cache). Sortie : mesures + OK/ÉCHEC, code 1 si échec.
import AppKit
import WebKit
setvbuf(stdout, nil, _IONBF, 0) // affichage immédiat, même redirigé
let args = CommandLine.arguments
let url = URL(string: args[1])!, out = args[2]
let W = Double(args.count > 3 ? args[3] : "1280")!, H = Double(args.count > 4 ? args[4] : "860")!
var failed = false
class D: NSObject, WKNavigationDelegate {
  func webView(_ w: WKWebView, didFinish n: WKNavigation!) {
    DispatchQueue.main.asyncAfter(deadline: .now() + 3) {
      let js = """
      (() => { const f = document.querySelector('#phone iframe'); const r = {host: document.documentElement.classList.contains('phone-host'), outerW: innerWidth};
        if (f) { const fw = f.contentWindow; const b = f.getBoundingClientRect(); r.boxW = Math.round(b.width); r.boxH = Math.round(b.height);
          r.innerW = fw.innerWidth; r.innerH = fw.innerHeight; const nav = fw.document.querySelector('nav'); r.navBottom = nav ? Math.round(nav.getBoundingClientRect().bottom) : null;
          r.cols = getComputedStyle(fw.document.querySelector('.dsh-grid') || fw.document.body).gridTemplateColumns; }
        r.back = !!document.querySelector(".phone-back"); const p = document.getElementById("phone"); if (p) { r.css = p.style.cssText; r.zoomC = getComputedStyle(p).zoom; r.fitCss = document.getElementById("phoneFit") ? document.getElementById("phoneFit").style.cssText : "absent"; } return JSON.stringify(r); })()
      """
      w.evaluateJavaScript(js) { res, err in
        let txt = (res as? String) ?? "{}"; print(txt)
        if let d = txt.data(using: .utf8), let j = try? JSONSerialization.jsonObject(with: d) as? [String: Any], (j["host"] as? Bool) == true {
          let iw = j["innerW"] as? Int ?? 0, ih = j["innerH"] as? Int ?? 0, nb = j["navBottom"] as? Int ?? 0, cols = (j["cols"] as? String ?? "").split(separator: " ").count
          let ok = iw >= 389 && abs(nb - ih) <= 1 && cols == 2
          print(ok ? "OK   l'app remplit l'écran du téléphone (390 de large, barre d'onglets en bas, 2 colonnes)" : "ÉCHEC l'app ne remplit pas l'écran du téléphone"); if !ok { failed = true }
        }
        w.takeSnapshot(with: nil) { img, _ in
          if let img = img, let t = img.tiffRepresentation, let rep = NSBitmapImageRep(data: t), let png = rep.representation(using: .png, properties: [:]) { try? png.write(to: URL(fileURLWithPath: out)) }
          exit(failed ? 1 : 0)
        }
      }
    }
  }
}
let app = NSApplication.shared
let win = NSWindow(contentRect: NSRect(x: 0, y: 0, width: W, height: H), styleMask: [.borderless], backing: .buffered, defer: false)
let wv = WKWebView(frame: NSRect(x: 0, y: 0, width: W, height: H))
let d = D(); wv.navigationDelegate = d; win.contentView = wv
wv.load(URLRequest(url: url))
DispatchQueue.main.asyncAfter(deadline: .now() + 20) { print("délai dépassé"); exit(1) }
app.run()
