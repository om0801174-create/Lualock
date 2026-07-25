import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LuaLock — Lua protection platform",
  description: "Protect, deploy, and manage your Lua scripts with confidence.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
