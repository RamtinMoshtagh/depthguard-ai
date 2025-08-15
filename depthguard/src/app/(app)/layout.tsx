import Link from 'next/link';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <header className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
        <nav className="flex gap-6 text-blue-400">

        </nav>
      </header>
      <main className="max-w-6xl mx-auto px-6">{children}</main>
    </div>
  );
}
