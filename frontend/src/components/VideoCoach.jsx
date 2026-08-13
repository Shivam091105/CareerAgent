import React, { useState } from 'react';
import axios from 'axios';
import { Upload, Video, Mic, CheckCircle, AlertTriangle, Activity, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

const VideoCoach = () => {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState(null);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    setFile(selected);
    setVideoUrl(URL.createObjectURL(selected));
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setLoading(true);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post('http://localhost:8000/api/analyze-video', formData);
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
        <h1 className="text-5xl font-extrabold bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
          AI Video Coach
        </h1>
        <p className="text-slate-400 text-lg">Upload a mock interview answer. Get instant soft-skills feedback.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* LEFT: Upload & Preview */}
        <div className="space-y-6">
          <div className="bg-slate-900/50 p-8 rounded-3xl border border-slate-800 shadow-xl">
            {!videoUrl ? (
              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-2xl cursor-pointer border-slate-700 bg-slate-800 hover:bg-slate-750 transition-all">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Video className="w-12 h-12 mb-4 text-slate-500" />
                    <p className="text-sm text-slate-400">Click to upload video (MP4/MOV)</p>
                  </div>
                  <input type="file" className="hidden" accept="video/*" onChange={handleFileChange} />
                </label>
              </div>
            ) : (
              <div className="relative rounded-2xl overflow-hidden bg-black border border-slate-700">
                <video src={videoUrl} controls className="w-full h-64 object-cover" />
                <button
                  onClick={() => { setFile(null); setVideoUrl(null); setResult(null); }}
                  className="absolute top-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-xs backdrop-blur-md"
                >
                  Change Video
                </button>
              </div>
            )}

            <button
              onClick={handleAnalyze}
              disabled={loading || !file}
              className={`w-full mt-6 py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 ${
                loading
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-red-500 to-orange-500 hover:shadow-lg hover:shadow-red-500/20 text-white'
              }`}
            >
              {loading ? <Loader2 className="animate-spin" /> : <><Activity className="w-5 h-5" /> Analyze Speech</>}
            </button>
          </div>
        </div>

        {/* RIGHT: Analysis Results */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 min-h-[500px] relative">
          {!result ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-600">
              <Mic className="w-16 h-16 opacity-20 mb-4" />
              <p>Feedback will appear here.</p>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-8"
            >
              {/* Score Header */}
              <div className="flex items-center justify-between bg-slate-950 p-6 rounded-2xl border border-slate-800">
                <div>
                  <h2 className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-1">Speaking Score</h2>
                  <div className={`text-5xl font-black ${
                    result.score >= 80 ? 'text-green-400' : result.score >= 60 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {result.score}/100
                  </div>
                </div>
                <div className="text-right">
                  <h2 className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-1">Filler Words</h2>
                  <div className="text-2xl font-bold text-white">{result.filler_words_count}</div>
                </div>
              </div>

              {/* General Feedback */}
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-blue-400" /> Analysis
                </h3>
                <p className="text-slate-300 text-sm leading-relaxed bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                  {result.feedback}
                </p>
              </div>

              {/* Improvements */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-400" /> Areas for Improvement
                </h3>
                {result.improvements.map((item, i) => (
                  <div key={i} className="flex gap-4 p-4 bg-orange-500/5 border border-orange-500/10 rounded-xl">
                    <span className="flex-shrink-0 w-6 h-6 bg-orange-500/20 text-orange-400 rounded-full flex items-center justify-center text-xs font-bold">
                      {i + 1}
                    </span>
                    <p className="text-slate-300 text-sm">{item}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoCoach;

