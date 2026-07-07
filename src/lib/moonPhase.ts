export interface MoonPhaseInfo {
  name: string;
  lunarDayLabel: string;
  pathD: string;
  isFullMoon: boolean;
}

const LUNAR_DAY_MAP: Record<string, string> = {
  '1': '初一',
  '2': '初二',
  '3': '初三',
  '4': '初四',
  '5': '初五',
  '6': '初六',
  '7': '初七',
  '8': '初八',
  '9': '初九',
  '10': '初十',
  '11': '十一',
  '12': '十二',
  '13': '十三',
  '14': '十四',
  '15': '十五',
  '16': '十六',
  '17': '十七',
  '18': '十八',
  '19': '十九',
  '20': '二十',
  '21': '廿一',
  '22': '廿二',
  '23': '廿三',
  '24': '廿四',
  '25': '廿五',
  '26': '廿六',
  '27': '廿七',
  '28': '廿八',
  '29': '廿九',
  '30': '三十',
};

function getLunarDayLabel(date: Date): string {
  const formatted = new Intl.DateTimeFormat('zh-CN-u-ca-chinese', {
    day: 'numeric',
  }).format(date);
  const digits = formatted.replace(/[^\d]/g, '');
  return LUNAR_DAY_MAP[digits] ?? formatted;
}

export function calculateMoonPhaseInfo(date: Date): MoonPhaseInfo {
  const knownNewMoon = new Date(Date.UTC(2000, 0, 6, 18, 14, 0));
  const msPerDay = 24 * 60 * 60 * 1000;
  const synodicPeriod = 29.530588853;
  const diffDays = (date.getTime() - knownNewMoon.getTime()) / msPerDay;
  const phaseFraction = (diffDays / synodicPeriod) % 1;
  const age =
    (phaseFraction < 0 ? phaseFraction + 1 : phaseFraction) * synodicPeriod;

  let name = '';
  const lunarDayLabel = getLunarDayLabel(date);
  let pathD = '';
  let isFullMoon = false;

  if (age < 1.5 || age >= 28.0) {
    name = '新月 (朔)';
    pathD = 'M 12 12 m -10 0 a 10 10 0 1 0 20 0 a 10 10 0 1 0 -20 0';
  } else if (age < 6.5) {
    name = '蛾眉新月';
    pathD = 'M 12,2 A 10,10 0 0,1 12,22 A 6.5,10 0 0,1 12,2 Z';
  } else if (age < 8.5) {
    name = '上弦月';
    pathD = 'M 12,2 A 10,10 0 0,1 12,22 Z';
  } else if (age < 13.5) {
    name = '盈凸月';
    pathD = 'M 12,2 A 10,10 0 0,1 12,22 A 6.5,10 0 0,0 12,2 Z';
  } else if (age < 16.5) {
    name = '望日满月';
    pathD = 'M 12,12 m -10 0 a 10 10 0 1 0 20 0 a 10 10 0 1 0 -20 0';
    isFullMoon = true;
  } else if (age < 21.5) {
    name = '亏凸月';
    pathD = 'M 12,2 A 10,10 0 0,0 12,22 A 6.5,10 0 0,1 12,2 Z';
  } else if (age < 23.5) {
    name = '下弦月';
    pathD = 'M 12,2 A 10,10 0 0,0 12,22 Z';
  } else {
    name = '残月 (蛾眉)';
    pathD = 'M 12,2 A 10,10 0 0,0 12,22 A 6.5,10 0 0,0 12,2 Z';
  }

  return {name, lunarDayLabel, pathD, isFullMoon};
}
