import React, { useState } from 'react';
import axios from 'axios';
import {
  Rocket, Loader2, AlertCircle, CheckCircle2, Briefcase, FileText,
  MessageSquare, Mail, Building, ExternalLink
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useApp, API_BASE } from '../context/AppContext';

/**
 * Task 4 — runs the whole graph/workflows.py pipeline (profile -> job
 * search/match -> resume analysis -> interview prep -> cold email) in one
 * call, instead of clicking through five separate modules by hand.
 *
 * If a job was already picked in Job Hunter (selectedJob in context, the
 * "job context bridge" from Task 2), this skips straight to matching
 * against that job. Otherwise it searches fresh from the typed job title.
 */
const Stage = ({ icon: Icon, title, done, children }) => (
  <div className={`rounded-2xl border p-6 transition-all ${done ? 'border-cyan-500/30 bg-slate-900/80' : 'border-slate-800 bg-slate-900/40'}`}>
    <div className="flex items-center gap-3 mb-4">
      <div className={`p-2 rounded-lg ${done ? 'bg-cyan-500/10 text-cyan-400' : 'bg-slate-800 text-slate-600'}`}>
        <Icon className="w-5 h-5" />
      </div>
      <h3 className={`font-bold ${done ? 'text-slate-100' : 'text-slate-600'}`}>{title}</h3>
      {done && <CheckCircle2 className="w-4 h-4 text-emerald-400 ml-auto" />}
    </div>
    {done ? children : <p className="text-sm text-slate-600">Not reached yet.</p>}
  </div>
);

const AutoPilot = () => {
  const { email, hasResume, selectedJob, setSelectedJob } = useApp();
  const [jobTitle, setJobTitle] = useState('');
  const [skills, setSkills] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const canRun = email && (selectedJob || jobTitle.trim());

  const handleRun = async () => {
    if (!canRun) return;
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const payload = {
        email,
        job_title: selectedJob ? null : jobTitle.trim(),
        skills: skills.trim() ? skills.trim() : null,
        selected_job: selectedJob || null,
      };
      const res = await axios.post(`${API_BASE}/api/orchestrate/run`, payload);
      setResult(res.data);
    } catch (err) {
      console.error(err);
      setError('Pipeline failed. Please check the backend connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto min-h-screen space-y-8">
      <div className="text-center space-y-2 mb-4">
        <div className="inline-flex items-center justify-center p-3 bg-cyan-500/10 rounded-2xl mb-2">
          <Rocket className="w-8 h-8 text-cyan-400" />
        </div>
        <h1 className="text-5xl font-extrabold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
          Autopilot
        </h1>
        <p className="text-slate-400 text-lg">One click: search, match, analyze, prep, and draft — all through the LangGraph pipeline.</p>
      </div>

      {!email && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl text-sm text-center">
          Set your email on the Profile page first — Autopilot needs a saved profile to run.
        </div>
      )}
      {email && !hasResume && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl text-sm text-center">
          No resume saved yet for {email}. Go to Profile and upload one before running Autopilot.
        </div>
      )}

      <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 shadow-xl space-y-4">
        {selectedJob ? (
          <div className="p-4 rounded-xl border border-cyan-500/30 bg-cyan-500/10 flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <Building className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-cyan-300 font-medium">Using job picked in Job Hunter</p>
                <p className="text-xs text-slate-400 mt-1">{selectedJob.role || selectedJob.title} @ {selectedJob.company}</p>
              </div>
            </div>
            <button onClick={() => setSelectedJob(null)} className="text-xs text-slate-400 hover:text-white underline whitespace-nowrap">
              Search fresh instead
            </button>
          </div>
        ) : (
          <>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Job title to search</label>
              <input
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                placeholder="e.g. Senior Backend Engineer"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Your skills (optional)</label>
              <input
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                placeholder="Leave blank to let the AI decide based on the role"
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
              />
            </div>
          </>
        )}

        <button
          onClick={handleRun}
          disabled={loading || !canRun}
          className={`w-full py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 ${
            loading || !canRun
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/20'
          }`}
        >
          {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Running the full pipeline...</> : <><Rocket className="w-5 h-5" /> Run Autopilot</>}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl flex items-center gap-3 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" /> {error}
        </div>
      )}

      {result && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {result.errors?.length > 0 && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl text-sm space-y-1">
              {result.errors.map((e, i) => <p key={i} className="flex items-center gap-2"><AlertCircle className="w-4 h-4 shrink-0" /> {e}</p>)}
            </div>
          )}

          <Stage icon={Briefcase} title="Matched Job" done={!!result.selected_job}>
            {result.selected_job && (
              <div>
                <p className="text-slate-200 font-medium">{result.selected_job.role || result.selected_job.title} @ {result.selected_job.company}</p>
                <p className="text-sm text-slate-400 mt-2">{result.selected_job.summary}</p>
                {result.selected_job.link && (
                  <a href={result.selected_job.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 mt-3">
                    View listing <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            )}
          </Stage>

          <Stage icon={FileText} title="Resume Analysis" done={!!result.resume_analysis}>
            {result.resume_analysis && (
              <div className="space-y-2 text-sm">
                <p className="text-slate-300">ATS Score: <span className="text-emerald-400 font-bold">{result.resume_analysis.ats_score}/100</span></p>
                {result.resume_analysis.missing_keywords?.length > 0 && (
                  <p className="text-slate-400">Missing keywords: {result.resume_analysis.missing_keywords.join(', ')}</p>
                )}
              </div>
            )}
          </Stage>

          <Stage icon={MessageSquare} title="Interview Prep" done={!!result.interview_prep}>
            {result.interview_prep && (
              <p className="text-sm text-slate-400">
                {result.interview_prep.technical_questions?.length || 0} technical + {result.interview_prep.behavioral_questions?.length || 0} behavioral questions generated. Full details are in the Interview Coach module.
              </p>
            )}
          </Stage>

          <Stage icon={Mail} title="Cold Email Draft" done={!!result.cold_email}>
            {result.cold_email && (
              <div className="text-sm space-y-2">
                <p className="text-slate-300 font-medium">Subject: {result.cold_email.subject_line}</p>
                <p className="text-slate-400 whitespace-pre-line">{result.cold_email.email_body}</p>
              </div>
            )}
          </Stage>
        </motion.div>
      )}
    </div>
  );
};

export default AutoPilot;