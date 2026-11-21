import asyncio
from playwright.async_api import async_playwright
TXT = """Voici 2 options.
🍽️ Bol de skyr, avoine et fruits rouges | bowl of skyr with oats and berries
1. Mélanger.
🍽️ Poêlée de poulet, riz et poivrons | chicken strips with rice and peppers
1. Cuire."""
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
    pg = await b.new_page(viewport={"width":430,"height":932}); errs=[]; calls=[]
    pg.on("pageerror", lambda e: errs.append("PAGEERR "+str(e)))
    async def handle(route):
      calls.append((route.request.headers.get("authorization","")[:10], route.request.url[:60]))
      await route.fulfill(path="/tmp/fake.jpg", content_type="image/jpeg")
    await pg.route("https://gen.pollinations.ai/**", handle)
    await pg.goto("http://localhost:8765/dev/dist/index.html"); await pg.wait_for_timeout(1500)
    # sans clé
    await pg.evaluate("S.aiOut.today = `%s`; S.tab='today'; render()" % TXT); await pg.wait_for_timeout(1500)
    print("sans clé:", await pg.evaluate("JSON.stringify(DI.state)+' '+DI.why"))
    await pg.evaluate("Store.set('settings', Object.assign({}, aiSettings(), {pollKey:'sk_TESTFAKE'})); Object.keys(DI.state).forEach(k=>delete DI.state[k]); render()")
    await pg.wait_for_timeout(3000)
    print("avec clé:", await pg.evaluate("JSON.stringify(DI.state)"), calls)
    el = await pg.query_selector(".ai-out"); await el.screenshot(path="d2_today.png")
    await pg.click(".dimg-wide"); await pg.wait_for_timeout(600); await pg.screenshot(path="d2_sheet.png")
    await pg.evaluate("closeSheet(); S.tab='profile'; render()"); await pg.wait_for_timeout(500)
    c = await pg.query_selector("#pollKey"); await c.scroll_into_view_if_needed(); await pg.screenshot(path="d2_profile.png")
    print("\n".join(errs) or "no errors"); await b.close()
asyncio.run(main())
