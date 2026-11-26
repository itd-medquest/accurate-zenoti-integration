'use client';

import { useEffect, useState } from 'react';

export const dashboardMessages = [
  'Halo! Siap bikin hari ini jadi lebih produktif?',
  'Semangat! Satu per satu, semua pasti beres.',
  'Welcome back! Yuk, lanjutkan progres kerenmu hari ini.',
  'Hari baru, semangat baru. Mau mulai dari mana?',
  'Pelan-pelan aja, yang penting terus ada progres!',
  'Ada banyak hal seru yang bisa diselesaikan hari ini. Yuk, mulai!',
  'Kerja bagus sejauh ini! Yuk, lanjutkan momentumnya.',
  'Mulai dari yang kecil dulu. Siapa tahu hasilnya luar biasa!',
  'Semoga hari ini lancar, tugas beres, dan mood tetap bagus!',
  'Senang lihat kamu lagi! Siap bikin sesuatu yang hebat hari ini?'
] as const;

export function DashboardGreeting() {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    let previous = -1;
    try {
      previous = Number(sessionStorage.getItem('intgrte-last-greeting') ?? '-1');
    } catch {
      /* Storage is optional. */
    }
    const choices = dashboardMessages.map((_, i) => i).filter((i) => i !== previous);
    const next = choices[Math.floor(Math.random() * choices.length)];
    setIndex(next);
    try {
      sessionStorage.setItem('intgrte-last-greeting', String(next));
    } catch {
      /* Storage is optional. */
    }
  }, []);
  return <span data-slot="dashboard-greeting">{dashboardMessages[index]}</span>;
}
