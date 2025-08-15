// src/components/Header.tsx
'use client';
import Link from 'next/link';

export default function Header() {
  return (
    <header className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
      <Link href="/" className="font-bold text-xl">DepthGuard</Link>
      <nav className="flex gap-6 text-blue-400">
        <Link href="/pricing">Pricing</Link>
        <Link href="/dashboard">Dashboard</Link>
      </nav>
    </header>
  );
}
