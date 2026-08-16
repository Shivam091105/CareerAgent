import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const AppContext = createContext(null);

export const API_BASE = 'http://localhost:8000';

/**
 * Task 1 (profile store) + Task 2 (job context bridge) both live here.
 *
 * - `email` / `profile`: the resume saved on the Profile page. Any module
 *   (Resume Optimizer, Interview Coach, Cold Emailer) can read `profile`
 *   instead of forcing the user to upload a PDF again.
 * - `selectedJob`: the job the user picked in Job Hunter. Interview Coach
 *   and Cold Emailer read this to auto-fill the job description/company
 *   instead of a manual copy-paste.
 *
 * There's no login system yet, so `email` is just a plain identifier the
 * user types once and it's remembered in localStorage. Swapping this for
 * real auth later won't change how the other modules consume the context.
 */
export const AppProvider = ({ children }) => {
  const [email, setEmailState] = useState(() => localStorage.getItem('careeros_email') || '');
  const [profile, setProfile] = useState(null); // { email, resume_text, filename, updated_at } | null
  const [profileLoading, setProfileLoading] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null); // { role, company, summary, link } | null

  const setEmail = (value) => {
    const trimmed = (value || '').trim();
    setEmailState(trimmed);
    if (trimmed) {
      localStorage.setItem('careeros_email', trimmed);
    } else {
      localStorage.removeItem('careeros_email');
    }
  };

  const refreshProfile = useCallback(async (targetEmail) => {
    const e = (targetEmail ?? email).trim();
    if (!e) {
      setProfile(null);
      return;
    }
    setProfileLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/api/profile/${encodeURIComponent(e)}`);
      setProfile(res.data);
    } catch (err) {
      if (err.response && err.response.status === 404) {
        setProfile(null); // no profile saved yet — not an error state
      } else {
        console.error('Failed to load profile', err);
      }
    } finally {
      setProfileLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email]);

  // Whenever the active email changes (including on first load from
  // localStorage), try to pull that profile so it's ready everywhere.
  useEffect(() => {
    if (email) refreshProfile(email);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email]);

  const hasResume = Boolean(profile && profile.resume_text && profile.resume_text.trim());

  return (
    <AppContext.Provider value={{
      email, setEmail,
      profile, setProfile, profileLoading, refreshProfile, hasResume,
      selectedJob, setSelectedJob,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
};