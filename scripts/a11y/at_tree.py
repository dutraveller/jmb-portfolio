#!/usr/bin/env python3
"""
Inspeciona a árvore de acessibilidade (AT) de cada página usando Playwright.
Produz o que VoiceOver / NVDA / JAWS anunciaria e assinala problemas estruturais.

NOTA: Este script NÃO conduz o VoiceOver directamente (isso exige macOS e o
VoiceOver em execução). Inspecciona a árvore AT que os leitores de ecrã
consomem — equivalente programático para detectar erros de estrutura:
nomes em falta, roles errados, headings vazios, imagens sem descrição.

Instalação (uma vez):
    pip install playwright && playwright install chromium

Uso:
    python scripts/a11y/at_tree.py
    python scripts/a11y/at_tree.py http://localhost:3333/index.html
"""
import sys
import warnings
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
warnings.filterwarnings("ignore", category=DeprecationWarning)

from playwright.sync_api import sync_playwright

DEFAULT_URLS = [
    "http://localhost:3333/index.html",
    "http://localhost:3333/caso-multibrand.html",
    "http://localhost:3333/caso-ux-research.html",
    "http://localhost:3333/caso-chat-ai.html",
    "http://localhost:3333/caso-gestao-turnos.html",
    "http://localhost:3333/caso-acessibilidade.html",
]

# Roles com representação no anúncio de leitor de ecrã
ROLE_LABEL = {
    "heading":     "H{level}",
    "link":        "→ Link",
    "button":      "◉ Botão",
    "img":         "🖼 Imagem",
    "textbox":     "▭ Campo de texto",
    "checkbox":    "☐ Caixa de verificação",
    "radio":       "◎ Botão de rádio",
    "combobox":    "▾ Selecção",
    "listbox":     "▾ Lista",
    "list":        "≡ Lista",
    "listitem":    "  •",
    "navigation":  "── [nav]",
    "banner":      "── [header]",
    "main":        "── [main]",
    "contentinfo": "── [footer]",
    "dialog":      "── [diálogo]",
    "alert":       "⚠ [alerta]",
    "form":        "── [formulário]",
    "region":      "── [secção]",
    "article":     "── [artigo]",
}

INTERACTIVE_ROLES = {
    "link", "button", "textbox", "checkbox", "radio",
    "combobox", "menuitem", "tab", "switch", "spinbutton", "slider",
}

SKIP_ROLES = {"none", "presentation"}


def walk(node, depth=0, issues=None, heading_levels=None):
    if issues is None:
        issues = []
    if heading_levels is None:
        heading_levels = []

    if not node:
        return issues

    role = node.get("role") or ""
    name = (node.get("name") or "").strip()
    level = node.get("level")
    children = node.get("children") or []

    if role not in SKIP_ROLES:
        tmpl = ROLE_LABEL.get(role)
        if tmpl:
            label = tmpl.format(level=level or "?") if "{level}" in tmpl else tmpl
            if name:
                announcement = f"{'  ' * depth}{label}  \"{name}\""
            elif role in INTERACTIVE_ROLES or role == "img":
                announcement = f"{'  ' * depth}{label}  [sem nome ⚠]"
            else:
                announcement = f"{'  ' * depth}{label}"
            print(announcement)

        # --- Detectar problemas ---

        # Elemento interactivo sem nome (WCAG 4.1.2)
        if role in INTERACTIVE_ROLES and not name:
            issues.append({
                "severity": "Major",
                "wcag": "4.1.2",
                "msg": f"Elemento interactivo sem nome acessível",
                "detail": f"role={role}",
            })

        # Imagem sem texto alternativo (WCAG 1.1.1)
        if role == "img" and not name:
            issues.append({
                "severity": "Minor",
                "wcag": "1.1.1",
                "msg": "Imagem sem texto alternativo",
                "detail": "",
            })

        # Heading vazio (WCAG 2.4.6)
        if role == "heading" and not name:
            issues.append({
                "severity": "Major",
                "wcag": "2.4.6",
                "msg": f"Heading vazio",
                "detail": f"H{level or '?'}",
            })

        # Hierarquia de headings — detecta saltos (ex: H1 → H3)
        if role == "heading" and level:
            if heading_levels and level - heading_levels[-1] > 1:
                issues.append({
                    "severity": "Minor",
                    "wcag": "1.3.1",
                    "msg": f"Salto na hierarquia de headings: H{heading_levels[-1]} → H{level}",
                    "detail": f"título: \"{name[:60]}\"",
                })
            heading_levels.append(level)

    for child in children:
        walk(child, depth + 1, issues, heading_levels)

    return issues


def test_at(page, url):
    print(f"\n{'━' * 60}")
    print(f"  ÁRVORE AT — {url.split('/')[-1]}")
    print(f"  (o que VoiceOver / NVDA anunciaria em modo de documento)")
    print(f"{'━' * 60}\n")

    page.goto(url, wait_until="domcontentloaded")

    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        snapshot = page.accessibility.snapshot(interesting_only=False)

    if not snapshot:
        print("  Sem snapshot disponível.")
        return []

    issues = walk(snapshot)

    if issues:
        print(f"\n  Problemas AT ({len(issues)}):\n")
        for iss in issues:
            detail = f"  ({iss['detail']})" if iss["detail"] else ""
            print(f"  ✗ [{iss['severity']}] WCAG {iss['wcag']} — {iss['msg']}{detail}")
    else:
        print(f"\n  ✓ Nenhum problema na árvore AT")

    return issues


def main():
    urls = sys.argv[1:] if len(sys.argv) > 1 else DEFAULT_URLS
    total = []

    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()

        for url in urls:
            try:
                issues = test_at(page, url)
                total.extend(issues)
            except Exception as e:
                print(f"\n  ERRO em {url}: {e}")

        browser.close()

    print(f"\n{'━' * 60}")
    print(f"  RESUMO AT: {len(total)} problema(s) no total")
    print(f"{'━' * 60}\n")


if __name__ == "__main__":
    main()
