import React, { useState, useEffect } from 'react';

export default function PasswordModal() {
  const [mode, setMode] = useState('loading'); // 'create', 'verify', 'loading'
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    // Ask main process if master password is set
    window.electronAPI.send('check-master-password');
    window.electronAPI.receive('master-password-status', (exists) => {
      setMode(exists ? 'verify' : 'create');
    });
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (mode === 'create') {
      if (password.length < 8) {
        setError('Password must be at least 8 characters.');
        return;
      }
      if (password !== confirm) {
        setError('Passwords do not match.');
        return;
      }
      window.electronAPI.send('set-master-password', password);
    } else if (mode === 'verify') {
      window.electronAPI.send('verify-master-password', password);
    }
  };

  useEffect(() => {
    window.electronAPI.receive('master-password-result', (result) => {
      if (result === 'ok') {
        // Hide modal (could lift state up in real app)
        document.body.style.overflow = '';
        setMode('unlocked');
      } else {
        setError('Incorrect password.');
      }
    });
  }, []);

  if (mode === 'unlocked') return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-50">
      <form onSubmit={handleSubmit} className="bg-white/20 backdrop-blur-lg rounded-xl p-8 shadow-2xl border border-white/30 min-w-[320px]">
        <h3 className="text-xl font-bold text-white mb-4">
          {mode === 'create' ? 'Create Master Password' : mode === 'verify' ? 'Enter Master Password' : 'Loading...'}
        </h3>
        <input
          type="password"
          className="w-full p-2 rounded bg-white/30 text-white placeholder-white/60 mb-4"
          placeholder="Master password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          disabled={mode === 'loading'}
        />
        {mode === 'create' && (
          <input
            type="password"
            className="w-full p-2 rounded bg-white/30 text-white placeholder-white/60 mb-4"
            placeholder="Confirm password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            disabled={mode === 'loading'}
          />
        )}
        {error && <div className="text-red-400 mb-2 text-sm">{error}</div>}
        <button
          className="w-full py-2 rounded bg-gradient-to-r from-[#000f9b] via-[#eb0000] to-[#a000eb] text-white font-semibold shadow disabled:opacity-50"
          disabled={mode === 'loading'}
        >
          {mode === 'create' ? 'Create' : 'Unlock'}
        </button>
      </form>
    </div>
  );
}
