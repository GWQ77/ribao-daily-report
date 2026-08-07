import { describe, expect, it } from 'vitest'
import type { Diary } from '../types'
import { buildWeeklyReport, extractProblems, matchProject, parseEntry } from './weekly'

function mk(date: string, content: string): Diary {
  return {
    id: 1,
    date,
    content,
    mood: '',
    tags: [],
    created_at: '',
    updated_at: '',
  }
}

describe('parseEntry', () => {
  it('解析【】项目条目', () => {
    expect(parseEntry('1. 【燃气项目】部署后端')).toEqual({
      project: '燃气项目',
      content: '部署后端',
    })
  })

  it('支持中文顿号编号', () => {
    expect(parseEntry('2、【生命线项目】排查告警')).toEqual({
      project: '生命线项目',
      content: '排查告警',
    })
  })

  it('支持列表符号', () => {
    expect(parseEntry('- 【其他项目】协助数据治理')).toEqual({
      project: '其他项目',
      content: '协助数据治理',
    })
  })

  it('无【】归为其他项目并去掉编号', () => {
    expect(parseEntry('1. 协助数据治理')).toEqual({
      project: '其他项目',
      content: '协助数据治理',
    })
  })
})

describe('matchProject / 自动归类', () => {
  const rules = [
    { keyword: '燃气', project: '燃气项目' },
    { keyword: '生命线', project: '生命线项目' },
  ]

  it('按关键词自动归类，未命中归其他项目', () => {
    expect(matchProject('燃气监管平台部署', rules)).toBe('燃气项目')
    expect(matchProject('生命线系统排查告警', rules)).toBe('生命线项目')
    expect(matchProject('房屋系统部署', rules)).toBe('其他项目')
  })

  it('纯编号日报按规则自动归类', () => {
    const d = mk('2026-08-03', '1. 燃气监管平台后端部署发一版\n2. 生命线系统协助排查')
    const report = buildWeeklyReport([d], '2026-08-03', '2026-08-03', '张三', rules)
    expect(report.rows.map((r) => r.project)).toEqual(['燃气项目', '生命线项目'])
  })
})

describe('extractProblems', () => {
  it('提取「遇到的问题」段', () => {
    const content = [
      '## 今日完成',
      '',
      '1. 【燃气项目】部署后端',
      '',
      '## 遇到的问题',
      '',
      '- 日志轮转未生效',
      '- 已修复',
      '',
      '## 明日计划',
      '',
      '- 写日报',
    ].join('\n')
    expect(extractProblems(content)).toBe('日志轮转未生效\n已修复')
  })

  it('无问题段返回「无」', () => {
    expect(extractProblems('## 今日完成\n\n- 写日报')).toBe('无')
  })
})

describe('buildWeeklyReport', () => {
  it('同项目合并为一行并填充问题列', () => {
    const diaries = [
      mk(
        '2026-08-03',
        [
          '## 今日完成',
          '',
          '1. 【燃气项目】部署后端',
          '2. 【燃气项目】测试启动',
          '3. 【其他项目】协助排查',
          '',
          '## 遇到的问题',
          '',
          '- Nginx 配置 reload 报错，已修复',
        ].join('\n'),
      ),
      mk('2026-08-04', '## 今日完成\n\n- 【生命线项目】整理数据'),
    ]
    const report = buildWeeklyReport(diaries, '2026-08-03', '2026-08-04', '张三')
    expect(report.rows).toHaveLength(3)
    expect(report.rows[0]).toMatchObject({
      date: '2026-08-03',
      project: '燃气项目',
      content: '1. 部署后端\n2. 测试启动',
      problems: 'Nginx 配置 reload 报错，已修复',
      name: '张三',
    })
    expect(report.rows[1]).toMatchObject({ project: '其他项目', content: '1. 协助排查' })
    expect(report.rows[2]).toMatchObject({ project: '生命线项目', content: '1. 整理数据' })
  })

  it('今日完成段无条目时不混入标题', () => {
    const d = mk('2026-08-03', '## 今日完成\n\n## 遇到的问题\n\n- 无\n\n## 明日计划\n\n- 继续')
    const report = buildWeeklyReport([d], '2026-08-03', '2026-08-03')
    expect(report.rows).toHaveLength(0)
  })

  it('支持中文顿号无空格编号', () => {
    const d = mk('2026-08-03', '## 今日完成\n\n1、【燃气项目】部署后端')
    const report = buildWeeklyReport([d], '2026-08-03', '2026-08-03')
    expect(report.rows).toHaveLength(1)
    expect(report.rows[0]).toMatchObject({
      project: '燃气项目',
      content: '1. 部署后端',
    })
  })

  it('没有今日完成标题时编号行按项目合并', () => {
    const d = mk('2026-08-03', '1.部署后端\n2.测试启动\n3.协助排查')
    const report = buildWeeklyReport([d], '2026-08-03', '2026-08-03')
    expect(report.rows).toHaveLength(1)
    expect(report.rows[0].content).toBe('1. 部署后端\n2. 测试启动\n3. 协助排查')
    expect(report.rows[0].project).toBe('其他项目')
  })

  it('没有今日完成标题时列表行合并为一条', () => {
    const d = mk('2026-08-03', '## 今日\n\n- 维护服务器\n- 排查告警')
    const report = buildWeeklyReport([d], '2026-08-03', '2026-08-03')
    expect(report.rows.map((r) => r.content)).toEqual(['1. 维护服务器\n2. 排查告警'])
  })
})
