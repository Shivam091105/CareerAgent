import React from 'react';
// ✅ FIXED: Single import line with all icons (Briefcase, FileText, User, Settings, MessageSquare, Mail, Video)
import { Briefcase, FileText, User, Settings, MessageSquare, Mail, Video } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const Sidebar = () => {
  const location = useLocation();

  const menuItems = [
    { icon: Briefcase, label: 'Job Hunter', path: '/' },
    { icon: FileText, label: 'Resume Architect', path: '/resume' },
    { icon: MessageSquare, label: 'Interview Coach', path: '/interview' },
    { icon: Mail, label: 'Cold Emailer', path: '/email' },
    { icon: Video, label: 'Video Coach', path: '/video' }, // ✅ Module 5
    { icon: User, label: 'Profile', path: '/profile' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ];

  return (
    <div className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col p-6">
      <div className="flex items-center gap-3 mb-10">
        <div className="w-8 h-8 bg-gradient-to-tr from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
          <Briefcase className="w-5 h-5 text-white" />
        </div>
        <h1 className="text-xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
          CareerOS
        </h1>
      </div>

      <nav className="flex-1 space-y-2">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.label}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                isActive
                  ? 'bg-cyan-500/10 text-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.1)]'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <item.icon className={`w-5 h-5 ${isActive ? 'text-cyan-400' : 'text-slate-500 group-hover:text-white'}`} />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

export default Sidebar;
