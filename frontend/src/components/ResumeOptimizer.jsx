import React, { useState } from 'react';
import axios from 'axios';
import { Upload, FileText, CheckCircle, AlertCircle, Award, ArrowRight, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

const ResumeOptimizer = () => {
  const [file, setFile] = useState(null);
  const [jd, setJd] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAnalyze = async () => {
    if (!file || !jd) {
      setError("Please upload a resume and paste a job description.");
      return;
    }
    setLoading(true);
    setError('');
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('job_description', jd);

    try {
      const response = await axios.post('http://localhost:8000/api/analyze-resume', formData);
      setResult(response.data);
    } catch (err) {
      console.error(err);
      setError("Analysis failed. Please check the backend connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 min-h-screen">
      <div className="text-center space-y-2 mb-12">
        <h1 className="text-5xl font-extrabold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
          AI Resume Architect
        </h1>
        <p className="text-slate-400 text-lg">Optimize your resume for ATS systems in seconds.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* LEFT: Inputs */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-6"
        >
          {/* File Upload */}
          <div className="bg-slate-800/50 p-8 rounded-2xl border border-slate-700/50 hover:border-emerald-500/30 transition-all shadow-lg backdrop-blur-sm">
            <label className="block text-sm font-semibold text-slate-300 mb-4 uppercase tracking-wider">1. Upload Resume (PDF)</label>
            <div className="flex items-center justify-center w-full">
              <label className={`flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${file ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-slate-600 bg-slate-800 hover:bg-slate-750'}`}>
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  {file ? (
                    <>
                      <FileText className="w-10 h-10 mb-3 text-emerald-400" />
                      <p className="text-sm text-emerald-300 font-medium">{file.name}</p>
                    </>
                  ) : (
                    <>
                      <Upload className="w-10 h-10 mb-3 text-slate-400" />
                      <p className="text-sm text-slate-400">Click to upload or drag & drop</p>
                    </>
                  )}
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf"
                  onChange={(e) => setFile(e.target.files[0])}
                />
              </label>
            </div>
          </div>

          {/* JD Input */}
          <div className="bg-slate-800/50 p-8 rounded-2xl border border-slate-700/50 shadow-lg backdrop-blur-sm">
            <label className="block text-sm font-semibold text-slate-300 mb-4 uppercase tracking-wider">2. Job Description</label>
            <textarea
              className="w-full h-64 bg-slate-900/50 border border-slate-700 rounded-xl p-4 text-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent focus:outline-none resize-none transition-all placeholder:text-slate-600"
              placeholder="Paste the full job description here..."
              value={jd}
              onChange={(e) => setJd(e.target.value)}
            />
          </div>

          <button
            onClick={handleAnalyze}
            disabled={loading}
            className={`w-full py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-3 shadow-lg ${
              loading
                ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white hover:shadow-emerald-500/25 hover:-translate-y-1'
            }`}
          >
            {loading ? (
              <><Loader2 className="w-6 h-6 animate-spin" /> Analyzing...</>
            ) : (
              <><Award className="w-6 h-6" /> Analyze Match</>
            )}
          </button>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl flex items-center gap-3"
            >
              <AlertCircle className="w-5 h-5 shrink-0" /> {error}
            </motion.div>
          )}
        </motion.div>

        {/* RIGHT: Results */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-slate-900/80 rounded-3xl border border-slate-800 p-8 min-h-[600px] flex flex-col relative overflow-hidden"
        >
          {!result ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 space-y-6">
              <div className="w-24 h-24 rounded-full bg-slate-800/50 flex items-center justify-center">
                <FileText className="w-10 h-10 opacity-20" />
              </div>
              <p className="text-lg">Ready to optimize. Upload your resume to begin.</p>
            </div>
          ) : (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

              {/* Score Card */}
              <div className="relative overflow-hidden bg-slate-800/50 p-8 rounded-2xl border border-slate-700 flex items-center justify-between">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                <div>
                  <h2 className="text-slate-400 text-sm font-medium mb-1 uppercase tracking-wider">ATS Compatibility Score</h2>
                  <div className={`text-6xl font-black ${
                    result.ats_score >= 80 ? 'text-emerald-400' :
                    result.ats_score >= 60 ? 'text-yellow-400' :
                    'text-red-400'
                  }`}>
                    {result.ats_score}%
                  </div>
                </div>
                <div className={`p-5 rounded-full shadow-inner ${
                  result.ats_score >= 80 ? 'bg-emerald-500/20 text-emerald-400 shadow-emerald-500/20' :
                  result.ats_score >= 60 ? 'bg-yellow-500/20 text-yellow-400 shadow-yellow-500/20' :
                  'bg-red-500/20 text-red-400 shadow-red-500/20'
                }`}>
                  <Award className="w-12 h-12" />
                </div>
              </div>

              {/* Missing Keywords */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-400" /> Missing Keywords
                </h3>
                <div className="flex flex-wrap gap-2">
                  {result.missing_keywords && result.missing_keywords.length > 0 ? (
                    result.missing_keywords.map((keyword, i) => (
                      <span key={i} className="px-3 py-1.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg text-sm font-medium">
                        {keyword}
                      </span>
                    ))
                  ) : (
                    <span className="text-emerald-400 text-sm">Great job! No major keywords missing.</span>
                  )}
                </div>
              </div>

              {/* Suggestions */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-400" /> Suggested Bullet Point Improvements
                </h3>
                <div className="space-y-4">
                  {result.bullet_points_optimization.map((bullet, i) => (
                    <div key={i} className="p-5 bg-slate-800/30 border-l-4 border-emerald-500/50 rounded-r-xl text-slate-300 text-sm leading-relaxed hover:bg-slate-800/50 transition-colors">
                      "{bullet}"
                    </div>
                  ))}
                </div>
              </div>

              {/* Summary Critique */}
              <div className="p-6 bg-blue-500/5 border border-blue-500/10 rounded-2xl">
                 <h4 className="text-blue-400 text-sm font-bold mb-3 uppercase tracking-wide">Professional Summary Feedback</h4>
                 <p className="text-slate-300 text-sm leading-relaxed">{result.summary_critique}</p>
              </div>

            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default ResumeOptimizer;
