import React, { useState } from 'react';
import {
  User, Bell, Shield, Palette, Globe, KeyRound, Trash2,
  ChevronRight, Sun, Moon, Monitor, Save,
} from 'lucide-react';
import { ThemeSwitcher } from '@/components/ui/ThemeSwitcher';
import { useAppStore } from '@/store/app.store';

type SettingsTab = 'profile' | 'security' | 'notifications' | 'appearance' | 'privacy';

const TABS: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
  { id: 'profile', label: 'Profile', icon: <User size={16} /> },
  { id: 'security', label: 'Security', icon: <KeyRound size={16} /> },
  { id: 'notifications', label: 'Notifications', icon: <Bell size={16} /> },
  { id: 'appearance', label: 'Appearance', icon: <Palette size={16} /> },
  { id: 'privacy', label: 'Privacy', icon: <Shield size={16} /> },
];

export const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const { user } = useAppStore();

  const renderContent = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-primary mb-4">Profile Information</h2>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center text-2xl text-white font-bold flex-shrink-0"
                    style={{ backgroundColor: 'var(--accent)' }}
                  >
                    {user?.name?.[0] ?? 'U'}
                  </div>
                  <div>
                    <button className="btn-secondary btn-sm">Change avatar</button>
                    <p className="text-xs text-muted-cv mt-1">JPG, PNG up to 2MB</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Full Name</label>
                    <input type="text" defaultValue={user?.name ?? ''} className="input-lg" placeholder="Your name" />
                  </div>
                  <div>
                    <label className="label">Email Address</label>
                    <input type="email" defaultValue={user?.email ?? ''} className="input-lg" placeholder="you@example.com" />
                  </div>
                </div>

                <button className="btn-primary btn-md gap-2">
                  <Save size={14} />
                  Save Changes
                </button>
              </div>
            </div>

            <div className="divider" />

            <div>
              <h3 className="text-sm font-semibold text-primary mb-3">Plan</h3>
              <div
                className="flex items-center justify-between p-4 rounded-xl border"
                style={{ backgroundColor: 'var(--muted)', borderColor: 'var(--border)' }}
              >
                <div>
                  <p className="text-sm font-semibold text-primary">Free Plan</p>
                  <p className="text-xs text-muted-cv">5 jobs/day · 10MB limit</p>
                </div>
                <a href="/pricing" className="btn-primary btn-sm">Upgrade to Premium</a>
              </div>
            </div>

            <div className="divider" />

            <div>
              <h3 className="text-sm font-semibold text-error-600 mb-3">Danger Zone</h3>
              <button className="btn-danger btn-sm gap-2">
                <Trash2 size={13} />
                Delete Account
              </button>
            </div>
          </div>
        );

      case 'appearance':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-primary mb-1">Appearance</h2>
              <p className="text-sm text-muted-cv mb-6">Customize how CONVETER looks for you</p>

              <div>
                <label className="label mb-3">Theme</label>
                <ThemeSwitcher />
                <p className="text-xs text-muted-cv mt-2">
                  System mode will follow your operating system preference.
                </p>
              </div>
            </div>

            <div className="divider" />

            <div>
              <label className="label mb-3">Color Accent</label>
              <div className="flex gap-3 flex-wrap">
                {[
                  { color: '#4A4AE8', label: 'Indigo (default)' },
                  { color: '#7c3aed', label: 'Violet' },
                  { color: '#2563eb', label: 'Blue' },
                  { color: '#059669', label: 'Emerald' },
                  { color: '#dc2626', label: 'Red' },
                  { color: '#d97706', label: 'Amber' },
                ].map((opt) => (
                  <button
                    key={opt.color}
                    className="w-8 h-8 rounded-full border-2 transition-all duration-150"
                    style={{
                      backgroundColor: opt.color,
                      borderColor: opt.color === '#4A4AE8' ? 'white' : 'transparent',
                      boxShadow: opt.color === '#4A4AE8' ? `0 0 0 2px ${opt.color}` : 'none',
                    }}
                    title={opt.label}
                  />
                ))}
              </div>
              <p className="text-xs text-muted-cv mt-2">Coming soon — custom accent colors</p>
            </div>
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-primary mb-4">Notification Preferences</h2>
              <div className="space-y-3">
                {[
                  { label: 'Job completed', desc: 'When a file conversion finishes', default: true },
                  { label: 'Job failed', desc: 'When a file conversion fails', default: true },
                  { label: 'Workflow completed', desc: 'When an automated workflow finishes', default: true },
                  { label: 'Account security', desc: 'New logins and security events', default: true },
                  { label: 'Product updates', desc: 'New tools and features', default: false },
                  { label: 'Marketing', desc: 'Tips, offers and news', default: false },
                ].map((n) => (
                  <div
                    key={n.label}
                    className="flex items-center justify-between p-3 rounded-lg border"
                    style={{ backgroundColor: 'var(--muted)', borderColor: 'var(--border)' }}
                  >
                    <div>
                      <p className="text-sm font-medium text-primary">{n.label}</p>
                      <p className="text-xs text-muted-cv">{n.desc}</p>
                    </div>
                    <input
                      type="checkbox"
                      defaultChecked={n.default}
                      className="w-4 h-4"
                      style={{ accentColor: 'var(--accent)' }}
                    />
                  </div>
                ))}
              </div>
              <button className="btn-primary btn-md mt-4 gap-2">
                <Save size={14} />
                Save Preferences
              </button>
            </div>
          </div>
        );

      case 'security':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-primary mb-4">Security</h2>
              <div className="space-y-4">
                <div>
                  <label className="label">Current Password</label>
                  <input type="password" className="input-lg" placeholder="••••••••" />
                </div>
                <div>
                  <label className="label">New Password</label>
                  <input type="password" className="input-lg" placeholder="Min 8 characters" />
                </div>
                <div>
                  <label className="label">Confirm New Password</label>
                  <input type="password" className="input-lg" placeholder="Repeat new password" />
                </div>
                <button className="btn-primary btn-md gap-2">
                  <KeyRound size={14} />
                  Update Password
                </button>
              </div>
            </div>

            <div className="divider" />

            <div>
              <h3 className="text-sm font-semibold text-primary mb-3">Active Sessions</h3>
              <div
                className="flex items-center justify-between p-3 rounded-lg border"
                style={{ backgroundColor: 'var(--muted)', borderColor: 'var(--border)' }}
              >
                <div>
                  <p className="text-sm font-medium text-primary">Current session</p>
                  <p className="text-xs text-muted-cv">Windows · Chrome · This device</p>
                </div>
                <span className="badge badge-success">Active</span>
              </div>
            </div>
          </div>
        );

      case 'privacy':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-primary mb-4">Privacy Settings</h2>
              <div className="space-y-3">
                {[
                  { label: 'Save file history', desc: 'Keep a record of processed files for 30 days', default: true },
                  { label: 'Usage analytics', desc: 'Help improve CONVETER with anonymous usage data', default: true },
                  { label: 'Personalization', desc: 'Remember your preferred tools and settings', default: true },
                ].map((p) => (
                  <div
                    key={p.label}
                    className="flex items-center justify-between p-3 rounded-lg border"
                    style={{ backgroundColor: 'var(--muted)', borderColor: 'var(--border)' }}
                  >
                    <div>
                      <p className="text-sm font-medium text-primary">{p.label}</p>
                      <p className="text-xs text-muted-cv">{p.desc}</p>
                    </div>
                    <input
                      type="checkbox"
                      defaultChecked={p.default}
                      className="w-4 h-4"
                      style={{ accentColor: 'var(--accent)' }}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <button className="btn-secondary btn-sm gap-2 text-error-600">
                  <Trash2 size={13} />
                  Delete all my history
                </button>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="pt-20 pb-16" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="container-narrow">
        <h1 className="text-2xl font-bold text-primary mb-8">Account Settings</h1>

        <div className="flex gap-8">
          {/* Sidebar */}
          <aside className="w-52 flex-shrink-0">
            <nav className="space-y-0.5">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 text-left ${
                    activeTab === tab.id
                      ? 'bg-accent-subtle text-accent'
                      : 'text-secondary hover:bg-hover-cv hover:text-primary'
                  }`}
                >
                  <span style={activeTab === tab.id ? { color: 'var(--accent)' } : { color: 'var(--text-muted)' }}>
                    {tab.icon}
                  </span>
                  {tab.label}
                  {activeTab === tab.id && (
                    <ChevronRight size={14} className="ml-auto opacity-50" />
                  )}
                </button>
              ))}
            </nav>
          </aside>

          {/* Content */}
          <div
            className="flex-1 p-6 rounded-xl border min-h-96"
            style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
          >
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
