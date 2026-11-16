const jakartaHour = new Intl.DateTimeFormat('en-GB', {
  hour: 'numeric',
  hourCycle: 'h23',
  timeZone: 'Asia/Jakarta',
});

export function greetingAt(date: Date) {
  const hour = Number(jakartaHour.format(date));
  if (hour >= 5 && hour < 11) return 'Selamat pagi';
  if (hour >= 11 && hour < 18) return 'Selamat siang';
  return 'Selamat malam';
}
