import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import JobDashboard from './components/JobDashboard';
import ResumeOptimizer from './components/ResumeOptimizer';
import InterviewPrep from './components/InterviewPrep'; // <--- Import
import ColdEmail from './components/ColdEmail';
import VideoCoach from './components/VideoCoach';
import Profile from './components/Profile';
import AutoPilot from './components/Autopilot';
import { AppProvider } from './context/AppContext';


const App = () => {
  return (
    <AppProvider>
      <Router>
        <div className="flex h-screen bg-slate-950 text-slate-200 font-sans selection:bg-cyan-500/30">
          <Sidebar />
          <main className="flex-1 overflow-y-auto">
            <Routes>
              <Route path="/" element={<JobDashboard />} />
              <Route path="/resume" element={<ResumeOptimizer />} />
              <Route path="/interview" element={<InterviewPrep />} /> {/* <--- New Route */}
              <Route path="/email" element={<ColdEmail />} />
              <Route path="/video" element={<VideoCoach />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/autopilot" element={<AutoPilot />} />
            </Routes>
          </main>
        </div>
      </Router>
    </AppProvider>
  );
};

export default App;