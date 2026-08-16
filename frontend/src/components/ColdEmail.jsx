import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Upload, Mail, Send, Copy, Check, Sparkles, Loader2, User, Building, CheckCircle2, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { useApp, API_BASE } from '../context/AppContext';

const ColdEmail = () => {
  const { profile, hasResume, selectedJob, setSelectedJob } = useApp();
  const [file, setFile] = useState(null);
  const [useProfileResume, setUseProfileResume] = useState(hasResume);
  const [jd, setJd] = useState('');
  const [company, setCompany] = useState('');
  const [recipient, setRecipient] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setUseProfileResume(hasResume);
  }, [hasResume]);

  // Task 2: job context bridge — prefill company + description from the
  // job picked in Job Hunter, instead of typing it all in again.
  useEffect(() => {
    if (selectedJob) {
      if (!jd) setJd(selectedJob.summary || '');
      if (!company) setCompany(selectedJob.company || '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedJob]);

  const canGenerate = jd && company && (useProfileResume ? hasResume : file);

  const handleGenerate = async () => {
    if (!canGenerate) return;
    setLoading(true);
    setResult(null);

    const formData = new FormData();
    if (useProfileResume) {
      formData.append('resume_text', profile.resume_text);
    } else {
      formData.append('file', file);
    }
    formData.append('job_description', jd);
    formData.append('company', company);
    formData.append('recipient', recipient || 'Hiring Manager');

    try {
      const response = await axios.post(`${API_BASE}/api/generate-email`, formData);
      setResult(response.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (!result) return;
    const text = `Subject: ${result.subject_line}\n\n${result.email_body}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen">
      <div className="text-center space-y-4 mb-12">
        <h1 className="text-5xl font-extrabold bg-gradient-to-r from-orange-400 to-pink-500 bg-clip-text text-transparent">
          Cold Email Writer
        </h1>
        <p className="text-slate-400 text-lg">Skip the line. Email the recruiter directly.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* LEFT: Inputs */}
        <div className="space-y-6">
          <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 shadow-xl">
            {/* Resume Upload */}
            <label className="block text-sm font-semibold text-slate-300 mb-4 uppercase tracking-wider">1. Your Resume</label>

            {hasResume && useProfileResume ? (
              <div className="mb-6 p-4 rounded-xl border border-orange-500/30 bg-orange-500/10 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-orange-300 font-medium">Using your saved profile resume</p>
                    <p className="text-xs text-slate-500 mt-1">{profile?.filename || 'Edited profile text'}</p>
                  </div>
                </div>
                <button
                  onClick={() => setUseProfileResume(false)}
                  className="text-xs text-slate-400 hover:text-white underline whitespace-nowrap"
                >
                  Upload different
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-center w-full mb-3">
                <label className={`flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${file ? 'border-orange-500/50 bg-orange-500/10' : 'border-slate-700 bg-slate-800 hover:bg-slate-750'}`}>
                  <div className="flex flex-col items-center justify-center">
                    <Upload className={`w-6 h-6 mb-2 ${file ? 'text-orange-400' : 'text-slate-500'}`} />
                    <p className="text-xs text-slate-400">{file ? file.name : "Upload PDF"}</p>
                  </div>
                  <input type="file" className="hidden" accept=".pdf" onChange={(e) => setFile(e.target.files[0])} />
                </label>
              </div>
            )}
            {hasResume && !useProfileResume && (
              <button
                onClick={() => { setUseProfileResume(true); setFile(null); }}
                className="mb-6 text-xs text-orange-400 hover:text-orange-300 underline"
              >
                Use saved profile resume instead
              </button>
            )}

            {/* Context Inputs */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2">Company Name</label>
                <div className="flex items-center bg-slate-950 border border-slate-700 rounded-lg p-3">
                  <Building className="w-4 h-4 text-slate-500 mr-2" />
                  <input className="bg-transparent w-full text-sm text-slate-200 focus:outline-none" placeholder="e.g. Google" value={company} onChange={(e) => setCompany(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2">Recruiter Name (Opt)</label>
                <div className="flex items-center bg-slate-950 border border-slate-700 rounded-lg p-3">
                  <User className="w-4 h-4 text-slate-500 mr-2" />
                  <input className="bg-transparent w-full text-sm text-slate-200 focus:outline-none" placeholder="e.g. Sarah" value={recipient} onChange={(e) => setRecipient(e.target.value)} />
                </div>
              </div>
            </div>

            <label className="block text-xs font-bold text-slate-500 mb-2">Job Description</label>
            {selectedJob && (
              <div className="mb-2 flex items-center justify-between text-xs text-orange-400">
                <span>Auto-filled from Job Hunter: {selectedJob.role || selectedJob.title} @ {selectedJob.company}</span>
                <button
                  onClick={() => { setSelectedJob(null); setJd(''); setCompany(''); }}
                  className="flex items-center gap-1 text-slate-500 hover:text-white"
                  title="Clear"
                >
                  <RefreshCw className="w-3 h-3" />
                </button>
              </div>
            )}
            <textarea
              className="w-full h-32 bg-slate-950 border border-slate-700 rounded-lg p-4 text-slate-300 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none resize-none"
              placeholder="Paste JD here, or pick a job from Job Hunter to auto-fill..."
              value={jd}
              onChange={(e) => setJd(e.target.value)}
            />

            <button
              onClick={handleGenerate}
              disabled={loading || !canGenerate}
              className={`w-full mt-6 py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 ${
                loading || !canGenerate
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-orange-500 to-pink-500 hover:shadow-lg hover:shadow-orange-500/20 text-white'
              }`}
            >
              {loading ? <Loader2 className="animate-spin" /> : <><Sparkles className="w-5 h-5" /> Generate Email</>}
            </button>
          </div>
        </div>

        {/* RIGHT: Results */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 min-h-[500px] relative">
          {!result ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-600">
              <Mail className="w-16 h-16 opacity-20 mb-4" />
              <p>Draft will appear here.</p>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Subject Line */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Subject</label>
                <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl text-slate-200 font-medium">
                  {result.subject_line}
                </div>
              </div>

              {/* Body */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Email Body</label>
                <div className="bg-slate-950 border border-slate-800 p-6 rounded-xl text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                  {result.email_body}
                </div>
              </div>

              {/* Strategy */}
              <div className="bg-blue-900/10 border border-blue-500/20 p-4 rounded-xl">
                <h4 className="text-blue-400 text-xs font-bold mb-2 uppercase">Why this works</h4>
                <p className="text-slate-400 text-xs">{result.explanation}</p>
              </div>

              {/* Actions */}
              <button
                onClick={copyToClipboard}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2"
              >
                {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copied!" : "Copy to Clipboard"}
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ColdEmail;