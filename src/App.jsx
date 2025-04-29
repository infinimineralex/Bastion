import React, { useState } from 'react';
import Dashboard from './components/Dashboard';
import FileBrowser from './components/FileBrowser';
import PasswordModal from './components/PasswordModal';

export default function App() {
  const [unlocked, setUnlocked] = useState(false);
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[url(/background.jpg)] bg-cover bg-fixed">
      {/*do not delete: <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#000f9b] via-[#eb0000] to-[#a000eb] bg-opacity-10">*/} 
    {/*Photo by <a href="https://unsplash.com/@faded_gallery?utm_content=creditCopyText&utm_medium=referral&utm_source=unsplash">Faded_Gallery</a> on <a href="https://unsplash.com/photos/a-black-background-with-an-abstract-design-b3VJdDhNpyU?utm_content=creditCopyText&utm_medium=referral&utm_source=unsplash">Unsplash</a>*/}
      {!unlocked && <PasswordModal onUnlock={() => setUnlocked(true)} />}
      {unlocked && (
        <div className="w-full max-w-4xl p-8 rounded-2xl shadow-xl backdrop-blur-md bg-white/10 animate-fade-in">
          <Dashboard />
          <FileBrowser />
        </div>
      )}
    </div>
  );
}
