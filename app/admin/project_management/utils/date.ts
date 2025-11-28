export const parseDate = (dateStr: string) => {
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  return d;
};

export const formatDate = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const getDaysDiff = (start: Date, end: Date) => {
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.round((end.getTime() - start.getTime()) / oneDay);
};

export const getWeekLabel = (date: Date) => {
  const month = date.getMonth() + 1;
  const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  const offsetDate = date.getDate() + firstDayOfMonth.getDay() - 1;
  const weekNum = Math.floor(offsetDate / 7) + 1;
  return `${month}월 ${weekNum}주`;
};

export const getStartOfWeek = (date: Date) => {
  const day = date.getDay();
  const diff = date.getDate() - day;
  const result = new Date(date);
  result.setDate(diff);
  result.setHours(0, 0, 0, 0);
  return result;
};

export const generateWeeks = (startDateStr: string, numWeeks = 60, today: Date) => {
  const weeks = [];
  const current = parseDate(startDateStr);
  const todayTime = today.getTime();
  for (let i = 0; i < numWeeks; i++) {
    const start = new Date(current);
    const end = new Date(current);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    const startTime = start.getTime();
    const endTime = end.getTime();
    const isTodayWeek = todayTime >= startTime && todayTime <= endTime;
    weeks.push({
      id: i,
      label: getWeekLabel(start),
      subLabel: `${start.getMonth()+1}.${start.getDate()} ~ ${end.getMonth()+1}.${end.getDate()}`,
      start,
      end,
      isTodayWeek,
    });
    current.setDate(current.getDate() + 7);
  }
  return weeks;
};

export const generateDays = (startDateStr: string, numDays = 120, today: Date) => {
  const days = [];
  const current = parseDate(startDateStr);
  const todayStr = formatDate(today);
  for (let i = 0; i < numDays; i++) {
    const start = new Date(current);
    const end = new Date(current);
    end.setHours(23, 59, 59, 999);
    days.push({
      id: i,
      label: `${start.getMonth() + 1}/${start.getDate()}`,
      subLabel: ['일', '월', '화', '수', '목', '금', '토'][start.getDay()],
      start,
      end,
      isTodayWeek: formatDate(start) === todayStr
    });
    current.setDate(current.getDate() + 1);
  }
  return days;
};
