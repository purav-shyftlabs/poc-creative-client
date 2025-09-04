"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const Navbar = () => {
    const pathname = usePathname();
    
    const getActiveTab = () => {
        if (pathname === "/") return "home";
        if (pathname === "/generate-content") return "generate-content";
        return "home";
    };
  return (
    <div className="border-b border-gray-200 bg-white sticky top-0 z-50">
    <div className="max-w-7xl mx-auto px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Link href="/" className={`text-md text-gray-900 flex items-center gap-x-12 ${getActiveTab() === "home" ? "text-black font-bold" : "text-gray-900"}`}>
            <img src="https://trycarter.com/images/carter-logo.svg" alt="Creative Studio" width={102} height={82} />
            Creative Studio
          </Link>
          <Link
            href="/generate-content"
            className={`text-md text-gray-900 flex items-center gap-x-12 ${getActiveTab() === "generate-content" ? "text-black font-bold" : "text-gray-900"}`}>
          
            Generate New Template
          </Link>
        </div>
        <div className="flex items-center space-x-4">
          
          <div className="flex items-center space-x-2 border border-gray-200 rounded-lg p-2 px-4 hover:bg-gray-100 transition-colors cursor-pointer">
            <div className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-medium">U</span>
            </div>
            <div className="text-sm text-gray-700 hover:text-black transition-colors">
              User
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  )
}

export default Navbar