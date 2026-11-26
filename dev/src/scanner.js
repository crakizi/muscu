// ===================== SCANNER CODE-BARRES EN DIRECT (caméra) =====================
const Scanner = {
  reader: null, el: null, stream: null,
  hub: false,
  async open(onCode, title, hub) {
    this.hub = !!hub;
    if (!navigator.mediaDevices?.getUserMedia) { toast("Caméra indisponible ici : prends le code en photo."); return; }
    const Z = await loadZXing(); if (!Z) { toast("Scanner indisponible (connexion ?)"); return; }
    this.close();
    const el = document.createElement("div"); this.el = el;
    el.style.cssText = "position:fixed;inset:0;background:#000;z-index:80;display:flex;flex-direction:column";
    el.innerHTML = `<div style="color:#fff;padding:calc(14px + env(safe-area-inset-top)) 16px 10px;display:flex;justify-content:space-between;align-items:center;font:600 16px -apple-system,system-ui">
        <span>${esc(title || "Scanne le code-barres")}</span><button class="sec small" id="scanClose">Fermer</button></div>
      <div style="position:relative;flex:1;overflow:hidden"><video id="scanVid" playsinline muted autoplay style="width:100%;height:100%;object-fit:cover"></video>
        <div style="position:absolute;left:10%;right:10%;top:38%;height:24%;border:3px solid var(--fn-ok,#22c55e);border-radius:16px;box-shadow:0 0 0 2000px rgba(0,0,0,.35)"></div>
        <div style="position:absolute;left:12%;right:12%;top:50%;height:2px;background:var(--fn-ok,#22c55e);opacity:.8;animation:blink 1.2s infinite"></div></div>
      <div style="color:#cbd5e1;text-align:center;padding:12px 16px calc(16px + env(safe-area-inset-bottom));font:14px -apple-system,system-ui">Place le code-barres dans le cadre vert, il se lit tout seul.
        ${this.hub ? `<div class="scanmodes"><label>📸 Photo du plat<input type="file" accept="image/*" capture="environment" data-file="hubphoto" style="display:none"></label><label>🏷️ Étiquette / produit<input type="file" accept="image/*" multiple data-file="hubprod" style="display:none"></label><button id="scanSearch">🔎 Chercher</button></div>` : ""}
        <div class="row" style="margin-top:10px;justify-content:center"><input id="scanManual" inputmode="numeric" placeholder="ou tape le code" style="max-width:200px;background:#111;color:#fff;border-color:#333"><button class="small" id="scanManualOk">OK</button></div></div>`;
    document.body.appendChild(el);
    el.querySelector("#scanClose").onclick = () => this.close();
    const ss = el.querySelector("#scanSearch"); if (ss) ss.onclick = () => { this.close(); resetAdd(defaultMeal()); S.add.tab = "search"; openSheet(addSheet); };
    el.querySelector("#scanManualOk").onclick = () => { const v = el.querySelector("#scanManual").value.replace(/\D/g, ""); if (v) { this.close(); onCode(v); } };
    try {
      const hints = new Map(); hints.set(Z.DecodeHintType.POSSIBLE_FORMATS, [Z.BarcodeFormat.EAN_13, Z.BarcodeFormat.EAN_8, Z.BarcodeFormat.UPC_A, Z.BarcodeFormat.UPC_E, Z.BarcodeFormat.CODE_128]);
      this.reader = new Z.BrowserMultiFormatReader(hints, 300);
      await this.reader.decodeFromConstraints({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } } }, "scanVid", (res) => {
        if (res) { const code = res.getText(); try { navigator.vibrate && navigator.vibrate(60); } catch (e) {} this.close(); onCode(code); }
      });
    } catch (e) { this.close(); toast(e?.name === "NotAllowedError" ? "Autorise l'accès à la caméra pour scanner." : "Caméra impossible à ouvrir : prends le code en photo."); }
  },
  close() { try { this.reader && this.reader.reset(); } catch (e) {} this.reader = null; if (this.el) { this.el.remove(); this.el = null; } }
};
async function aiProductPhotos(blobs) {
  return aiJSON(`Tu reçois ${blobs.length} photo(s) d'un produit alimentaire acheté en supermarché (Espagne ou France) : l'emballage et/ou le tableau des valeurs nutritionnelles.
1) Identifie le produit : nom simple en français, marque, chiffres du code-barres s'ils sont lisibles.
2) Si un tableau nutritionnel est visible, recopie EXACTEMENT les valeurs pour 100 g / 100 ml ("valor energético" en kcal, grasas, saturadas, hidratos, azúcares, fibra, proteínas, sal). Sinon, donne des valeurs typiques pour ce produit et mets "estime": true.
3) Portion conseillée en g si indiquée.
Réponds UNIQUEMENT en JSON : {"name":"","brand":"","barcode":"chiffres ou vide","servingG":nombre ou null,"estime":false,"per100":{"kcal":n,"p":n,"c":n,"f":n,"fib":n,"sugar":n,"satfat":n,"salt":n}}`, blobs);
}
