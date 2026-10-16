#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
博客文章数据构建脚本（落实"内容与展示分离"）
  输入：
    - blog/md/*.md       新文章（front-matter 头 + Markdown 正文）
    - blog/posts/*.html  历史文章（HTML 正文 → 自动转 Markdown）
  输出：
    - blog/posts.js      window.POSTS，博客唯一内容数据源

新增文章两种方式：
  1. 推荐：在 blog/md/ 新建 .md（见 hypertension-grading.md 的头部格式），
     然后运行  python3 blog/tools/build_posts.py  重新生成本文件；
  2. 或直接在 posts.js 数组末尾按同样结构追加一条（body 为 Markdown）。
排序规则：date 倒序；同日按数组中的先后顺序（新文章在前）。
"""
import html as html_mod
import re
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent      # blog/
MD_DIR = BASE / "md"
HTML_DIR = BASE / "posts"
OUT = BASE / "posts.js"


# ---------------- front-matter 解析 ----------------
def parse_md(path):
    text = path.read_text(encoding="utf-8")
    m = re.match(r"^---\s*\n(.*?)\n---\s*\n(.*)$", text, re.S)
    if not m:
        raise ValueError(path.name + " 缺少 front-matter 头（--- ... ---）")
    head, body = m.group(1), m.group(2).strip()
    meta = {}
    for line in head.splitlines():
        if ":" in line:
            k, v = line.split(":", 1)
            meta[k.strip()] = v.strip()
    tags = [t.strip() for t in re.sub(r"^\[|\]$", "", meta.get("tags", "")).split(",") if t.strip()]
    return {
        "slug": meta["slug"], "title": meta["title"], "date": meta["date"],
        "tags": tags, "author": meta.get("author", "孟自力"),
        "summary": meta["summary"], "body": body,
    }


# ---------------- HTML → Markdown ----------------
def inline(s):
    s = re.sub(r'<a\s+[^>]*href="([^"]*)"[^>]*>(.*?)</a>', r"[\2](\1)", s, flags=re.S)
    s = re.sub(r"<strong>(.*?)</strong>", r"**\1**", s, flags=re.S)
    s = re.sub(r"<em>(.*?)</em>", r"*\1*", s, flags=re.S)
    s = re.sub(r"<br\s*/?>", "  \n", s)
    s = re.sub(r"<[^>]+>", "", s)
    s = html_mod.unescape(s)
    return re.sub(r"[ \t]+", " ", s).strip()


BLOCK = re.compile(
    r'<div class="casebox">.*?</div>'
    r'|<div class="note">.*?</div>'
    r"|<h2>.*?</h2>|<h3>.*?</h3>|<p[^>]*>.*?</p>"
    r"|<ul>.*?</ul>|<ol>.*?</ol>",
    re.S,
)


def list_md(chunk, ordered=False):
    items = re.findall(r"<li[^>]*>(.*?)</li>", chunk, flags=re.S)
    out = []
    for i, it in enumerate(items, 1):
        out.append((str(i) + ". " if ordered else "- ") + inline(it))
    return "\n".join(out)


def html_to_md(body):
    parts = []
    for m in BLOCK.finditer(body):
        chunk = m.group(0)
        if chunk.startswith('<div class="casebox">'):
            h3 = re.search(r"<h3>(.*?)</h3>", chunk, flags=re.S)
            ps = re.findall(r"<p[^>]*>(.*?)</p>", chunk, flags=re.S)
            seg = ("### " + inline(h3.group(1)) + "\n\n") if h3 else ""
            seg += "\n\n".join(inline(p) for p in ps)
            parts.append(seg)
        elif chunk.startswith('<div class="note">'):
            inner = re.sub(r'^<div class="note">|</div>$', "", chunk)
            parts.append("> " + inline(inner))
        elif chunk.startswith("<h2>"):
            parts.append("## " + inline(chunk))
        elif chunk.startswith("<h3>"):
            parts.append("### " + inline(chunk))
        elif chunk.startswith("<p"):
            parts.append(inline(chunk))
        elif chunk.startswith("<ul>"):
            parts.append(list_md(chunk))
        elif chunk.startswith("<ol>"):
            parts.append(list_md(chunk, ordered=True))
    return "\n\n".join(p for p in parts if p)


def parse_html_post(path):
    text = path.read_text(encoding="utf-8")

    def grab(pat, flags=0):
        m = re.search(pat, text, flags)
        return html_mod.unescape(m.group(1)).strip() if m else ""

    tag = grab(r'<span class="tag">(.*?)</span>')
    title = grab(r"<h1>(.*?)</h1>", re.S)
    date = grab(r"(\d{4}-\d{2}-\d{2})")
    lead = inline(grab(r'<p class="lead">(.*?)</p>', re.S))
    am = re.search(r'<div class="article">(.*?)\s*<a class="back"', text, re.S)
    body_raw = am.group(1) if am else ""
    body_raw = re.sub(r"</div>\s*$", "", body_raw.strip())
    body = html_to_md(body_raw)
    summary = lead if len(lead) <= 150 else lead[:147] + "…"
    return {
        "slug": path.stem, "title": title, "date": date,
        "tags": [tag] if tag else [], "author": "孟自力",
        "summary": summary, "body": body,
    }


# ---------------- JS 输出 ----------------
def js_str(s):
    return '"' + str(s).replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n") + '"'


def js_entry(p):
    tags = ", ".join(js_str(t) for t in p["tags"])
    body = str(p["body"]).replace("\\", "\\\\").replace("`", "\\`").replace("${", "\\${")
    return (
        "  {\n"
        "    slug: " + js_str(p["slug"]) + ",\n"
        "    title: " + js_str(p["title"]) + ",\n"
        "    date: " + js_str(p["date"]) + ",\n"
        "    tags: [" + tags + "],\n"
        "    author: " + js_str(p["author"]) + ",\n"
        "    summary: " + js_str(p["summary"]) + ",\n"
        "    body: `" + body + "`\n"
        "  }"
    )


def main():
    order = ["hypertension-grading", "cad-clinical-pathway",
             "arrhythmia-classification", "hf-pharmacotherapy", "dyslipidemia-management"]
    md_files = sorted(MD_DIR.glob("*.md"),
                      key=lambda p: order.index(p.stem) if p.stem in order else len(order))
    new = [parse_md(p) for p in md_files]
    old = [parse_html_post(p) for p in sorted(HTML_DIR.glob("*.html"))]
    posts = new + old
    lines = [
        "/* ============================================================",
        "   博客文章数据（唯一内容源 · 内容与展示分离）",
        "   - 新增文章：在 md/ 目录按 front-matter 格式新建 .md 后",
        "     运行 tools/build_posts.py 重新生成本文件；",
        "     或直接在本数组末尾按同样结构追加一条（body 为 Markdown）。",
        "   - 排序规则：按 date 倒序，同日按数组中顺序。",
        "   ============================================================ */",
        "window.POSTS = [",
        ",\n\n".join(js_entry(p) for p in posts),
        "];",
    ]
    OUT.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print("OK: %d new + %d migrated = %d posts -> %s" % (len(new), len(old), len(posts), OUT))


if __name__ == "__main__":
    main()
