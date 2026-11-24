import { Outlet } from 'react-router-dom';
import Navbar from './Navbar.jsx';

export default function AppLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <Outlet />
      </main>
      <footer className="border-t border-zinc-200/80 py-6 text-center text-xs text-zinc-400">
        DeskFolio · notes, classes and verified ratings in one place
      </footer>
    </div>
  );
}
