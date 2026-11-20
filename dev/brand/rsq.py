import asyncio
from playwright.async_api import async_playwright
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
    pg=await b.new_page(viewport={"width":1024,"height":1024})
    await pg.goto("file:///home/claude/app/brand/logo-square.svg")
    await pg.screenshot(path="/home/claude/ios/MuscuApp/Muscu/Assets.xcassets/AppIcon.appiconset/AppIcon-1024.png")
    await b.close()
asyncio.run(main())
