import {ShieldIcon, FileTextIcon, MailIcon, LayoutDashboard } from "lucide-react";
import { workspaceUrl } from "@/utils/urlConfig";
import Link from "next/link";

interface FooterProps {
  className?: string;
}
const Footer = ({ className }: FooterProps) => {
  return (
    <>
    <footer className={`mt-12 border-t ${className}`}>
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="text-center">
        {/* Branding Section */}
        <div className="flex flex-col items-center space-y-4">
          <div className="flex items-center space-x-3">
            <Link href={workspaceUrl(".")} className="flex items-center space-x-2">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-violet-800 shadow-md hover:ring-2 hover:ring-violet-500 hover:ring-offset-2 transition-all duration-200">
                <LayoutDashboard className="h-6 w-6 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-left text-gray-400">Forms Builder powered by</span>
                <h3 className="text-xl font-semibold text-gray-800">
                  <span className="bg-gradient-to-r from-indigo-600 to-violet-800 bg-clip-text text-transparent">
                    Duluin Workspace
                  </span>
                </h3>
              </div>
            </Link>
          </div>
          {/* <p className="max-w-md text-sm text-gray-500">
            Build beautiful tools with our intuitive platform. Your data is always secure and confidential.
          </p> */}
        </div>


      {/* Navigation Links */}
      {/* <div className="mb-8">
        <nav className="flex flex-wrap justify-center gap-6">
          <a href="#" className="text-sm font-medium text-gray-500 transition hover:text-indigo-600">
            Features
          </a>
          <a href="#" className="text-sm font-medium text-gray-500 transition hover:text-indigo-600">
            Pricing
          </a>
          <a href="#" className="text-sm font-medium text-gray-500 transition hover:text-indigo-600">
            Documentation
          </a>
          <a href="#" className="text-sm font-medium text-gray-500 transition hover:text-indigo-600">
            Guides
          </a>
          <a href="#" className="text-sm font-medium text-gray-500 transition hover:text-indigo-600">
            Status
          </a>
        </nav>
      </div> */}

      {/* Social/Utility Links */}
      {/* <div className="flex justify-center space-x-6">
        <a href="#" className="text-gray-400 hover:text-indigo-600 transition" aria-label="Privacy">
          <ShieldIcon className="h-5 w-5" />
        </a>
        <a href="#" className="text-gray-400 hover:text-indigo-600 transition" aria-label="Terms">
          <FileTextIcon className="h-5 w-5" />
        </a>
        <a href="#" className="text-gray-400 hover:text-indigo-600 transition" aria-label="Contact">
          <MailIcon className="h-5 w-5" />
        </a>
      </div> */}

      {/* Copyright */}
      <div className="mt-2 border-t border-gray-100 pt-4">
        <p className="text-xs text-gray-500">
          © {new Date().getFullYear()} Duluin Workspace. All rights reserved.
        </p>
        {/* <div className="mt-2 flex justify-center space-x-4 text-xs">
          <a href="#" className="text-gray-500 hover:text-indigo-600 transition">
            Privacy Policy
          </a>
          <a href="#" className="text-gray-500 hover:text-indigo-600 transition">
            Terms of Service
          </a>
          <a href="#" className="text-gray-500 hover:text-indigo-600 transition">
            Cookies
          </a>
        </div> */}
      </div>
    </div>
  </div>
</footer>
    </>
  )
};

export default Footer;
