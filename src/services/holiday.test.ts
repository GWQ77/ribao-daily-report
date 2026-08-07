import { describe, expect, it } from 'vitest'
import { holidayOf } from './holiday'

describe('holidayOf', () => {
  it('2026 国庆节放假', () => {
    expect(holidayOf('2026-10-01')).toEqual({ type: 'holiday', name: '国庆节' })
    expect(holidayOf('2026-10-07')).toEqual({ type: 'holiday', name: '国庆节' })
  })

  it('2026 国庆调休上班', () => {
    expect(holidayOf('2026-10-10')).toEqual({ type: 'workday', name: '调休上班' })
  })

  it('2026 春节放假及调休', () => {
    expect(holidayOf('2026-02-15')).toEqual({ type: 'holiday', name: '春节' })
    expect(holidayOf('2026-02-14')).toEqual({ type: 'workday', name: '调休上班' })
  })

  it('2025 国庆中秋合并放假', () => {
    expect(holidayOf('2025-10-01')).toEqual({ type: 'holiday', name: '国庆·中秋' })
    expect(holidayOf('2025-10-08')).toEqual({ type: 'holiday', name: '国庆·中秋' })
  })

  it('普通工作日返回 null', () => {
    expect(holidayOf('2026-08-07')).toBeNull()
    expect(holidayOf('2026-10-08')).toBeNull()
  })
})
