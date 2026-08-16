import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Upload, FileText, Save, CheckCircle, Loader2, AlertCircle, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { useApp, API_BASE } from '../context/AppContext';

const Profile = () => {
  const { email, setEmail, profile, profileLoading, refreshProfile, hasResume } = useApp();
  const [emailInput, setEmailInput] = useState(email);
  const [file, setFile] = useState(null);
  const [resumeText, setResumeText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Keep the textarea in sync whenever the loaded profile changes
  // (e.g. right after switching email or after an upload finishes).
  useEffect(() => {
    setResumeText(profile?.resume_text || '');
  }, [profile]);

  const handleActivateEmail = () => {
    if (!emailInput.trim()) return;
    setEmail(emailInput);
    setMessage('');
    setError('');
  };

  const handleUpload = async () => {
    if (!email) { setError('Set your email first.'); return; }
    if (!file) { setError('Choose a PDF to upload.'); return; }
    setUploading(true); setError(''); setMessage('');

    const formData = new FormData();
    formData.append('email', email);
    formData.append('file', file);

    try {
      await axios.post(`${API_BASE}/api/profile/upload`, formData);
      setMessage('Resume uploaded and parsed. Every other module can use it now.');
      setFile(null);
      await refreshProfile(email);
    } catch (err) {
      console.error(err);
      setError('Upload failed. Please check the backend connection.');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveText = async () => {
    if (!email) { setError('Set your email first.'); return; }
    setSaving(true); setError(''); setMessage('');

    try {
      await axios.put(`${API_BASE}/api/profile`, { email, resume_text: resumeText });
      setMessage('Profile saved.');
      await refreshProfile(email);
    } catch (err) {
      console.error(err);
      setError('Save failed. Please check the backend connection.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 min-h-screen">
      <div className="text-center space-y-2 mb-8">
        <div className="inline-flex items-center justify-center p-3 bg-cyan-500/10 rounded-2xl mb-2">
          <User className="w-8 h-8 text-cyan-400" />
        </div>
        <h1 className="text-5xl font-extrabold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
          Your Profile
        </h1>
        <p className="text-slate-400 text-lg">Save your resume once — every other module reuses it automatically.</p>
      </div>

      {/* Email identifier — doubles as the profile ID until there's real auth */}
      <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 shadow-xl">
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
          Your email (used as your profile ID)
        </label>
        <div className="flex gap-3">
          <input
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
            placeholder="you@example.com"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleActivateEmail()}
          />
          <button
            onClick={handleActivateEmail}
            disabled={!emailInput.trim()}
            className="px-6 rounded-xl font-bold bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white transition-all"
          >
            {email ? 'Switch' : 'Continue'}
          </button>
        </div>
        {email && (
          <p className="text-xs text-slate-500 mt-3">
            Active profile: <span className="text-cyan-400 font-medium">{email}</span>
          </p>
        )}
      </div>

      {email && (
        <>
          {/* Upload a PDF */}
          <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 shadow-xl">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">
              Upload / replace resume (PDF)
            </label>
            <div className="flex flex-col sm:flex-row items-stretch gap-4">
              <label className={`flex-1 flex items-center justify-center h-20 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${file ? 'border-cyan-500/50 bg-cyan-500/10' : 'border-slate-700 bg-slate-800 hover:bg-slate-750'}`}>
                <div className="flex items-center gap-3">
                  <Upload className={`w-5 h-5 ${file ? 'text-cyan-400' : 'text-slate-500'}`} />
                  <span className="text-sm text-slate-400">{file ? file.name : 'Click to choose a PDF'}</span>
                </div>
                <input type="file" className="hidden" accept=".pdf" onChange={(e) => setFile(e.target.files[0])} />
              </label>
              <button
                onClick={handleUpload}
                disabled={uploading || !file}
                className={`px-6 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                  uploading || !file
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white'
                }`}
              >
                {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><FileText className="w-5 h-5" /> Parse & save</>}
              </button>
            </div>
            {profile?.filename && (
              <p className="text-xs text-slate-500 mt-3">
                On record: <span className="text-slate-300">{profile.filename}</span>
                {profile.updated_at && <> · updated {new Date(profile.updated_at).toLocaleString()}</>}
              </p>
            )}
          </div>

          {/* Editable extracted text */}
          <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">
                Resume text (editable)
              </label>
              {profileLoading && <Loader2 className="w-4 h-4 animate-spin text-slate-500" />}
            </div>
            <textarea
              className="w-full h-72 bg-slate-950 border border-slate-800 rounded-xl p-4 text-slate-300 text-sm leading-relaxed focus:ring-2 focus:ring-cyan-500/50 focus:outline-none resize-none placeholder:text-slate-600"
              placeholder="Upload a PDF above, or type/paste your resume text directly here."
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
            />
            <button
              onClick={handleSaveText}
              disabled={saving}
              className={`w-full mt-4 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                saving ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-slate-800 hover:bg-slate-700 text-white'
              }`}
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5" /> Save edits</>}
            </button>
          </div>

          {hasResume && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl flex items-center gap-3 text-sm">
              <CheckCircle className="w-5 h-5 shrink-0" />
              Resume Optimizer, Interview Coach, and Cold Emailer will now use this resume by default.
            </div>
          )}

          {(message || error) && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 rounded-xl flex items-center gap-3 text-sm ${
                error ? 'bg-red-500/10 border border-red-500/20 text-red-400' : 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-400'
              }`}
            >
              {error ? <AlertCircle className="w-5 h-5 shrink-0" /> : <CheckCircle className="w-5 h-5 shrink-0" />}
              {error || message}
            </motion.div>
          )}
        </>
      )}
    </div>
  );
};

export default Profile;