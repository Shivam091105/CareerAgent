import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Upload, FileText, MessageSquare, ChevronDown, ChevronUp, Lightbulb, BrainCircuit, Loader2, CheckCircle2, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp, API_BASE } from '../context/AppContext';

const InterviewPrep = () => {
  const { profile, hasResume, selectedJob, setSelectedJob } = useApp();
  const [file, setFile] = useState(null);
  // Default to the saved profile resume when one exists; the user can still
  // switch to uploading a different PDF for this one run.
  const [useProfileResume, setUseProfileResume] = useState(hasResume);
  const [jd, setJd] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('technical'); // technical | behavioral

  // Keep the toggle in sync if the profile finishes loading after mount.
  useEffect(() => {
    setUseProfileResume(hasResume);
  }, [hasResume]);

  // Task 2: job context bridge — if a job was picked in Job Hunter, use it
  // to prefill the description here instead of a manual copy-paste.
  useEffect(() => {
    if (selectedJob && !jd) {
      setJd(selectedJob.summary || '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedJob]);

  const canGenerate = jd && (useProfileResume ? hasResume : file);

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

    try {
      const response = await axios.post(`${API_BASE}/api/interview-prep`, formData);
      setResult(response.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen">
      <div className="text-center space-y-4 mb-12">
        <h1 className="text-5xl font-extrabold bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
          AI Interview Coach
        </h1>
        <p className="text-slate-400 text-lg">Generate targeted questions based on your resume gaps.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LEFT: Input Section */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 shadow-xl">
            <label className="block text-sm font-semibold text-slate-300 mb-4 uppercase tracking-wider">1. Resume</label>

            {hasResume && useProfileResume ? (
              <div className="mb-6 p-4 rounded-xl border border-violet-500/30 bg-violet-500/10 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-violet-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-violet-300 font-medium">Using your saved profile resume</p>
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
                <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${file ? 'border-violet-500/50 bg-violet-500/10' : 'border-slate-700 bg-slate-800 hover:bg-slate-750'}`}>
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <FileText className={`w-8 h-8 mb-2 ${file ? 'text-violet-400' : 'text-slate-500'}`} />
                    <p className="text-xs text-slate-400">{file ? file.name : "Upload PDF"}</p>
                  </div>
                  <input type="file" className="hidden" accept=".pdf" onChange={(e) => setFile(e.target.files[0])} />
                </label>
              </div>
            )}
            {hasResume && !useProfileResume && (
              <button
                onClick={() => { setUseProfileResume(true); setFile(null); }}
                className="mb-6 text-xs text-violet-400 hover:text-violet-300 underline"
              >
                Use saved profile resume instead
              </button>
            )}

            <label className="block text-sm font-semibold text-slate-300 mb-4 uppercase tracking-wider">2. Job Description</label>
            {selectedJob && (
              <div className="mb-2 flex items-center justify-between text-xs text-fuchsia-400">
                <span>Auto-filled from Job Hunter: {selectedJob.role || selectedJob.title} @ {selectedJob.company}</span>
                <button
                  onClick={() => { setSelectedJob(null); setJd(''); }}
                  className="flex items-center gap-1 text-slate-500 hover:text-white"
                  title="Clear"
                >
                  <RefreshCw className="w-3 h-3" />
                </button>
              </div>
            )}
            <textarea
              className="w-full h-48 bg-slate-950 border border-slate-700 rounded-xl p-4 text-slate-300 text-sm focus:ring-2 focus:ring-violet-500 focus:outline-none resize-none"
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
                  : 'bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:shadow-lg hover:shadow-violet-500/20 text-white'
              }`}
            >
              {loading ? <Loader2 className="animate-spin" /> : <><BrainCircuit className="w-5 h-5" /> Generate Prep</>}
            </button>
          </div>

          {/* Tips Section (Only shows when result is ready) */}
          {result && (
            <div className="bg-emerald-900/20 p-6 rounded-2xl border border-emerald-500/30">
              <h3 className="text-emerald-400 font-bold flex items-center gap-2 mb-4">
                <Lightbulb className="w-5 h-5" /> Quick Tips
              </h3>
              <ul className="space-y-3">
                {result.tips.map((tip, i) => (
                  <li key={i} className="text-emerald-200/80 text-sm flex gap-2">
                    <span className="text-emerald-500">•</span> {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* RIGHT: Questions Display */}
        <div className="lg:col-span-8">
          {!result ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-600 border-2 border-dashed border-slate-800 rounded-3xl min-h-[500px]">
              <MessageSquare className="w-16 h-16 opacity-20 mb-4" />
              <p>Your personalized interview questions will appear here.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Tabs */}
              <div className="flex gap-4 border-b border-slate-800 pb-1">
                <button
                  onClick={() => setActiveTab('technical')}
                  className={`pb-3 px-4 font-medium transition-colors relative ${
                    activeTab === 'technical' ? 'text-violet-400' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  Technical Questions
                  {activeTab === 'technical' && (
                    <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-400" />
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('behavioral')}
                  className={`pb-3 px-4 font-medium transition-colors relative ${
                    activeTab === 'behavioral' ? 'text-fuchsia-400' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  Behavioral Questions
                  {activeTab === 'behavioral' && (
                    <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-fuchsia-400" />
                  )}
                </button>
              </div>

              {/* Questions List */}
              <div className="space-y-4">
                {(activeTab === 'technical' ? result.technical_questions : result.behavioral_questions).map((q, i) => (
                  <QuestionCard key={i} data={q} index={i} type={activeTab} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Sub-component for individual questions
const QuestionCard = ({ data, index, type }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`rounded-xl border transition-all overflow-hidden ${
        type === 'technical'
          ? 'bg-slate-900 border-slate-800 hover:border-violet-500/30'
          : 'bg-slate-900 border-slate-800 hover:border-fuchsia-500/30'
      }`}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-left p-6 flex justify-between items-start gap-4"
      >
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold px-2 py-1 rounded uppercase ${
              type === 'technical' ? 'bg-violet-500/10 text-violet-400' : 'bg-fuchsia-500/10 text-fuchsia-400'
            }`}>
              Question {index + 1}
            </span>
            <span className="text-xs text-slate-500 italic border-l border-slate-700 pl-2">
              {data.context}
            </span>
          </div>
          <h3 className="text-lg font-medium text-slate-200">{data.question}</h3>
        </div>
        {isOpen ? <ChevronUp className="w-5 h-5 text-slate-500" /> : <ChevronDown className="w-5 h-5 text-slate-500" />}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-slate-800 bg-slate-950/50"
          >
            <div className="p-6 text-slate-300 text-sm leading-relaxed space-y-2">
              <p className="font-bold text-slate-400 uppercase text-xs">Ideal Answer (STAR Method):</p>
              <p>{data.sample_answer}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default InterviewPrep;