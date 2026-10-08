import { chromium } from '@playwright/test'
import { readFile, writeFile } from 'node:fs/promises'

const source = await readFile(new URL('../public/icons/forge.svg', import.meta.url), 'utf8')
const browser = await chromium.launch()
try {
  const page = await browser.newPage()
  for (const [filename, size] of [['forge-192.png', 192], ['forge-512.png', 512], ['forge-maskable-512.png', 512], ['apple-touch-icon.png', 180]]) {
    await page.setViewportSize({ width: size, height: size })
    await page.setContent(`<style>body{margin:0}svg{display:block;width:100vw;height:100vh}</style>${source}`)
    const png = await page.screenshot({ omitBackground: false })
    await writeFile(new URL(`../public/icons/${filename}`, import.meta.url), png)
  }
} finally { await browser.close() }
