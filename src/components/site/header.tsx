"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { X } from "lucide-react";

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <>
      <header className="bg-white border-b border-black">
        <nav className="flex items-center justify-between px-4 py-3 md:px-6 h-[56px]">
          <Link href="/" className="text-h1-extrabold" onClick={closeMenu}>
            BELTECHI
          </Link>

          <div className="hidden items-center gap-4 md:flex">
            <Link
              href="/"
              className="text-body-bold text-black transition-opacity hover:opacity-70"
            >
              Portfolio
            </Link>
            <Link
              href="/about"
              className="text-body-bold text-black transition-opacity hover:opacity-70"
            >
              About
            </Link>
            <Link
              href="/contact"
              className="text-body-bold text-black transition-opacity hover:opacity-70"
            >
              Hire me
            </Link>
          </div>

          <button
            className="text-body-bold text-black md:hidden"
            onClick={() => setMenuOpen(true)}
          >
            Menu
          </button>
        </nav>
      </header>

      {menuOpen && (
        <div className="fixed inset-0 z-[100] bg-white md:hidden">
          <div className="flex items-center justify-between px-4 h-[56px] border-b border-black">
            <Link href="/" className="text-h1-extrabold" onClick={closeMenu}>
              BELTECHI
            </Link>
            <button onClick={closeMenu} className="p-2" aria-label="Close menu">
              <X className="size-6 text-black" strokeWidth={2} />
            </button>
          </div>

          <div className="flex flex-col items-center justify-center gap-4 h-[calc(100vh-56px)]">
            <Link
              href="/"
              className="text-body-bold text-black transition-opacity hover:opacity-70"
              onClick={closeMenu}
            >
              Portfolio
            </Link>
            <Link
              href="/about"
              className="text-body-bold text-black transition-opacity hover:opacity-70"
              onClick={closeMenu}
            >
              About
            </Link>
            <Link
              href="/contact"
              className="text-body-bold text-black transition-opacity hover:opacity-70"
              onClick={closeMenu}
            >
              Hire me
            </Link>
          </div>
        </div>
      )}
    </>
  );
}






