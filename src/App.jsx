import React from 'react';
import Dashboard from './components/Dashboard';
import FileBrowser from './components/FileBrowser';
import PasswordModal from './components/PasswordModal';

export default function App() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#000f9b] via-[#eb0000] to-[#a000eb] bg-opacity-10">
      <div className="w-full max-w-4xl p-8 rounded-2xl shadow-xl backdrop-blur-md bg-white/10 border border-white/20">
        <Dashboard />
        <FileBrowser />
      </div>
      <PasswordModal />
    </div>
  );
}
