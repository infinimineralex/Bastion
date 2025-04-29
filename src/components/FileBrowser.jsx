import React, { useEffect, useState } from 'react';

export default function FileBrowser() {
  const [files, setFiles] = useState([]);

  useEffect(() => {
    // Request file list from main process
    window.electronAPI.send('list-encrypted-files');
    window.electronAPI.receive('encrypted-files-list', (fileList) => {
      setFiles(fileList);
    });
  }, []);

  const handleImport = () => {
    window.electronAPI.send('import-file');
  };

  const handleExport = (id) => {
    window.electronAPI.send('export-file', id);
  };

  const handleDelete = (id) => {
    window.electronAPI.send('delete-file', id);
  };

  useEffect(() => {
    // Refresh file list after import/delete
    window.electronAPI.receive('refresh-file-list', () => {
      window.electronAPI.send('list-encrypted-files');
    });
  }, []);

  return (
    <div className="bg-white/10 rounded-xl p-6 shadow-md backdrop-blur-sm border border-white/20">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold text-white drop-shadow-lg">Encrypted Files</h2>
        <button
          className="px-4 py-2 rounded bg-gradient-to-r from-[#000f9b] to-[#eb0000] hover:bg-gradient-to-l text-white font-semibold drop-shadow-xl"
          onClick={handleImport}
        >
          Import File
        </button>
      </div>
      {files.length === 0 ? (
        <div className="text-white/60">No files yet. Import to get started.</div>
      ) : (
        <table className="w-full text-white/80">
          <thead>
            <tr>
              <th className="text-left">Filename</th>
              <th className="text-left">Size</th>
              <th className="text-left">Date Added</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {files.map(file => (
              <tr key={file.id} className="border-b border-white/10">
                <td>{file.name}</td>
                <td>{(file.size / 1024).toFixed(1)} KB</td>
                <td>{new Date(file.date).toLocaleString()}</td>
                <td className="flex gap-2">
                  <button className="px-2 py-1 rounded bg-white/20 hover:bg-white/30" onClick={() => handleExport(file.id)}>Export</button>
                  <button className="px-2 py-1 rounded bg-red-500/80 hover:bg-red-700/80 text-white" onClick={() => handleDelete(file.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
