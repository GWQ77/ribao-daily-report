import type { GlobalThemeOverrides } from 'naive-ui'

const fontStack =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI Variable Text', 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif"

const light: GlobalThemeOverrides = {
  common: {
    fontFamily: fontStack,
    primaryColor: '#0071e3',
    primaryColorHover: '#1d7ef0',
    primaryColorPressed: '#0062c4',
    primaryColorSuppl: '#1d7ef0',
    infoColor: '#0071e3',
    infoColorHover: '#1d7ef0',
    successColor: '#34c759',
    warningColor: '#ff9500',
    errorColor: '#ff3b30',
    borderRadius: '10px',
    borderRadiusSmall: '8px',
    textColorBase: '#1c1c1e',
    textColor1: '#1c1c1e',
    textColor2: '#48484a',
    textColor3: '#78787d',
    bodyColor: 'transparent',
    cardColor: 'rgba(255,255,255,0.62)',
    modalColor: 'rgba(255,255,255,0.68)',
    popoverColor: 'rgba(255,255,255,0.72)',
    borderColor: 'rgba(255,255,255,0.5)',
    dividerColor: 'rgba(0,0,0,0.08)',
    hoverColor: 'rgba(0,0,0,0.05)',
    pressedColor: 'rgba(0,0,0,0.09)',
    inputColor: 'rgba(255,255,255,0.55)',
    tableHeaderColor: 'rgba(0,0,0,0.03)',
  },
}

const dark: GlobalThemeOverrides = {
  common: {
    fontFamily: fontStack,
    primaryColor: '#0a84ff',
    primaryColorHover: '#3395ff',
    primaryColorPressed: '#0969d6',
    primaryColorSuppl: '#3395ff',
    infoColor: '#0a84ff',
    infoColorHover: '#3395ff',
    successColor: '#30d158',
    warningColor: '#ff9f0a',
    errorColor: '#ff453a',
    borderRadius: '10px',
    borderRadiusSmall: '8px',
    textColorBase: '#f5f5f7',
    textColor1: '#f5f5f7',
    textColor2: '#b0b0b6',
    textColor3: '#8e8e93',
    bodyColor: 'transparent',
    cardColor: 'rgba(32,32,36,0.6)',
    modalColor: 'rgba(30,30,35,0.66)',
    popoverColor: 'rgba(34,34,40,0.72)',
    borderColor: 'rgba(255,255,255,0.12)',
    dividerColor: 'rgba(255,255,255,0.1)',
    hoverColor: 'rgba(255,255,255,0.06)',
    pressedColor: 'rgba(255,255,255,0.1)',
    inputColor: 'rgba(255,255,255,0.07)',
    tableHeaderColor: 'rgba(255,255,255,0.05)',
  },
}

export function themeOverrides(isDark: boolean): GlobalThemeOverrides {
  return isDark ? dark : light
}
