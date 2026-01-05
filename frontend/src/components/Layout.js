import React from "react";
import Navbar from "./Navbar";

const Layout = ({ children }) => (
  <div className="flex min-h-screen flex-col bg-slate-50">
    <Navbar />
    <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mt-16">
      {children}
    </main>
  </div>
);

export default Layout;
