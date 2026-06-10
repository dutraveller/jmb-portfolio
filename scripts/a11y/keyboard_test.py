#!/usr/bin/env python3
"""
Testa a navegação por teclado em cada página usando Playwright.
Verifica: ordem de foco, indicadores visuais, nomes acessíveis, tamanhos de alvo.

Instalação (uma vez):
    pip install playwright && playwright install chromium

Uso:
    python scripts/a11y/keyboard_test.py
    python scripts/a11y/keyboard_test.py http://localhost:3333/index.html
"""
import sys
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
from playwright.sync_api import sync_playwright

DEFAULT_URLS = [
    "http://localhost:3333/index.html",
    "http://localhost:3333/caso-multibrand.html",
    "http://localhost:3333/caso-ux-research.html",
    "http://localhost:3333/caso-chat-ai.html",
    "http://localhost:3333/caso-gestao-turnos.html",
    "http://localhost:3333/caso-acessibilidade.html",
]

# JS executado no contexto da página para inspecionar o elemento com foco
FOCUS_JS = """() => {
    const el = document.activeElement;
    if (!el || el.tagName === 'BODY' || el.tagName === 'HTML') return null;
    const cs = window.getComputedStyle(el);

    // Verifica indicador de foco: outline >= 2px, box-shadow, ou border visível
    const outlineW = parseFloat(cs.outlineWidth) || 0;
    const outlineS = cs.outlineStyle;
    const hasShadow = cs.boxShadow !== 'none' && cs.boxShadow !== '';
    const hasOutline = outlineW >= 2 && outlineS !== 'none';

    // Nome acessível: aria-label > aria-labelledby > textContent > placeholder
    let name = el.getAttribute('aria-label') || '';
    if (!name) {
        const lbId = el.getAttribute('aria-labelledby');
        if (lbId) {
            name = (document.getElementById(lbId) || {}).textContent?.trim() || '';
        }
    }
    if (!name) {
        name = el.textContent?.trim().replace(/\\s+/g, ' ') || '';
    }
    if (!name) name = el.getAttribute('placeholder') || '';

    const rect = el.getBoundingClientRect();
    return {
        tag: el.tagName.toLowerCase(),
        name: name.slice(0, 80),
        role: el.getAttribute('role') || el.tagName.toLowerCase(),
        type: el.getAttribute('type') || null,
        hasVisibleFocus: hasOutline || hasShadow,
        outlineDetail: outlineW + 'px ' + outlineS,
        w: Math.round(rect.width),
        h: Math.round(rect.height),
        uid: el.tagName + ':' + (el.id || '') + ':' + (el.getAttribute('href') || '').slice(0, 40)
    };
}"""

INTERACTIVE_TAGS = {"a", "button", "input", "select", "textarea"}


def test_keyboard(page, url):
    print(f"\n{'━' * 60}")
    print(f"  {url.split('/')[-1]}")
    print(f"{'━' * 60}")

    page.goto(url, wait_until="domcontentloaded")

    visited_uids = []
    elements = []
    issues = []

    for _ in range(120):
        page.keyboard.press("Tab")
        el = page.evaluate(FOCUS_JS)
        if not el:
            continue

        # Detecta ciclo (voltou ao início da ordem de foco)
        if el["uid"] in visited_uids[:4] and len(visited_uids) > 12:
            print(f"\n  ↩  Ciclo detectado — {len(elements)} elementos focáveis encontrados")
            break

        visited_uids.append(el["uid"])
        elements.append(el)

        # Problema 1: sem indicador de foco visível (WCAG 2.4.11)
        if not el["hasVisibleFocus"]:
            issues.append(
                f"  ✗ [2.4.11] SEM FOCO VISÍVEL — #{len(elements)} "
                f"<{el['tag']}> \"{el['name'][:45]}\""
            )

        # Problema 2: elemento interactivo sem nome acessível (WCAG 4.1.2)
        if not el["name"].strip() and el["tag"] in INTERACTIVE_TAGS:
            issues.append(
                f"  ✗ [4.1.2] SEM NOME ACESSÍVEL — #{len(elements)} <{el['tag']}>"
            )

        # Problema 3: alvo abaixo de 24×24 px (WCAG 2.5.8)
        if el["w"] < 24 or el["h"] < 24:
            issues.append(
                f"  ✗ [2.5.8] ALVO PEQUENO ({el['w']}×{el['h']}px) — "
                f"#{len(elements)} <{el['tag']}> \"{el['name'][:30]}\""
            )

    # Imprime ordem de foco
    print(f"\n  Tab order — {len(elements)} elementos:\n")
    for i, el in enumerate(elements, 1):
        indicator = "✓" if el["hasVisibleFocus"] else "✗"
        name = el["name"][:52] or "[sem nome]"
        print(f"  {i:3}.  [{indicator}]  {el['tag']:<10}  {name}")

    # Imprime problemas
    if issues:
        print(f"\n  Problemas encontrados ({len(issues)}):\n")
        for iss in issues:
            print(iss)
    else:
        print(f"\n  ✓ Sem problemas de teclado")

    return issues


def main():
    urls = sys.argv[1:] if len(sys.argv) > 1 else DEFAULT_URLS
    total_issues = []

    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()

        for url in urls:
            try:
                issues = test_keyboard(page, url)
                total_issues.extend(issues)
            except Exception as e:
                print(f"\n  ERRO em {url}: {e}")

        browser.close()

    print(f"\n{'━' * 60}")
    print(f"  RESUMO TECLADO: {len(total_issues)} problema(s) no total")
    print(f"{'━' * 60}\n")


if __name__ == "__main__":
    main()
