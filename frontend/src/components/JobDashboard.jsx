import React, { useState } from 'react';
import axios from 'axios';
import { Search, Briefcase, ExternalLink, Loader2, Building, Globe } from 'lucide-react';
import { motion } from 'framer-motion';

const JobDashboard = () => {
  const [email, setEmail] = useState('test@example.com');
  const [query, setQuery] = useState('');
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async () => {
    if (!query) return;

    setLoading(true);
    setError('');
    setJobs([]);
    setHasSearched(true);

    try {
      const response = await axios.post('http://localhost:8000/api/scrape', {
        email,
        query
      });

      // Handle the data regardless of if it's wrapped or a direct array
      const data = response.data;

      if (Array.isArray(data)) {
        setJobs(data);
      } else if (data.jobs && Array.isArray(data.jobs)) {
        setJobs(data.jobs); // Handle if backend wraps it in { jobs: [...] }
      } else {
        console.warn("Unexpected data format:", data);
        setJobs([]);
      }

    } catch (err) {
      console.error(err);
      setError('Failed to fetch jobs. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen">
      <div className="text-center space-y-4 mb-12">
        <div className="inline-flex items-center justify-center p-3 bg-cyan-500/10 rounded-2xl mb-4">
          <Briefcase className="w-8 h-8 text-cyan-400" />
        </div>
        <h1 className="text-5xl font-extrabold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
          Career-Agent.OS
        </h1>
        <p className="text-slate-400 text-lg">Module 1: Autonomous Job Hunter</p>
      </div>

      {/* Search Section */}
      <div className="bg-slate-900/80 p-8 rounded-3xl border border-slate-800 shadow-2xl backdrop-blur-sm max-w-4xl mx-auto">
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Target Role</label>
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type="text"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-4 pl-12 pr-4 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all text-lg"
              placeholder="e.g. Senior Python Developer Remote"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={loading || !query}
            className={`px-8 rounded-xl font-bold text-lg transition-all flex items-center gap-2 ${
              loading
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 active:scale-95'
            }`}
          >
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Find Jobs'}
          </button>
        </div>
      </div>

      {/* Results Section */}
      <div className="mt-12 space-y-6 max-w-4xl mx-auto">
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-center">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6">
          {jobs.length > 0 ? (
            jobs.map((job, index) => (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                key={index}
                className="group bg-slate-900 border border-slate-800 hover:border-cyan-500/50 rounded-2xl p-6 transition-all hover:shadow-[0_0_30px_rgba(6,182,212,0.1)] relative overflow-hidden"
              >
                <div className="flex flex-col md:flex-row justify-between gap-6">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-xl font-bold text-slate-100 group-hover:text-cyan-400 transition-colors">
                          {job.role || job.title}
                        </h3>
                        <div className="flex items-center gap-2 text-slate-400 mt-1">
                          <Building className="w-4 h-4" />
                          <span className="font-medium">{job.company}</span>
                        </div>
                      </div>
                    </div>

                    <p className="text-slate-400 text-sm leading-relaxed border-l-2 border-slate-700 pl-4">
                      {job.summary}
                    </p>
                  </div>

                  <div className="flex flex-col justify-between shrink-0 gap-4">
                    <a
                      href={job.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-800 hover:bg-cyan-500/10 text-cyan-400 hover:text-cyan-300 border border-slate-700 hover:border-cyan-500/50 rounded-xl transition-all font-medium whitespace-nowrap"
                    >
                      Apply Now <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            !loading && hasSearched && (
              <div className="text-center py-20 opacity-50">
                <Globe className="w-16 h-16 mx-auto mb-4 text-slate-600" />
                <p className="text-xl text-slate-500">No jobs found.</p>
                <p className="text-slate-600 text-sm mt-2">Try a broader search term.</p>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default JobDashboard;


