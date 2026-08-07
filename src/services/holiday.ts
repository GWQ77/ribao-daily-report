/** 法定节假日标注
 * holiday = 放假；workday = 调休上班。
 * 数据来源：国务院办公厅历年《关于部分节假日安排的通知》，
 * 2025：国办发明电〔2024〕12号；2026：国办发明电〔2025〕7号。
 */
export interface HolidayInfo {
  type: 'holiday' | 'workday'
  name: string
}

interface HolidayRange {
  type: 'holiday' | 'workday'
  name: string
  from: string
  to: string
}

const HOLIDAYS: HolidayRange[] = [
  /* ---------------- 2025 ---------------- */
  { type: 'holiday', name: '元旦', from: '2025-01-01', to: '2025-01-01' },
  { type: 'workday', name: '调休上班', from: '2025-01-26', to: '2025-01-26' },
  { type: 'holiday', name: '春节', from: '2025-01-28', to: '2025-02-04' },
  { type: 'workday', name: '调休上班', from: '2025-02-08', to: '2025-02-08' },
  { type: 'holiday', name: '清明节', from: '2025-04-04', to: '2025-04-06' },
  { type: 'workday', name: '调休上班', from: '2025-04-27', to: '2025-04-27' },
  { type: 'holiday', name: '劳动节', from: '2025-05-01', to: '2025-05-05' },
  { type: 'holiday', name: '端午节', from: '2025-05-31', to: '2025-06-02' },
  { type: 'workday', name: '调休上班', from: '2025-09-28', to: '2025-09-28' },
  { type: 'holiday', name: '国庆·中秋', from: '2025-10-01', to: '2025-10-08' },
  { type: 'workday', name: '调休上班', from: '2025-10-11', to: '2025-10-11' },

  /* ---------------- 2026 ---------------- */
  { type: 'holiday', name: '元旦', from: '2026-01-01', to: '2026-01-03' },
  { type: 'workday', name: '调休上班', from: '2026-01-04', to: '2026-01-04' },
  { type: 'workday', name: '调休上班', from: '2026-02-14', to: '2026-02-14' },
  { type: 'holiday', name: '春节', from: '2026-02-15', to: '2026-02-23' },
  { type: 'workday', name: '调休上班', from: '2026-02-28', to: '2026-02-28' },
  { type: 'holiday', name: '清明节', from: '2026-04-04', to: '2026-04-06' },
  { type: 'holiday', name: '劳动节', from: '2026-05-01', to: '2026-05-05' },
  { type: 'workday', name: '调休上班', from: '2026-05-09', to: '2026-05-09' },
  { type: 'holiday', name: '端午节', from: '2026-06-19', to: '2026-06-21' },
  { type: 'workday', name: '调休上班', from: '2026-09-20', to: '2026-09-20' },
  { type: 'holiday', name: '中秋节', from: '2026-09-25', to: '2026-09-27' },
  { type: 'holiday', name: '国庆节', from: '2026-10-01', to: '2026-10-07' },
  { type: 'workday', name: '调休上班', from: '2026-10-10', to: '2026-10-10' },
]

/** 查询某日期（YYYY-MM-DD）的节假日信息；非特殊日期返回 null */
export function holidayOf(dateKey: string): HolidayInfo | null {
  for (const h of HOLIDAYS) {
    if (dateKey >= h.from && dateKey <= h.to) {
      return { type: h.type, name: h.name }
    }
  }
  return null
}
