/**
 * 轻量 Markdown → HTML（用于打印 / PDF 渲染）。
 * 覆盖日报常用语法：标题、列表、任务、粗斜体、链接、行内代码、代码块、引用、表格、分隔线。
 */
export function mdToHtml(md: string): string {
  const lines = md.replace(/\r\n/g, '\n').split('\n')
  const out: string[] = []
  let list: string[] | null = null
  let code: string[] | null = null
  let para: string[] = []

  const flushPara = () => {
    if (para.length) {
      out.push(`<p>${inline(para.join(' '))}</p>`)
      para = []
    }
  }
  const flushList = () => {
    if (list) {
      out.push(`<${list[0]}>${list.slice(1).join('')}</${list[0]}>`)
      list = null
    }
  }

  for (const raw of lines) {
    const line = raw

    // 代码块
    if (code) {
      if (/^```/.test(line)) {
        out.push(`<pre><code>${esc(code.join('\n'))}</code></pre>`)
        code = null
        continue
      }
      code.push(line)
      continue
    }
    if (/^```/.test(line)) {
      flushPara()
      flushList()
      code = []
      continue
    }

    const trimmed = line.trim()

    // 空行
    if (!trimmed) {
      flushPara()
      flushList()
      continue
    }

    // 分隔线
    if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(trimmed)) {
      flushPara()
      flushList()
      out.push('<hr/>')
      continue
    }

    // 标题
    const h = trimmed.match(/^(#{1,6})\s+(.*)$/)
    if (h) {
      flushPara()
      flushList()
      const lv = h[1].length
      out.push(`<h${lv}>${inline(h[2])}</h${lv}>`)
      continue
    }

    // 任务列表
    const task = trimmed.match(/^[-*+]\s+\[([ xX])\]\s+(.*)$/)
    if (task) {
      flushPara()
      if (!list || list[0] !== 'ul') {
        flushList()
        list = ['ul']
      }
      const done = task[1].toLowerCase() === 'x'
      list.push(
        `<li><span class="task" style="opacity:${done ? 0.55 : 1}">${done ? '☑' : '☐'} ${inline(task[2])}</span></li>`,
      )
      continue
    }

    // 无序/有序列表
    const ul = trimmed.match(/^[-*+]\s+(.*)$/)
    if (ul) {
      flushPara()
      if (!list || list[0] !== 'ul') {
        flushList()
        list = ['ul']
      }
      list.push(`<li>${inline(ul[1])}</li>`)
      continue
    }
    const ol = trimmed.match(/^\d+[.、]\s+(.*)$/)
    if (ol) {
      flushPara()
      if (!list || list[0] !== 'ol') {
        flushList()
        list = ['ol']
      }
      list.push(`<li>${inline(ol[1])}</li>`)
      continue
    }

    // 引用
    const qt = trimmed.match(/^>\s?(.*)$/)
    if (qt) {
      flushPara()
      flushList()
      out.push(`<blockquote>${inline(qt[1])}</blockquote>`)
      continue
    }

    // 表格
    if (trimmed.startsWith('|') && line.includes('|')) {
      flushPara()
      flushList()
      const row = trimmed.split('|').filter((x) => x !== '').map((c) => c.trim())
      // 分隔行（---）跳过
      if (row.every((c) => /^:?-{2,}:?$/.test(c))) continue
      out.push(`<p class="table-row">${row.map((c) => inline(c)).join(' · ')}</p>`)
      continue
    }

    // 普通段落（支持多行合并）
    para.push(trimmed)
  }

  flushPara()
  flushList()
  if (code) out.push(`<pre><code>${esc(code.join('\n'))}</code></pre>`)
  return out.join('\n')
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function inline(s: string): string {
  return esc(s)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/_([^_]+)_/g, '<em>$1</em>')
    .replace(/~~([^~]+)~~/g, '<del>$1</del>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
}
