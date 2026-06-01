"use client";
import React, { useState, useEffect } from 'react';
import {
  FileText, Upload, Plus, Trash2, Edit, Wand2, Download, Eye,
  FolderOpen, Search, MoreVertical, Copy, Save, X, Layout,
  Briefcase, GraduationCap, Award, MapPin, Mail, Phone, Globe,
  Calendar, Building, CheckCircle, AlertCircle, Sparkles, Target,
  Palette, Code, Grid3x3, ChevronLeft, ChevronRight, Settings
} from 'lucide-react';
import {
  fetchResumes as apiFetchResumes,
  createResume as apiCreate,
  updateResume as apiUpdate,
  deleteResume as apiDelete,
} from '@/lib/api/resumes';

// Type Definitions
interface PersonalInfo {
  name: string;
  title: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  website: string;
}

interface Experience {
  id: number;
  company: string;
  position: string;
  location: string;
  startDate: string;
  endDate: string;
  current: boolean;
  achievements: string[];
}

interface Education {
  id: number;
  school: string;
  degree: string;
  field: string;
  location: string;
  graduationDate: string;
  gpa: string;
}

interface Project {
  id: number;
  name: string;
  description: string;
  technologies: string;
  link: string;
}

interface ResumeData {
  personalInfo: PersonalInfo;
  summary: string;
  experience: Experience[];
  education: Education[];
  skills: string[];
  certifications?: string[];
  projects?: Project[];
  languages?: string[];
}

interface Resume {
  id: number;
  backendId?: number;   // DB primary key; undefined for unsaved / legacy localStorage resumes
  name: string;
  content?: string;
  source: 'builder' | 'uploaded' | 'tailored';
  template: string;
  createdAt: string;
  lastModified: string;
  data?: ResumeData;
}

interface Notification {
  show: boolean;
  type: 'success' | 'error' | 'info';
  message: string;
}

export type IntakeContext = {
  role: string | null;
  company: string | null;
  runwayRiskLevel: "high" | "medium" | "stable" | null;
};

export default function CompleteResumeSystem({ intakeContext }: { intakeContext?: IntakeContext }) {
  const [currentView, setCurrentView] = useState<'library' | 'templates' | 'builder' | 'tailor'>('library');
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [selectedResume, setSelectedResume] = useState<Resume | null>(null);
  const [notification, setNotification] = useState<Notification>({ show: false, type: 'success', message: '' });
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Load resumes: prefer backend, fall back to localStorage for migration
  useEffect(() => {
    apiFetchResumes().then((apiResumes) => {
      if (apiResumes.length > 0) {
        // Map backend records to local Resume shape
        const mapped: Resume[] = apiResumes.map((r) => ({
          id: r.id,
          backendId: r.id,
          name: r.name,
          content: r.content ?? undefined,
          source: 'uploaded' as const,
          template: 'modern',
          createdAt: r.createdAt,
          lastModified: r.updatedAt,
          // If content is valid JSON it was a builder resume
          data: (() => {
            try { return r.content ? JSON.parse(r.content) : undefined; } catch { return undefined; }
          })(),
        }));
        setResumes(mapped);
        localStorage.removeItem('resumes'); // clear stale local data
      } else {
        // Migrate any existing localStorage resumes
        const saved = localStorage.getItem('resumes');
        if (saved) {
          try { setResumes(JSON.parse(saved)); } catch { /* ignore corrupted data */ }
        }
      }
    }).catch(() => {
      // Offline / not logged in — fall back to localStorage
      const saved = localStorage.getItem('resumes');
      if (saved) {
        try { setResumes(JSON.parse(saved)); } catch { /* ignore */ }
      }
    });
  }, []);

  // Update local state only (API calls happen at action sites)
  const saveResumes = (updatedResumes: Resume[]): void => {
    setResumes(updatedResumes);
  };

  // Serialize a Resume's data object (or plain content) for the backend content column
  const serializeForBackend = (resume: Resume): string => {
    if (resume.data) return JSON.stringify(resume.data);
    return resume.content ?? '';
  };

  const notificationTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const showNotification = (type: 'success' | 'error' | 'info', message: string): void => {
    if (notificationTimer.current) clearTimeout(notificationTimer.current);
    setNotification({ show: true, type, message });
    const duration = type === 'error' ? 8000 : 4000;
    notificationTimer.current = setTimeout(() => setNotification({ show: false, type: 'success', message: '' }), duration);
  };
  const dismissNotification = () => {
    if (notificationTimer.current) clearTimeout(notificationTimer.current);
    setNotification({ show: false, type: 'success', message: '' });
  };

  const [uploadParsing, setUploadParsing] = useState(false);

  // Handle file upload — parses with AI and opens builder pre-populated
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    if (!file) return;
    // Reset input so same file can be re-selected
    event.target.value = '';

    setUploadParsing(true);
    showNotification('info', 'Parsing your resume with AI — this takes a few seconds…');

    try {
      const form = new FormData();
      form.append('file', file);

      const res = await fetch('/api/resumes/parse', { method: 'POST', body: form });
      const data = await res.json();

      if (!res.ok) {
        showNotification('error', data.error || 'Failed to parse resume');
        return;
      }

      const baseName = file.name.replace(/\.[^/.]+$/, '');

      // Save to backend with parsed data serialized as JSON content
      const saved = await apiCreate({
        name: baseName,
        targetRole: data.personalInfo?.title || '',
        content: JSON.stringify(data),
      });

      const newResume: Resume = {
        id: saved.id,
        backendId: saved.id,
        name: saved.name,
        content: JSON.stringify(data),
        data: data as ResumeData,
        source: 'uploaded',
        template: 'modern',
        createdAt: saved.createdAt,
        lastModified: saved.updatedAt,
      };

      saveResumes([...resumes, newResume]);
      setSelectedResume(newResume);
      setCurrentView('builder');
      showNotification('success', 'Resume parsed! Review and edit your details below.');
    } catch (error) {
      showNotification('error', 'Failed to parse resume. Try a different file format.');
    } finally {
      setUploadParsing(false);
    }
  };

  // Start new resume creation
  const startNewResume = (): void => {
    setCurrentView('templates');
  };

  // Create resume from template
  const createFromTemplate = (templateId: string): void => {
    const newResume: Resume = {
      id: Date.now(),
      name: 'Untitled Resume',
      source: 'builder',
      template: templateId,
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      data: {
        personalInfo: {
          name: '',
          title: '',
          email: '',
          phone: '',
          location: '',
          linkedin: '',
          website: ''
        },
        summary: '',
        experience: [],
        education: [],
        skills: [],
        certifications: []
      }
    };
    
    setSelectedResume(newResume);
    setCurrentView('builder');
  };

  const [actionInProgress, setActionInProgress] = useState<number | null>(null);

  // Delete resume
  const deleteResume = async (id: number): Promise<void> => {
    if (!window.confirm('Are you sure you want to delete this resume?')) return;
    setActionInProgress(id);
    const resume = resumes.find((r) => r.id === id);
    if (resume?.backendId) {
      try {
        await apiDelete(resume.backendId);
      } catch {
        showNotification('error', 'Failed to delete from server — removed locally');
      }
    }
    saveResumes(resumes.filter((r) => r.id !== id));
    setActionInProgress(null);
    showNotification('success', 'Resume deleted');
  };

  // Duplicate resume
  const duplicateResume = async (resume: Resume): Promise<void> => {
    setActionInProgress(resume.id);
    const dupName = `${resume.name} (Copy)`;
    try {
      const saved = await apiCreate({
        name: dupName,
        targetRole: '',
        content: serializeForBackend(resume),
      });
      const duplicate: Resume = {
        ...resume,
        id: saved.id,
        backendId: saved.id,
        name: dupName,
        createdAt: saved.createdAt,
        lastModified: saved.updatedAt,
      };
      saveResumes([...resumes, duplicate]);
      showNotification('success', 'Resume duplicated');
    } catch {
      showNotification('error', 'Failed to duplicate resume');
    } finally {
      setActionInProgress(null);
    }
  };

  // Edit resume
  const editResume = (resume: Resume): void => {
    setSelectedResume(resume);
    setCurrentView('builder');
  };

  // Tailor resume
  const tailorResume = (resume: Resume): void => {
    setSelectedResume(resume);
    setCurrentView('tailor');
  };

  // Download resume as PDF via print window
  const downloadResume = (resume: Resume): void => {
    const html = buildResumeHtml(resume);
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      showNotification('error', 'Allow popups to download as PDF, then try again.');
      return;
    }
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 400);
    showNotification('success', 'Print dialog opened — choose "Save as PDF".');
  };

  const filteredResumes = resumes.filter(r =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50/30">
      {/* Notification */}
      {notification.show && (
        <div className="fixed top-20 right-6 z-50 animate-slide-in">
          <div className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-lg backdrop-blur-lg border ${
            notification.type === 'success' ? 'bg-emerald-50/90 border-emerald-200 text-emerald-800' :
            notification.type === 'error' ? 'bg-rose-50/90 border-rose-200 text-rose-800' : 'bg-violet-50/90 border-violet-200 text-violet-800'
          }`}>
            {notification.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : notification.type === 'error' ? <AlertCircle className="w-4 h-4 shrink-0" /> : <Sparkles className="w-4 h-4 shrink-0" />}
            <span className="text-sm font-medium">{notification.message}</span>
            <button onClick={dismissNotification} className="ml-2 hover:opacity-70 transition-opacity shrink-0">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white/80 backdrop-blur-lg border-b border-gray-200/60 sticky top-[57px] z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-200">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-indigo-600">
                  Resume Studio
                </h1>
                <p className="text-xs text-gray-500">
                  {currentView === 'library' && `${resumes.length} resume${resumes.length !== 1 ? 's' : ''}`}
                  {currentView === 'templates' && 'Choose a template'}
                  {currentView === 'builder' && 'Build your resume'}
                  {currentView === 'tailor' && 'Tailor to job posting'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {currentView !== 'library' && (
                <button
                  onClick={() => setCurrentView('library')}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-200 rounded-xl font-medium hover:bg-gray-50 transition-all flex items-center gap-1.5"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Library
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {currentView === 'library' && (
          <LibraryView
            resumes={filteredResumes}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            startNewResume={startNewResume}
            handleFileUpload={handleFileUpload}
            uploadParsing={uploadParsing}
            deleteResume={deleteResume}
            duplicateResume={duplicateResume}
            editResume={editResume}
            tailorResume={tailorResume}
            downloadResume={downloadResume}
            actionInProgress={actionInProgress}
          />
        )}

        {currentView === 'templates' && (
          <TemplatesView
            createFromTemplate={createFromTemplate}
            goBack={() => setCurrentView('library')}
          />
        )}

        {currentView === 'builder' && (
          <BuilderView
            resume={selectedResume}
            resumes={resumes}
            onSave={async (updatedResume: Resume) => {
              const content = serializeForBackend(updatedResume);
              if (updatedResume.backendId) {
                await apiUpdate(updatedResume.backendId, { name: updatedResume.name, content });
                saveResumes(resumes.map((r) => r.id === updatedResume.id ? updatedResume : r));
              } else {
                const saved = await apiCreate({ name: updatedResume.name, targetRole: '', content });
                const withId = { ...updatedResume, backendId: saved.id };
                const existingIndex = resumes.findIndex((r) => r.id === updatedResume.id);
                if (existingIndex >= 0) {
                  saveResumes(resumes.map((r) => r.id === updatedResume.id ? withId : r));
                } else {
                  saveResumes([...resumes, withId]);
                }
              }
            }}
            showNotification={showNotification}
            goToLibrary={() => setCurrentView('library')}
          />
        )}

        {currentView === 'tailor' && (
          <TailorView
            resume={selectedResume}
            resumes={resumes}
            saveResumes={saveResumes}
            showNotification={showNotification}
            intakeContext={intakeContext}
          />
        )}
      </div>

      <style>{`
        @keyframes slide-in {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slide-in { animation: slide-in 0.3s ease-out; }
      `}</style>
    </div>
  );
}

// Templates View
function TemplatesView({ createFromTemplate, goBack }: { createFromTemplate: (templateId: string) => void; goBack: () => void }) {
  const templates = [
    {
      id: 'modern',
      name: 'Modern Professional',
      description: 'Clean, contemporary design for tech and business',
      icon: <Layout className="w-6 h-6" />,
      preview: 'bg-gradient-to-br from-blue-50 to-indigo-50',
      color: '#2563eb'
    },
    {
      id: 'executive',
      name: 'Executive',
      description: 'Bold, authoritative design for leadership roles',
      icon: <Briefcase className="w-6 h-6" />,
      preview: 'bg-gradient-to-br from-slate-800 to-slate-900',
      color: '#1e293b'
    },
    {
      id: 'creative',
      name: 'Creative',
      description: 'Vibrant, expressive design for creative fields',
      icon: <Palette className="w-6 h-6" />,
      preview: 'bg-gradient-to-br from-purple-400 to-pink-500',
      color: '#a855f7'
    },
    {
      id: 'minimal',
      name: 'Minimalist',
      description: 'Simple, elegant design focused on content',
      icon: <Grid3x3 className="w-6 h-6" />,
      preview: 'bg-gradient-to-br from-gray-50 to-gray-100',
      color: '#6b7280'
    },
    {
      id: 'tech',
      name: 'Tech Specialist',
      description: 'Code-inspired design for technical roles',
      icon: <Code className="w-6 h-6" />,
      preview: 'bg-gradient-to-br from-emerald-400 to-cyan-500',
      color: '#10b981'
    },
    {
      id: 'academic',
      name: 'Academic',
      description: 'Traditional, scholarly design',
      icon: <GraduationCap className="w-6 h-6" />,
      preview: 'bg-gradient-to-br from-amber-50 to-orange-50',
      color: '#f59e0b'
    }
  ];

  return (
    <div>
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose a Template</h2>
        <p className="text-sm text-gray-500">Select a design that matches your industry and style</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-4xl mx-auto">
        {templates.map(template => (
          <button
            key={template.id}
            onClick={() => createFromTemplate(template.id)}
            className="group text-left bg-white rounded-2xl border border-gray-200 overflow-hidden transition-all duration-200 hover:shadow-lg hover:shadow-violet-100 hover:-translate-y-0.5"
          >
            <div className="h-1 bg-gradient-to-r from-violet-500 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className={`h-32 ${template.preview} flex items-center justify-center relative`}>
              <div className="w-12 h-12 rounded-2xl bg-white/90 backdrop-blur flex items-center justify-center shadow-sm" style={{ color: template.color }}>
                {template.icon}
              </div>
            </div>
            <div className="p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-1">{template.name}</h3>
              <p className="text-xs text-gray-500 leading-relaxed">{template.description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// Library View Component
function LibraryView({
  resumes,
  searchQuery,
  setSearchQuery,
  startNewResume,
  handleFileUpload,
  uploadParsing,
  deleteResume,
  duplicateResume,
  editResume,
  tailorResume,
  downloadResume,
  actionInProgress
}: {
  resumes: Resume[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  startNewResume: () => void;
  handleFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  uploadParsing: boolean;
  deleteResume: (id: number) => void;
  duplicateResume: (resume: Resume) => void;
  editResume: (resume: Resume) => void;
  tailorResume: (resume: Resume) => void;
  downloadResume: (resume: Resume) => void;
  actionInProgress: number | null;
}) {
  const [showMenu, setShowMenu] = useState<number | null>(null);

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex-1 max-w-sm relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search resumes..."
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white"
          />
        </div>

        <div className="flex gap-2.5">
          <label className={`px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${uploadParsing ? 'opacity-60 cursor-not-allowed' : 'hover:bg-gray-50 cursor-pointer'}`}>
            {uploadParsing ? (
              <>
                <div className="w-4 h-4 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
                Parsing…
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Upload
              </>
            )}
            <input
              type="file"
              accept=".txt,.pdf,.doc,.docx"
              onChange={handleFileUpload}
              disabled={uploadParsing}
              className="hidden"
            />
          </label>

          <button
            onClick={startNewResume}
            className="px-4 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl text-sm font-medium hover:shadow-lg hover:shadow-violet-200 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create New
          </button>
        </div>
      </div>

      {resumes.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 rounded-2xl p-12 text-center max-w-lg mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-violet-50 flex items-center justify-center mx-auto mb-4">
            <FileText className="w-7 h-7 text-violet-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Your resume library is empty</h3>
          <p className="text-sm text-gray-500 mb-2 leading-relaxed">
            Create a resume from scratch, or upload an existing one to tailor it for specific roles.
          </p>
          <p className="text-xs text-gray-400 mb-6">
            One resume per role type works best.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={startNewResume}
              className="px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-violet-200 transition-all inline-flex items-center gap-2 text-sm"
            >
              <Plus className="w-4 h-4" />
              Build a resume
            </button>
            <label className={`px-5 py-2.5 border border-gray-200 text-gray-600 rounded-xl font-medium transition-all inline-flex items-center gap-2 text-sm ${uploadParsing ? 'opacity-60 cursor-not-allowed' : 'hover:bg-gray-50 cursor-pointer'}`}>
              {uploadParsing ? (
                <>
                  <div className="w-4 h-4 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
                  Parsing…
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Upload existing
                </>
              )}
              <input type="file" accept=".txt,.pdf,.doc,.docx" onChange={handleFileUpload} disabled={uploadParsing} className="hidden" />
            </label>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {resumes.map((resume: Resume) => {
            const sourceConfig = resume.source === 'uploaded'
              ? { label: 'Uploaded', bg: 'bg-violet-100 text-violet-700' }
              : resume.source === 'tailored'
              ? { label: 'Tailored', bg: 'bg-fuchsia-100 text-fuchsia-700' }
              : { label: 'Created', bg: 'bg-emerald-100 text-emerald-700' };

            return (
              <div key={resume.id} className={`group relative bg-white rounded-2xl border border-gray-200 transition-all duration-200 hover:shadow-lg hover:shadow-violet-100 hover:-translate-y-0.5 overflow-hidden ${actionInProgress === resume.id ? 'opacity-50 pointer-events-none' : ''}`}>
                {/* Top accent stripe */}
                <div className="h-1 bg-gradient-to-r from-violet-500 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />

                {actionInProgress === resume.id && (
                  <div className="absolute inset-0 flex items-center justify-center z-20 bg-white/60">
                    <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}

                <div className="p-5">
                  {/* Menu */}
                  <div className="absolute top-3 right-3">
                    <button
                      onClick={() => setShowMenu(showMenu === resume.id ? null : resume.id)}
                      className="p-1.5 hover:bg-gray-100 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                    >
                      <MoreVertical className="w-4 h-4 text-gray-500" />
                    </button>

                    {showMenu === resume.id && (
                      <div className="absolute right-0 mt-1 w-44 bg-white rounded-xl shadow-xl border border-gray-200 py-1.5 z-10">
                        <button onClick={() => { editResume(resume); setShowMenu(null); }} className="w-full px-3.5 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2.5 text-gray-700">
                          <Edit className="w-3.5 h-3.5" /> Edit
                        </button>
                        <button onClick={() => { tailorResume(resume); setShowMenu(null); }} className="w-full px-3.5 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2.5 text-gray-700">
                          <Wand2 className="w-3.5 h-3.5" /> Tailor to Job
                        </button>
                        <button onClick={() => { downloadResume(resume); setShowMenu(null); }} className="w-full px-3.5 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2.5 text-gray-700">
                          <Download className="w-3.5 h-3.5" /> Download
                        </button>
                        <button onClick={() => { duplicateResume(resume); setShowMenu(null); }} className="w-full px-3.5 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2.5 text-gray-700">
                          <Copy className="w-3.5 h-3.5" /> Duplicate
                        </button>
                        <div className="border-t border-gray-100 my-1" />
                        <button onClick={() => { deleteResume(resume.id); setShowMenu(null); }} className="w-full px-3.5 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2.5">
                          <Trash2 className="w-3.5 h-3.5" /> Delete
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Icon + Name */}
                  <div className="flex items-start gap-3.5 mb-4">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-100 to-indigo-100 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5 text-violet-600" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-gray-900 truncate pr-6">{resume.name}</h3>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${sourceConfig.bg}`}>
                          {sourceConfig.label}
                        </span>
                        <span className="text-xs text-gray-400">{new Date(resume.lastModified).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => editResume(resume)}
                      className="flex-1 px-3 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition-all flex items-center justify-center gap-1.5"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      Edit
                    </button>
                    <button
                      onClick={() => tailorResume(resume)}
                      className="px-3 py-2 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition-all flex items-center gap-1.5"
                    >
                      <Wand2 className="w-3.5 h-3.5" />
                      Tailor
                    </button>
                    <button
                      onClick={() => downloadResume(resume)}
                      className="px-3 py-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-all"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Builder View Component  
function BuilderView({ resume, resumes, onSave, showNotification, goToLibrary }: {
  resume: Resume | null;
  resumes: Resume[];
  onSave: (resume: Resume) => Promise<void>;
  showNotification: (type: 'success' | 'error' | 'info', message: string) => void;
  goToLibrary: () => void;
}) {
  const [activeSection, setActiveSection] = useState<string>('personalInfo');
  const [showPreview, setShowPreview] = useState<boolean>(false);
  const [resumeData, setResumeData] = useState<ResumeData>(
    resume?.data ||
    (resume?.content ? parseContentToResumeData(resume.content) : {
      personalInfo: { name: '', title: '', email: '', phone: '', location: '', linkedin: '', website: '' },
      summary: '',
      experience: [],
      education: [],
      skills: [],
    })
  );
  const [resumeName, setResumeName] = useState<string>(resume?.name || 'Untitled Resume');

  const handleSave = async (): Promise<void> => {
    const updatedResume: Resume = {
      ...resume!,
      name: resumeName,
      data: resumeData,
      lastModified: new Date().toISOString(),
    };
    try {
      await onSave(updatedResume);
      showNotification('success', 'Resume saved successfully!');
    } catch {
      showNotification('error', 'Failed to save resume');
    }
    goToLibrary();
  };

  // Experience functions
  const addExperience = (): void => {
    setResumeData({
      ...resumeData,
      experience: [...resumeData.experience, {
        id: Date.now(),
        company: '',
        position: '',
        location: '',
        startDate: '',
        endDate: '',
        current: false,
        achievements: ['']
      }]
    });
  };

  const updateExperience = (id: number, field: string, value: any): void => {
    setResumeData({
      ...resumeData,
      experience: resumeData.experience.map((exp: Experience) =>
        exp.id === id ? { ...exp, [field]: value } : exp
      )
    });
  };

  const removeExperience = (id: number): void => {
    setResumeData({
      ...resumeData,
      experience: resumeData.experience.filter((exp: Experience) => exp.id !== id)
    });
  };

  const addAchievement = (expId: number): void => {
    setResumeData({
      ...resumeData,
      experience: resumeData.experience.map((exp: Experience) =>
        exp.id === expId ? { ...exp, achievements: [...exp.achievements, ''] } : exp
      )
    });
  };

  const updateAchievement = (expId: number, index: number, value: string): void => {
    setResumeData({
      ...resumeData,
      experience: resumeData.experience.map((exp: Experience) =>
        exp.id === expId ? {
          ...exp,
          achievements: exp.achievements.map((ach: string, i: number) => i === index ? value : ach)
        } : exp
      )
    });
  };

  const removeAchievement = (expId: number, index: number): void => {
    setResumeData({
      ...resumeData,
      experience: resumeData.experience.map((exp: Experience) =>
        exp.id === expId ? {
          ...exp,
          achievements: exp.achievements.filter((_: string, i: number) => i !== index)
        } : exp
      )
    });
  };

  // Education functions
  const addEducation = (): void => {
    setResumeData({
      ...resumeData,
      education: [...resumeData.education, {
        id: Date.now(),
        school: '',
        degree: '',
        field: '',
        location: '',
        graduationDate: '',
        gpa: ''
      }]
    });
  };

  const updateEducation = (id: number, field: string, value: any): void => {
    setResumeData({
      ...resumeData,
      education: resumeData.education.map((edu: Education) =>
        edu.id === id ? { ...edu, [field]: value } : edu
      )
    });
  };

  const removeEducation = (id: number): void => {
    setResumeData({
      ...resumeData,
      education: resumeData.education.filter((edu: Education) => edu.id !== id)
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Sidebar */}
      <div className="lg:col-span-1">
        <div className="bg-white rounded-2xl border border-gray-200 p-5 sticky top-28">
          <div className="mb-5">
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Resume Name</label>
            <input
              type="text"
              value={resumeName}
              onChange={(e) => setResumeName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <div className="space-y-1 mb-5">
            {[
              { id: 'personalInfo', label: 'Personal Info', icon: <FileText className="w-3.5 h-3.5" /> },
              { id: 'summary', label: 'Summary', icon: <Sparkles className="w-3.5 h-3.5" /> },
              { id: 'experience', label: 'Experience', icon: <Briefcase className="w-3.5 h-3.5" /> },
              { id: 'education', label: 'Education', icon: <GraduationCap className="w-3.5 h-3.5" /> },
              { id: 'skills', label: 'Skills', icon: <Award className="w-3.5 h-3.5" /> },
              { id: 'certifications', label: 'Certifications', icon: <Award className="w-3.5 h-3.5" /> },
              { id: 'projects', label: 'Projects', icon: <Code className="w-3.5 h-3.5" /> },
              { id: 'languages', label: 'Languages', icon: <Globe className="w-3.5 h-3.5" /> }
            ].map(section => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeSection === section.id
                    ? 'bg-violet-50 text-violet-700 ring-1 ring-violet-200'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
                }`}
              >
                {section.icon}
                {section.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowPreview(!showPreview)}
            className="w-full mb-2 px-3 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
          >
            <Eye className="w-4 h-4" />
            {showPreview ? 'Hide' : 'Show'} Preview
          </button>

          <button
            onClick={handleSave}
            className="w-full px-3 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl text-sm font-medium hover:shadow-lg hover:shadow-violet-200 transition-all flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            Save to Library
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className={`${showPreview ? 'lg:col-span-1' : 'lg:col-span-3'}`}>
        <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8">
          {/* Personal Info Section */}
          {activeSection === 'personalInfo' && (
            <PersonalInfoSection resumeData={resumeData} setResumeData={setResumeData} />
          )}

          {/* Summary Section */}
          {activeSection === 'summary' && (
            <SummarySection resumeData={resumeData} setResumeData={setResumeData} />
          )}

          {/* Experience Section */}
          {activeSection === 'experience' && (
            <ExperienceSection
              resumeData={resumeData}
              addExperience={addExperience}
              updateExperience={updateExperience}
              removeExperience={removeExperience}
              addAchievement={addAchievement}
              updateAchievement={updateAchievement}
              removeAchievement={removeAchievement}
            />
          )}

          {/* Education Section */}
          {activeSection === 'education' && (
            <EducationSection
              resumeData={resumeData}
              addEducation={addEducation}
              updateEducation={updateEducation}
              removeEducation={removeEducation}
            />
          )}

          {/* Skills Section */}
          {activeSection === 'skills' && (
            <SkillsSection resumeData={resumeData} setResumeData={setResumeData} />
          )}

          {/* Certifications Section */}
          {activeSection === 'certifications' && (
            <CertificationsSection resumeData={resumeData} setResumeData={setResumeData} />
          )}

          {/* Projects Section */}
          {activeSection === 'projects' && (
            <ProjectsSection resumeData={resumeData} setResumeData={setResumeData} />
          )}

          {/* Languages Section */}
          {activeSection === 'languages' && (
            <LanguagesSection resumeData={resumeData} setResumeData={setResumeData} />
          )}
        </div>
      </div>

      {/* Preview Panel */}
      {showPreview && (
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 sticky top-28 max-h-[calc(100vh-8rem)] overflow-y-auto">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2 uppercase tracking-wider">
              <Eye className="w-4 h-4 text-violet-500" />
              Live Preview
            </h3>
            <ResumePreview data={resumeData} content={resume?.content} template={resume?.template || ''} />
          </div>
        </div>
      )}
    </div>
  );
}

// Section Components
function PersonalInfoSection({ resumeData, setResumeData }: { resumeData: ResumeData; setResumeData: (data: ResumeData) => void }) {
  const inputCls = "w-full text-sm px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500";
  const iconInputCls = "w-full text-sm pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500";
  const labelCls = "block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5";
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center"><FileText className="w-3.5 h-3.5 text-violet-600" /></div>
        <h3 className="text-lg font-semibold text-gray-900">Personal Information</h3>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className={labelCls}>Full Name *</label>
          <input type="text" value={resumeData.personalInfo.name} onChange={(e) => setResumeData({ ...resumeData, personalInfo: {...resumeData.personalInfo, name: e.target.value} })} className={inputCls} placeholder="John Doe" />
        </div>
        <div className="col-span-2">
          <label className={labelCls}>Professional Title *</label>
          <input type="text" value={resumeData.personalInfo.title} onChange={(e) => setResumeData({ ...resumeData, personalInfo: {...resumeData.personalInfo, title: e.target.value} })} className={inputCls} placeholder="Senior Software Engineer" />
        </div>
        <div>
          <label className={labelCls}>Email *</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input type="email" value={resumeData.personalInfo.email} onChange={(e) => setResumeData({ ...resumeData, personalInfo: {...resumeData.personalInfo, email: e.target.value} })} className={iconInputCls} placeholder="john@email.com" />
          </div>
        </div>
        <div>
          <label className={labelCls}>Phone *</label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input type="tel" value={resumeData.personalInfo.phone} onChange={(e) => setResumeData({ ...resumeData, personalInfo: {...resumeData.personalInfo, phone: e.target.value} })} className={iconInputCls} placeholder="(555) 123-4567" />
          </div>
        </div>
        <div className="col-span-2">
          <label className={labelCls}>Location</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input type="text" value={resumeData.personalInfo.location} onChange={(e) => setResumeData({ ...resumeData, personalInfo: {...resumeData.personalInfo, location: e.target.value} })} className={iconInputCls} placeholder="San Francisco, CA" />
          </div>
        </div>
        <div>
          <label className={labelCls}>LinkedIn</label>
          <input type="text" value={resumeData.personalInfo.linkedin} onChange={(e) => setResumeData({ ...resumeData, personalInfo: {...resumeData.personalInfo, linkedin: e.target.value} })} className={inputCls} placeholder="linkedin.com/in/johndoe" />
        </div>
        <div>
          <label className={labelCls}>Website</label>
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input type="text" value={resumeData.personalInfo.website} onChange={(e) => setResumeData({ ...resumeData, personalInfo: {...resumeData.personalInfo, website: e.target.value} })} className={iconInputCls} placeholder="johndoe.com" />
          </div>
        </div>
      </div>
    </div>
  );
}

function SummarySection({ resumeData, setResumeData }: { resumeData: ResumeData; setResumeData: (data: ResumeData) => void }) {
  const charCount = resumeData.summary.length;
  const isGoodLength = charCount >= 150 && charCount <= 300;
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center"><Sparkles className="w-3.5 h-3.5 text-violet-600" /></div>
        <h3 className="text-lg font-semibold text-gray-900">Professional Summary</h3>
      </div>

      <textarea
        value={resumeData.summary}
        onChange={(e) => setResumeData({...resumeData, summary: e.target.value})}
        className="w-full h-40 text-sm px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
        placeholder="Write a compelling 2-3 sentence summary highlighting your experience, skills, and career goals..."
      />

      <div className="flex items-center gap-2 text-xs text-gray-400">
        <span className={isGoodLength ? 'text-emerald-600 font-medium' : ''}>{charCount} characters</span>
        <span>·</span>
        <span>Aim for 150-300</span>
      </div>
    </div>
  );
}

function ExperienceSection({ resumeData, addExperience, updateExperience, removeExperience, addAchievement, updateAchievement, removeAchievement }: {
  resumeData: ResumeData;
  addExperience: () => void;
  updateExperience: (id: number, field: string, value: any) => void;
  removeExperience: (id: number) => void;
  addAchievement: (expId: number) => void;
  updateAchievement: (expId: number, index: number, value: string) => void;
  removeAchievement: (expId: number, index: number) => void;
}) {
  const inputCls = "w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500";
  const labelCls = "block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center"><Briefcase className="w-3.5 h-3.5 text-violet-600" /></div>
          <h3 className="text-lg font-semibold text-gray-900">Work Experience</h3>
        </div>
        <button onClick={addExperience} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-violet-600 hover:bg-violet-50 rounded-lg transition-all">
          <Plus className="w-4 h-4" /> Add
        </button>
      </div>

      {resumeData.experience.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 rounded-xl p-10 text-center">
          <Briefcase className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p className="text-sm text-gray-400">No experience added yet</p>
        </div>
      ) : (
        resumeData.experience.map((exp: Experience, expIdx: number) => (
          <div key={exp.id} className="p-5 bg-gray-50/50 rounded-xl border border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Position {expIdx + 1}</span>
              <button onClick={() => removeExperience(exp.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="col-span-2">
                <label className={labelCls}>Position Title</label>
                <input type="text" value={exp.position} onChange={(e) => updateExperience(exp.id, 'position', e.target.value)} className={inputCls} placeholder="Senior Software Engineer" />
              </div>
              <div className="col-span-2">
                <label className={labelCls}>Company</label>
                <input type="text" value={exp.company} onChange={(e) => updateExperience(exp.id, 'company', e.target.value)} className={inputCls} placeholder="Tech Corp" />
              </div>
              <div>
                <label className={labelCls}>Location</label>
                <input type="text" value={exp.location} onChange={(e) => updateExperience(exp.id, 'location', e.target.value)} className={inputCls} placeholder="San Francisco, CA" />
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={exp.current} onChange={(e) => updateExperience(exp.id, 'current', e.target.checked)} className="w-3.5 h-3.5 rounded border-gray-300 text-violet-600 focus:ring-violet-500" />
                  <span className="text-xs font-medium text-gray-600">Current Position</span>
                </label>
              </div>
              <div>
                <label className={labelCls}>Start Date</label>
                <input type="text" value={exp.startDate} onChange={(e) => updateExperience(exp.id, 'startDate', e.target.value)} className={inputCls} placeholder="Jan 2020" />
              </div>
              <div>
                <label className={labelCls}>End Date</label>
                <input type="text" value={exp.endDate} onChange={(e) => updateExperience(exp.id, 'endDate', e.target.value)} className={inputCls} placeholder="Present" disabled={exp.current} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Key Achievements</label>
                <button onClick={() => addAchievement(exp.id)} className="text-xs text-violet-600 hover:text-violet-700 font-medium">+ Add Bullet</button>
              </div>
              {exp.achievements.map((achievement: string, i: number) => (
                <div key={i} className="flex items-center gap-1.5">
                  <span className="text-gray-300 text-xs shrink-0">•</span>
                  <input
                    type="text"
                    value={achievement}
                    onChange={(e) => updateAchievement(exp.id, i, e.target.value)}
                    className="flex-1 text-sm px-3 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                    placeholder="Led development of feature that increased user engagement by 40%"
                  />
                  {exp.achievements.length > 1 && (
                    <button onClick={() => removeAchievement(exp.id, i)} className="text-gray-300 hover:text-red-500 shrink-0 transition-colors" title="Remove bullet">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function EducationSection({ resumeData, addEducation, updateEducation, removeEducation }: { 
  resumeData: ResumeData; 
  addEducation: () => void;
  updateEducation: (id: number, field: string, value: any) => void;
  removeEducation: (id: number) => void;
}) {
  const inputCls = "w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500";
  const labelCls = "block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center"><GraduationCap className="w-3.5 h-3.5 text-violet-600" /></div>
          <h3 className="text-lg font-semibold text-gray-900">Education</h3>
        </div>
        <button onClick={addEducation} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-violet-600 hover:bg-violet-50 rounded-lg transition-all">
          <Plus className="w-4 h-4" /> Add
        </button>
      </div>

      {resumeData.education.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 rounded-xl p-10 text-center">
          <GraduationCap className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p className="text-sm text-gray-400">No education added yet</p>
        </div>
      ) : (
        resumeData.education.map((edu: Education, eduIdx: number) => (
          <div key={edu.id} className="p-5 bg-gray-50/50 rounded-xl border border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Education {eduIdx + 1}</span>
              <button onClick={() => removeEducation(edu.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className={labelCls}>School/University</label>
                <input type="text" value={edu.school} onChange={(e) => updateEducation(edu.id, 'school', e.target.value)} className={inputCls} placeholder="Stanford University" />
              </div>
              <div>
                <label className={labelCls}>Degree</label>
                <input type="text" value={edu.degree} onChange={(e) => updateEducation(edu.id, 'degree', e.target.value)} className={inputCls} placeholder="Bachelor of Science" />
              </div>
              <div>
                <label className={labelCls}>Field of Study</label>
                <input type="text" value={edu.field} onChange={(e) => updateEducation(edu.id, 'field', e.target.value)} className={inputCls} placeholder="Computer Science" />
              </div>
              <div>
                <label className={labelCls}>Location</label>
                <input type="text" value={edu.location} onChange={(e) => updateEducation(edu.id, 'location', e.target.value)} className={inputCls} placeholder="Stanford, CA" />
              </div>
              <div>
                <label className={labelCls}>Graduation Date</label>
                <input type="text" value={edu.graduationDate} onChange={(e) => updateEducation(edu.id, 'graduationDate', e.target.value)} className={inputCls} placeholder="May 2020" />
              </div>
              <div>
                <label className={labelCls}>GPA (optional)</label>
                <input type="text" value={edu.gpa} onChange={(e) => updateEducation(edu.id, 'gpa', e.target.value)} className={inputCls} placeholder="3.8/4.0" />
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function SkillsSection({ resumeData, setResumeData }: { resumeData: ResumeData; setResumeData: (data: ResumeData) => void }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center"><Award className="w-3.5 h-3.5 text-violet-600" /></div>
        <h3 className="text-lg font-semibold text-gray-900">Skills</h3>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {resumeData.skills.map((skill: string, i: number) => (
          <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 text-violet-700 rounded-full text-sm">
            <span>{skill}</span>
            <button
              onClick={() => setResumeData({ ...resumeData, skills: resumeData.skills.filter((_: string, index: number) => index !== i) })}
              className="text-violet-400 hover:text-violet-700 transition-colors"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          id="skillInput"
          className="flex-1 text-sm px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
          placeholder="Add a skill (e.g., JavaScript, Project Management)"
          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter' && (e.target as HTMLInputElement).value.trim()) {
              setResumeData({ ...resumeData, skills: [...resumeData.skills, (e.target as HTMLInputElement).value.trim()] });
              (e.target as HTMLInputElement).value = '';
            }
          }}
        />
        <button
          onClick={() => {
            const input = document.getElementById('skillInput') as HTMLInputElement | null;
            if (input && input.value.trim()) {
              setResumeData({ ...resumeData, skills: [...resumeData.skills, input.value.trim()] });
              input.value = '';
            }
          }}
          className="px-4 py-2.5 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition-all"
        >
          Add
        </button>
      </div>
    </div>
  );
}

function CertificationsSection({ resumeData, setResumeData }: { resumeData: ResumeData; setResumeData: (data: ResumeData) => void }) {
  const certs = resumeData.certifications || [];
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center"><Award className="w-3.5 h-3.5 text-amber-600" /></div>
        <h3 className="text-lg font-semibold text-gray-900">Certifications</h3>
      </div>
      <div className="space-y-2 mb-4">
        {certs.map((cert, i) => (
          <div key={i} className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
            <Award className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span className="flex-1 text-sm text-gray-700">{cert}</span>
            <button onClick={() => setResumeData({ ...resumeData, certifications: certs.filter((_, idx) => idx !== i) })} className="text-gray-300 hover:text-red-500 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input type="text" id="certInput" className="flex-1 text-sm px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500" placeholder="e.g., AWS Solutions Architect — 2024" onKeyDown={(e) => { if (e.key === 'Enter' && (e.target as HTMLInputElement).value.trim()) { setResumeData({ ...resumeData, certifications: [...certs, (e.target as HTMLInputElement).value.trim()] }); (e.target as HTMLInputElement).value = ''; } }} />
        <button onClick={() => { const input = document.getElementById('certInput') as HTMLInputElement | null; if (input && input.value.trim()) { setResumeData({ ...resumeData, certifications: [...certs, input.value.trim()] }); input.value = ''; } }} className="px-4 py-2.5 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition-all">Add</button>
      </div>
    </div>
  );
}

function ProjectsSection({ resumeData, setResumeData }: { resumeData: ResumeData; setResumeData: (data: ResumeData) => void }) {
  const projects = resumeData.projects || [];
  const inputCls = "w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500";
  const labelCls = "block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5";

  const addProject = () => {
    setResumeData({ ...resumeData, projects: [...projects, { id: Date.now(), name: '', description: '', technologies: '', link: '' }] });
  };
  const updateProject = (id: number, field: string, value: string) => {
    setResumeData({ ...resumeData, projects: projects.map((p) => (p.id === id ? { ...p, [field]: value } : p)) });
  };
  const removeProject = (id: number) => {
    setResumeData({ ...resumeData, projects: projects.filter((p) => p.id !== id) });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center"><Code className="w-3.5 h-3.5 text-emerald-600" /></div>
          <h3 className="text-lg font-semibold text-gray-900">Projects</h3>
        </div>
        <button onClick={addProject} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-violet-600 hover:bg-violet-50 rounded-lg transition-all">
          <Plus className="w-4 h-4" /> Add
        </button>
      </div>
      {projects.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 rounded-xl p-10 text-center">
          <Code className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p className="text-sm text-gray-400">No projects added yet</p>
        </div>
      ) : (
        projects.map((proj, projIdx) => (
          <div key={proj.id} className="p-5 bg-gray-50/50 rounded-xl border border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Project {projIdx + 1}</span>
              <button onClick={() => removeProject(proj.id)} className="text-gray-400 hover:text-red-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><label className={labelCls}>Project Name</label><input type="text" value={proj.name} onChange={(e) => updateProject(proj.id, 'name', e.target.value)} className={inputCls} placeholder="Portfolio Website" /></div>
              <div className="col-span-2"><label className={labelCls}>Description</label><textarea value={proj.description} onChange={(e) => updateProject(proj.id, 'description', e.target.value)} className={`${inputCls} resize-none h-20`} placeholder="What did you build and what was the impact?" /></div>
              <div><label className={labelCls}>Technologies</label><input type="text" value={proj.technologies} onChange={(e) => updateProject(proj.id, 'technologies', e.target.value)} className={inputCls} placeholder="React, Node.js" /></div>
              <div><label className={labelCls}>Link (optional)</label><input type="text" value={proj.link} onChange={(e) => updateProject(proj.id, 'link', e.target.value)} className={inputCls} placeholder="github.com/..." /></div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function LanguagesSection({ resumeData, setResumeData }: { resumeData: ResumeData; setResumeData: (data: ResumeData) => void }) {
  const languages = resumeData.languages || [];
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center"><Globe className="w-3.5 h-3.5 text-indigo-600" /></div>
        <h3 className="text-lg font-semibold text-gray-900">Languages</h3>
      </div>
      <div className="flex flex-wrap gap-2 mb-4">
        {languages.map((lang, i) => (
          <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-sm">
            <span>{lang}</span>
            <button onClick={() => setResumeData({ ...resumeData, languages: languages.filter((_, idx) => idx !== i) })} className="text-indigo-400 hover:text-indigo-700 transition-colors">×</button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input type="text" id="langInput" className="flex-1 text-sm px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500" placeholder="e.g., Spanish (Fluent), Mandarin (Conversational)" onKeyDown={(e) => { if (e.key === 'Enter' && (e.target as HTMLInputElement).value.trim()) { setResumeData({ ...resumeData, languages: [...languages, (e.target as HTMLInputElement).value.trim()] }); (e.target as HTMLInputElement).value = ''; } }} />
        <button onClick={() => { const input = document.getElementById('langInput') as HTMLInputElement | null; if (input && input.value.trim()) { setResumeData({ ...resumeData, languages: [...languages, input.value.trim()] }); input.value = ''; } }} className="px-4 py-2.5 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition-all">Add</button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   Plain-text → ResumeData parser
───────────────────────────────────────── */
function parseExperienceSection(lines: string[], experience: Experience[]): void {
  let currentJob: Partial<Experience> | null = null;
  let achievements: string[] = [];

  const flushJob = () => {
    if (currentJob?.position) {
      experience.push({
        id: Date.now() + experience.length * 100,
        position: currentJob.position || '',
        company: currentJob.company || '',
        location: currentJob.location || '',
        startDate: currentJob.startDate || '',
        endDate: currentJob.endDate || '',
        current: currentJob.current || false,
        achievements: achievements.filter(Boolean),
      });
    }
    achievements = [];
    currentJob = null;
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const isAllCaps = trimmed.length > 2 && trimmed === trimmed.toUpperCase() && /[A-Z]{2}/.test(trimmed);
    if (isAllCaps) {
      flushJob();
      currentJob = { position: trimmed };
      continue;
    }

    if (!currentJob) continue;

    if (trimmed.startsWith('•') || trimmed.startsWith('-')) {
      achievements.push(trimmed.replace(/^[•\-]\s*/, '').trim());
      continue;
    }

    // Company/location/dates line — parse with two passes
    if (trimmed.includes('|') || /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|Present|\d{4})\b/.test(trimmed)) {
      const parts = trimmed.split('|').map(p => p.trim());
      const dateRe = /(\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}|\d{4})\s*[–\-—]\s*(\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}|\d{4}|Present)/i;

      // First pass: find dates
      for (const part of parts) {
        const m = dateRe.exec(part);
        if (m) {
          currentJob.startDate = m[1].trim();
          const endRaw = m[2].trim();
          currentJob.current = /^present$/i.test(endRaw);
          currentJob.endDate = currentJob.current ? '' : endRaw;
          break;
        }
      }
      // Second pass: company and location (skip the date part)
      for (const part of parts) {
        if (dateRe.test(part)) continue;
        if (!currentJob.company) { currentJob.company = part; }
        else if (!currentJob.location) { currentJob.location = part; }
      }
      continue;
    }

    // Regular text line within a job
    achievements.push(trimmed);
  }

  flushJob();
}

function parseEducationSection(lines: string[], education: Education[]): void {
  let currentEdu: Partial<Education> | null = null;

  const flushEdu = () => {
    if (currentEdu && (currentEdu.school || currentEdu.degree)) {
      education.push({
        id: Date.now() + education.length * 100,
        degree: currentEdu.degree || '',
        field: currentEdu.field || '',
        school: currentEdu.school || '',
        location: currentEdu.location || '',
        graduationDate: currentEdu.graduationDate || '',
        gpa: currentEdu.gpa || '',
      });
    }
    currentEdu = null;
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const isAllCaps = trimmed.length > 2 && trimmed === trimmed.toUpperCase() && /[A-Z]{2}/.test(trimmed);
    if (isAllCaps) {
      flushEdu();
      // Split degree and field: "BACHELOR OF SCIENCE, COMPUTER SCIENCE" or "BACHELOR OF SCIENCE IN COMPUTER SCIENCE"
      const inMatch = trimmed.match(/^(.+?)\s+IN\s+(.+)$/i);
      const commaMatch = trimmed.match(/^(.+?),\s*(.+)$/);
      if (inMatch) {
        currentEdu = { degree: inMatch[1].trim(), field: inMatch[2].trim() };
      } else if (commaMatch) {
        currentEdu = { degree: commaMatch[1].trim(), field: commaMatch[2].trim() };
      } else {
        currentEdu = { degree: trimmed };
      }
      continue;
    }

    if (!currentEdu) continue;

    // School / location / date line
    const parts = trimmed.split('|').map(p => p.trim());
    const dateRe = /^(\w+\s+\d{4}|\d{4})$/;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (dateRe.test(part)) {
        currentEdu.graduationDate = part;
      } else if (i === 0 && !currentEdu.school) {
        currentEdu.school = part;
      } else if (!currentEdu.location) {
        currentEdu.location = part;
      }
    }
  }

  flushEdu();
}

function parseSkillsSection(lines: string[], skills: string[]): void {
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('---')) continue;
    // Keep "Category: skill1, skill2" lines as-is — preserves grouping for the editor
    if (trimmed.startsWith('•')) {
      const skill = trimmed.replace(/^•\s*/, '').trim();
      if (skill) skills.push(skill);
    } else {
      skills.push(trimmed);
    }
  }
}

function parseContentToResumeData(content: string): ResumeData {
  const empty: ResumeData = {
    personalInfo: { name: '', title: '', email: '', phone: '', location: '', linkedin: '', website: '' },
    summary: '',
    experience: [],
    education: [],
    skills: [],
  };

  if (!content.trim()) return empty;

  // Split at --- divider lines
  const blocks = content.split(/\n---\n|^---\n|\n---$/m).map(b => b.trim()).filter(Boolean);

  const personalInfo = { ...empty.personalInfo };
  let summary = '';
  const experience: Experience[] = [];
  const education: Education[] = [];
  const skills: string[] = [];

  // ── Header block (before first ---) ──
  const headerLines = (blocks[0] || '').split('\n').filter(l => l.trim());
  if (headerLines.length > 0) personalInfo.name = headerLines[0].trim();

  for (let i = 1; i < headerLines.length; i++) {
    const parts = headerLines[i].split('|').map(p => p.trim());
    for (const part of parts) {
      const emailMatch = part.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
      const phoneMatch = part.match(/\+?[\d][\d\s\-.()]{5,}/);
      if (emailMatch && !personalInfo.email) {
        personalInfo.email = emailMatch[0];
      } else if (/^linkedin:/i.test(part)) {
        personalInfo.linkedin = part.replace(/^linkedin:\s*/i, '').trim();
      } else if (/^website:/i.test(part)) {
        personalInfo.website = part.replace(/^website:\s*/i, '').trim();
      } else if (/^github:/i.test(part)) {
        personalInfo.website = part.replace(/^github:\s*/i, '').trim();
      } else if (phoneMatch && !personalInfo.phone) {
        personalInfo.phone = phoneMatch[0].trim();
      } else if (!personalInfo.location && !part.includes('@') && !part.includes('http') && /[A-Z]/.test(part)) {
        personalInfo.location = part.trim();
      }
    }
  }

  // ── Content blocks ──
  for (let b = 1; b < blocks.length; b++) {
    const blockLines = blocks[b].split('\n');
    const firstNonEmpty = blockLines.find(l => l.trim())?.trim() || '';
    if (!firstNonEmpty) continue;

    const isAllCaps = firstNonEmpty.length > 2 && firstNonEmpty === firstNonEmpty.toUpperCase() && /[A-Z]{2}/.test(firstNonEmpty);
    const restLines = blockLines.slice(blockLines.findIndex(l => l.trim()) + 1);
    const key = firstNonEmpty.toLowerCase();

    if (!isAllCaps) {
      // Continuation text (no section header)
      const text = blockLines.filter(l => l.trim()).join(' ').trim();
      if (text && !summary) summary = text;
      continue;
    }

    if (/experience|work history|employment/.test(key)) {
      parseExperienceSection(restLines, experience);
    } else if (/education|academic/.test(key)) {
      parseEducationSection(restLines, education);
    } else if (/skill|technical|competenc/.test(key)) {
      parseSkillsSection(restLines, skills);
    } else if (/summary|objective|profile|about/.test(key)) {
      summary = restLines.filter(l => l.trim()).join(' ').trim();
    } else {
      // Treat as title section: first ALL CAPS line = job title, rest = summary
      personalInfo.title = firstNonEmpty;
      const text = restLines.filter(l => l.trim()).join(' ').trim();
      if (text && !summary) summary = text;
    }
  }

  return { personalInfo, summary, experience, education, skills };
}

/* ─────────────────────────────────────────
   PDF generation helpers (module-level, pure)
───────────────────────────────────────── */
function esc(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function isMeta(line: string): boolean {
  return (
    line.includes('|') ||
    line.startsWith('LinkedIn:') ||
    line.startsWith('Website:') ||
    line.startsWith('GitHub:') ||
    line.startsWith('Twitter:') ||
    line.startsWith('Portfolio:')
  );
}

function buildResumeHtml(resume: Resume): string {
  let bodyHtml = '';

  const hasStructuredData =
    resume.data &&
    (resume.data.personalInfo.name ||
      resume.data.experience.length > 0 ||
      resume.data.skills.length > 0);

  if (hasStructuredData && resume.data) {
    const d = resume.data;
    const contactParts = [d.personalInfo.email, d.personalInfo.phone, d.personalInfo.location].filter(Boolean);

    bodyHtml += `<div class="header">`;
    if (d.personalInfo.name) bodyHtml += `<h1>${esc(d.personalInfo.name)}</h1>`;
    if (d.personalInfo.title) bodyHtml += `<p class="subtitle">${esc(d.personalInfo.title)}</p>`;
    if (contactParts.length) bodyHtml += `<p class="contact">${contactParts.map(esc).join(' &nbsp;·&nbsp; ')}</p>`;
    if (d.personalInfo.linkedin) bodyHtml += `<p class="contact">${esc(d.personalInfo.linkedin)}</p>`;
    bodyHtml += `</div><hr class="header-rule">`;

    if (d.summary) {
      bodyHtml += `<div class="section"><h2>Professional Summary</h2><p class="body-text">${esc(d.summary)}</p></div>`;
    }

    if (d.experience.length > 0) {
      bodyHtml += `<div class="section"><h2>Experience</h2>`;
      d.experience.forEach((exp) => {
        const dates = `${esc(exp.startDate || '')} – ${exp.current ? 'Present' : esc(exp.endDate || '')}`;
        bodyHtml += `<div class="job">`;
        bodyHtml += `<div class="job-header"><span class="job-title">${esc(exp.position || '')}</span><span class="dates">${dates}</span></div>`;
        bodyHtml += `<p class="company">${esc(exp.company || '')}${exp.location ? ' &nbsp;·&nbsp; ' + esc(exp.location) : ''}</p>`;
        const bullets = exp.achievements.filter(Boolean);
        if (bullets.length) bodyHtml += `<ul>${bullets.map((a) => `<li>${esc(a)}</li>`).join('')}</ul>`;
        bodyHtml += `</div>`;
      });
      bodyHtml += `</div>`;
    }

    if (d.education.length > 0) {
      bodyHtml += `<div class="section"><h2>Education</h2>`;
      d.education.forEach((edu) => {
        bodyHtml += `<div class="edu">`;
        bodyHtml += `<p class="job-title">${esc(edu.degree || '')}${edu.field ? ' in ' + esc(edu.field) : ''}</p>`;
        bodyHtml += `<p class="company">${esc(edu.school || '')}${edu.location ? ' · ' + esc(edu.location) : ''}${edu.graduationDate ? ' · ' + esc(edu.graduationDate) : ''}</p>`;
        bodyHtml += `</div>`;
      });
      bodyHtml += `</div>`;
    }

    if (d.skills.length > 0) {
      bodyHtml += `<div class="section"><h2>Skills</h2><p class="body-text">${d.skills.map(esc).join(' &nbsp;·&nbsp; ')}</p></div>`;
    }

    if (d.certifications && d.certifications.length > 0) {
      bodyHtml += `<div class="section"><h2>Certifications</h2><ul>${d.certifications.map((c) => `<li>${esc(c)}</li>`).join('')}</ul></div>`;
    }

    if (d.projects && d.projects.length > 0) {
      bodyHtml += `<div class="section"><h2>Projects</h2>`;
      d.projects.forEach((proj) => {
        bodyHtml += `<div class="job">`;
        bodyHtml += `<p class="job-title">${esc(proj.name)}</p>`;
        if (proj.technologies) bodyHtml += `<p class="company">${esc(proj.technologies)}</p>`;
        if (proj.description) bodyHtml += `<p class="body-text">${esc(proj.description)}</p>`;
        bodyHtml += `</div>`;
      });
      bodyHtml += `</div>`;
    }

    if (d.languages && d.languages.length > 0) {
      bodyHtml += `<div class="section"><h2>Languages</h2><p class="body-text">${d.languages.map(esc).join(' &nbsp;·&nbsp; ')}</p></div>`;
    }
  } else {
    // Plain text content — parse into structured HTML
    const lines = (resume.content || '').split('\n');
    let inHeader = true;
    let headerLineCount = 0;
    let inList = false;
    let justSawDivider = false;

    lines.forEach((line) => {
      if (line === '---') {
        if (inList) { bodyHtml += '</ul>'; inList = false; }
        inHeader = false;
        justSawDivider = true;
        bodyHtml += '<hr>';
        return;
      }
      if (line.trim() === '') {
        if (inList) { bodyHtml += '</ul>'; inList = false; }
        bodyHtml += '<div style="height:4px"></div>';
        return;
      }
      if (inHeader) {
        bodyHtml += headerLineCount === 0
          ? `<h1>${esc(line)}</h1>`
          : `<p class="contact">${esc(line)}</p>`;
        headerLineCount++;
        return;
      }
      if (line.startsWith('•')) {
        if (!inList) { bodyHtml += '<ul>'; inList = true; }
        bodyHtml += `<li>${esc(line.substring(1).trim())}</li>`;
        justSawDivider = false;
        return;
      }
      if (inList) { bodyHtml += '</ul>'; inList = false; }
      const trimmed = line.trim();
      const isAllCaps = trimmed.length > 2 && trimmed === trimmed.toUpperCase() && /[A-Z]{2}/.test(trimmed);
      if (isAllCaps) {
        // Section header if immediately after ---; otherwise job title / degree title
        bodyHtml += justSawDivider
          ? `<h2>${esc(trimmed)}</h2>`
          : `<p class="job-title">${esc(trimmed)}</p>`;
        justSawDivider = false;
        return;
      }
      justSawDivider = false;
      bodyHtml += isMeta(trimmed)
        ? `<p class="meta">${esc(trimmed)}</p>`
        : `<p class="body-text">${esc(trimmed)}</p>`;
    });

    if (inList) bodyHtml += '</ul>';
  }

  const css = `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, Arial, sans-serif;
      font-size: 10pt;
      line-height: 1.55;
      color: #1a1a1a;
      padding: 36px 52px;
      max-width: 760px;
      margin: 0 auto;
    }
    h1 { font-size: 21pt; font-weight: 700; letter-spacing: -0.02em; margin-bottom: 3px; }
    .subtitle { font-size: 10.5pt; color: #555; font-weight: 400; margin-bottom: 5px; }
    .contact, .meta { font-size: 8.5pt; color: #666; margin-bottom: 2px; }
    .header { margin-bottom: 8px; }
    .header-rule, hr {
      border: none;
      border-top: 1.5px solid #d8d8d8;
      margin: 8px 0 10px 0;
    }
    h2 {
      font-size: 7.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.14em;
      color: #888;
      border-bottom: 1px solid #e8e8e8;
      padding-bottom: 3px;
      margin: 16px 0 7px 0;
    }
    .section { margin-bottom: 4px; }
    .job, .edu { margin-bottom: 9px; }
    .job-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 1px; }
    .job-title { font-size: 10pt; font-weight: 600; color: #111; display: block; margin: 7px 0 1px 0; }
    .dates { font-size: 8.5pt; color: #888; white-space: nowrap; }
    .company { font-size: 8.5pt; color: #666; margin-bottom: 4px; }
    ul { padding-left: 15px; margin: 4px 0 5px 0; }
    li { font-size: 9.5pt; margin-bottom: 2px; line-height: 1.5; color: #222; }
    .body-text { font-size: 9.5pt; color: #333; line-height: 1.55; margin-bottom: 3px; }
    @page { margin: 0.5in; }
    @media print { body { padding: 0; } }
  `;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${esc(resume.name)}</title>
<style>${css}</style>
</head>
<body>${bodyHtml}</body>
</html>`;
}

/* ─────────────────────────────────────────
   Plain-text resume preview (for content-based resumes)
───────────────────────────────────────── */
function PlainTextPreview({ content }: { content: string }) {
  const elements: React.ReactNode[] = [];
  const lines = content.split('\n');
  let inHeader = true;
  let headerCount = 0;
  let listItems: string[] = [];
  let justSawDivider = false;

  const flushList = (key: string) => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={key} className="list-none pl-0 space-y-1 mb-2 mt-1">
          {listItems.map((item, idx) => (
            <li key={idx} className="text-[13px] text-gray-700 leading-relaxed flex items-start gap-2">
              <span className="text-gray-400 mt-0.5 shrink-0 text-xs">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      );
      listItems = [];
    }
  };

  lines.forEach((line, i) => {
    const key = `l${i}`;

    if (line === '---') {
      flushList(`ul-${i}`);
      inHeader = false;
      justSawDivider = true;
      elements.push(<hr key={key} className="border-gray-200 my-4" />);
      return;
    }
    if (line.trim() === '') {
      flushList(`ul-${i}`);
      elements.push(<div key={key} className="h-2" />);
      return;
    }
    if (inHeader) {
      if (headerCount === 0) {
        elements.push(
          <h1 key={key} className="text-2xl font-bold text-gray-900 tracking-tight">{line}</h1>
        );
      } else {
        elements.push(
          <p key={key} className="text-[13px] text-gray-500 leading-snug">{line}</p>
        );
      }
      headerCount++;
      return;
    }
    if (line.startsWith('•')) {
      justSawDivider = false;
      listItems.push(line.substring(1).trim());
      return;
    }
    flushList(`ul-${i}`);
    const trimmed = line.trim();
    const isAllCaps = trimmed.length > 2 && trimmed === trimmed.toUpperCase() && /[A-Z]{2}/.test(trimmed);
    if (isAllCaps) {
      if (justSawDivider) {
        // Section header: right after ---
        elements.push(
          <h2 key={key} className="text-[11px] font-bold uppercase tracking-[0.12em] text-gray-500 border-b border-gray-200 pb-1.5 mb-2">
            {trimmed}
          </h2>
        );
      } else {
        // Job title or degree: ALL CAPS but inside a section
        elements.push(
          <p key={key} className="text-[13px] font-semibold text-gray-900 mt-3 mb-0.5">
            {trimmed}
          </p>
        );
      }
      justSawDivider = false;
      return;
    }
    justSawDivider = false;
    if (isMeta(trimmed)) {
      elements.push(<p key={key} className="text-[11.5px] text-gray-500 mb-0.5">{trimmed}</p>);
    } else {
      elements.push(<p key={key} className="text-[13px] text-gray-700 leading-relaxed mb-0.5">{trimmed}</p>);
    }
  });

  flushList('ul-end');

  return (
    <div className="bg-white p-6 border border-gray-200 rounded-lg">
      {elements}
    </div>
  );
}

// Resume Preview Component
function ResumePreview({ data, content, template }: { data: ResumeData | undefined; content?: string; template: string }) {
  const templateColors: { [key: string]: { primary: string; secondary: string } } = {
    modern: { primary: '#2563eb', secondary: '#64748b' },
    executive: { primary: '#1e293b', secondary: '#475569' },
    creative: { primary: '#a855f7', secondary: '#ec4899' },
    minimal: { primary: '#374151', secondary: '#6b7280' },
    tech: { primary: '#10b981', secondary: '#06b6d4' },
    academic: { primary: '#f59e0b', secondary: '#dc2626' }
  };

  const colors = templateColors[template] || templateColors.modern;

  const hasStructuredData = data && (
    data.personalInfo.name ||
    data.experience.length > 0 ||
    data.skills.length > 0
  );

  if (!hasStructuredData) {
    if (content) return <PlainTextPreview content={content} />;
    return <div className="bg-white p-8 border border-gray-200 rounded-lg text-center text-gray-500">No data to preview</div>;
  }

  return (
    <div className="bg-white p-8 border border-gray-200 rounded-lg">
      {/* Header */}
      <div className="border-b-4 pb-4 mb-4" style={{ borderColor: colors.primary }}>
        <h1 className="text-4xl font-bold mb-2" style={{ color: colors.primary }}>
          {data.personalInfo.name || 'Your Name'}
        </h1>
        <p className="text-xl mb-2" style={{ color: colors.secondary }}>
          {data.personalInfo.title || 'Professional Title'}
        </p>
        <div className="flex flex-wrap gap-3 text-sm text-gray-600">
          {data.personalInfo.email && <span>{data.personalInfo.email}</span>}
          {data.personalInfo.phone && <span>•</span>}
          {data.personalInfo.phone && <span>{data.personalInfo.phone}</span>}
          {data.personalInfo.location && <span>•</span>}
          {data.personalInfo.location && <span>{data.personalInfo.location}</span>}
        </div>
      </div>

      {/* Summary */}
      {data.summary && (
        <div className="mb-6">
          <h2 className="text-xl font-bold mb-2" style={{ color: colors.primary }}>
            Professional Summary
          </h2>
          <p className="text-gray-700 text-sm leading-relaxed">{data.summary}</p>
        </div>
      )}

      {/* Experience */}
      {data.experience.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xl font-bold mb-3" style={{ color: colors.primary }}>
            Experience
          </h2>
          {data?.experience.map((exp: Experience) => (
            <div key={exp.id} className="mb-4">
              <div className="flex justify-between items-start mb-1">
                <div>
                  <h3 className="font-semibold">{exp.position || 'Position'}</h3>
                  <p className="text-sm" style={{ color: colors.secondary }}>
                    {exp.company || 'Company'}
                  </p>
                </div>
                <div className="text-right text-xs text-gray-600">
                  <p>{exp.location}</p>
                  <p>{exp.startDate} - {exp.current ? 'Present' : exp.endDate}</p>
                </div>
              </div>
              {exp.achievements && exp.achievements.length > 0 && (
                <ul className="list-disc ml-5 space-y-1">
                  {exp.achievements.filter((a: string) => a).map((achievement: string, i: number) => (
                    <li key={i} className="text-sm text-gray-700">{achievement}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Education */}
      {data.education.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xl font-bold mb-3" style={{ color: colors.primary }}>
            Education
          </h2>
          {data?.education.map((edu: Education, i: number) => (
            <div key={i} className="mb-2">
              <h3 className="font-semibold text-sm">{edu.degree} {edu.field && `in ${edu.field}`}</h3>
              <p className="text-sm" style={{ color: colors.secondary }}>{edu.school}</p>
              <p className="text-xs text-gray-600">
                {edu.location && `${edu.location} • `}
                {edu.graduationDate}
                {edu.gpa && ` • GPA: ${edu.gpa}`}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Skills */}
      {data.skills.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xl font-bold mb-2" style={{ color: colors.primary }}>
            Skills
          </h2>
          <div className="flex flex-wrap gap-2">
            {data?.skills.map((skill: string, i: number) => (
              <span
                key={i}
                className="px-3 py-1 rounded-full text-xs font-medium"
                style={{
                  backgroundColor: `${colors.primary}20`,
                  color: colors.primary
                }}
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Certifications */}
      {data.certifications && data.certifications.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xl font-bold mb-2" style={{ color: colors.primary }}>Certifications</h2>
          <ul className="list-disc ml-5 space-y-1">
            {data.certifications.map((cert, i) => (
              <li key={i} className="text-sm text-gray-700">{cert}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Projects */}
      {data.projects && data.projects.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xl font-bold mb-3" style={{ color: colors.primary }}>Projects</h2>
          {data.projects.map((proj) => (
            <div key={proj.id} className="mb-3">
              <h3 className="font-semibold text-sm">{proj.name}</h3>
              {proj.technologies && <p className="text-xs" style={{ color: colors.secondary }}>{proj.technologies}</p>}
              {proj.description && <p className="text-sm text-gray-700 mt-1">{proj.description}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Languages */}
      {data.languages && data.languages.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xl font-bold mb-2" style={{ color: colors.primary }}>Languages</h2>
          <p className="text-sm text-gray-700">{data.languages.join(' · ')}</p>
        </div>
      )}
    </div>
  );
}

// Tailor View Component
function TailorView({ resume, resumes, saveResumes, showNotification, intakeContext }: {
  resume: Resume | null;
  resumes: Resume[];
  saveResumes: (resumes: Resume[]) => void;
  showNotification: (type: 'success' | 'error' | 'info', message: string) => void;
  intakeContext?: IntakeContext;
}) {
  const [jobPosting, setJobPosting] = useState<string>('');
  const [tailoredContent, setTailoredContent] = useState<string>('');
  const [editableTailored, setEditableTailored] = useState<string>('');
  const [whatChanged, setWhatChanged] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [savedResumeId, setSavedResumeId] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [saved, setSaved] = useState<boolean>(false);
  const [tailorError, setTailorError] = useState<string | null>(null);

  // Convert structured resume data to readable plain text for the AI prompt
  function serializeResume(r: Resume): string {
    if (r.content) return r.content;
    if (!r.data) return "";
    const d = r.data;
    const lines: string[] = [];
    if (d.personalInfo.name) lines.push(d.personalInfo.name);
    if (d.personalInfo.title) lines.push(d.personalInfo.title);
    const contact = [d.personalInfo.email, d.personalInfo.phone, d.personalInfo.location]
      .filter(Boolean).join(" | ");
    if (contact) lines.push(contact);
    if (d.personalInfo.linkedin) lines.push(d.personalInfo.linkedin);
    if (d.summary) {
      lines.push("\nPROFESSIONAL SUMMARY");
      lines.push(d.summary);
    }
    if (d.experience.length > 0) {
      lines.push("\nEXPERIENCE");
      d.experience.forEach((exp) => {
        lines.push(`\n${exp.position} | ${exp.company}${exp.location ? ` | ${exp.location}` : ""}`);
        lines.push(`${exp.startDate} – ${exp.current ? "Present" : exp.endDate}`);
        exp.achievements.filter(Boolean).forEach((a) => lines.push(`• ${a}`));
      });
    }
    if (d.education.length > 0) {
      lines.push("\nEDUCATION");
      d.education.forEach((edu) => {
        lines.push(`${edu.degree}${edu.field ? ` in ${edu.field}` : ""} — ${edu.school}`);
        if (edu.graduationDate) lines.push(edu.graduationDate);
      });
    }
    if (d.skills.length > 0) {
      lines.push("\nSKILLS");
      lines.push(d.skills.join(" • "));
    }
    if (d.certifications && d.certifications.length > 0) {
      lines.push("\nCERTIFICATIONS");
      d.certifications.forEach((c) => lines.push(`• ${c}`));
    }
    if (d.projects && d.projects.length > 0) {
      lines.push("\nPROJECTS");
      d.projects.forEach((p) => {
        lines.push(`\n${p.name}${p.technologies ? ` | ${p.technologies}` : ""}`);
        if (p.description) lines.push(p.description);
      });
    }
    if (d.languages && d.languages.length > 0) {
      lines.push("\nLANGUAGES");
      lines.push(d.languages.join(" • "));
    }
    return lines.join("\n");
  }

  const handleTailor = async (): Promise<void> => {
    setTailorError(null);
    if (!jobPosting.trim()) {
      showNotification('error', 'Please paste a job description');
      return;
    }
    if (!resume) {
      showNotification('error', 'No resume selected');
      return;
    }

    setIsProcessing(true);
    setSaved(false);
    setSavedResumeId(null);

    try {
      const resumeContent = serializeResume(resume);
      const res = await fetch('/api/resumes/tailor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeContent,
          resumeName: resume.name,
          jobDescription: jobPosting,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Tailoring failed');
      }

      const result = await res.json();
      setTailoredContent(result.tailoredContent);
      setEditableTailored(result.tailoredContent);
      setWhatChanged(result.whatChanged || []);
      setSuggestions(result.suggestions || []);
      if (result.savedResume?.id) {
        setSavedResumeId(result.savedResume.id);
        setSaved(true);
      }
      showNotification('success', 'Resume tailored successfully!');
    } catch (error) {
      console.error('Tailor error:', error);
      setTailorError((error as Error).message || 'Failed to tailor resume. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const [savingToLibrary, setSavingToLibrary] = useState(false);

  const saveToLibrary = async (): Promise<void> => {
    if (!resume || !editableTailored) return;
    setSavingToLibrary(true);
    try {
      const saved_record = await apiCreate({
        name: `${resume.name} (Tailored)`,
        targetRole: '',
        content: editableTailored,
      });
      const tailoredResume: Resume = {
        id: saved_record.id,
        backendId: saved_record.id,
        name: saved_record.name,
        content: editableTailored,
        source: 'tailored' as const,
        template: resume.template,
        createdAt: saved_record.createdAt,
        lastModified: saved_record.updatedAt,
        data: undefined,
      };
      saveResumes([...resumes, tailoredResume]);
      setSaved(true);
      showNotification('success', 'Saved to your resume library');
    } catch {
      showNotification('error', 'Failed to save — please try again');
    } finally {
      setSavingToLibrary(false);
    }
  };

  const runwayBannerConfig = intakeContext?.runwayRiskLevel === "high"
    ? { bg: "bg-red-50 border-red-200", text: "text-red-700", label: "Optimizing for speed — short runway detected. Keywords and match rate are prioritized." }
    : intakeContext?.runwayRiskLevel === "stable"
    ? { bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-700", label: "Optimizing for differentiation — your runway gives you room to be selective." }
    : intakeContext?.runwayRiskLevel === "medium"
    ? { bg: "bg-amber-50 border-amber-200", text: "text-amber-700", label: "Balancing keyword alignment with strong positioning." }
    : null;

  return (
    <div className="space-y-6">
      {/* Input panel */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-100 to-indigo-100 flex items-center justify-center">
            <Target className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">
              Tailor for a specific role
            </h3>
            <p className="text-xs text-gray-500">
              {resume ? `Tailoring: ${resume.name}` : 'No resume selected'}
            </p>
          </div>
        </div>

        {/* Runway context banner */}
        {runwayBannerConfig && (
          <div className={`mt-4 mb-5 flex items-start gap-2.5 px-4 py-3 rounded-lg border text-sm ${runwayBannerConfig.bg} ${runwayBannerConfig.text}`}>
            <Sparkles className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{runwayBannerConfig.label}</span>
          </div>
        )}

        <div className="mt-5">
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
            Paste the job description
          </label>
          <textarea
            value={jobPosting}
            onChange={(e) => setJobPosting(e.target.value)}
            className="w-full h-56 text-sm px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 resize-y text-gray-800 placeholder-gray-400"
            placeholder="Paste the full job posting here — the more detail, the better the tailoring…"
          />
        </div>

        <button
          onClick={handleTailor}
          disabled={isProcessing || !resume}
          className="mt-4 w-full px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:shadow-lg hover:shadow-violet-200 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2"
        >
          {isProcessing ? (
            <>
              <Sparkles className="w-5 h-5 animate-spin" />
              Tailoring your resume…
            </>
          ) : (
            <>
              <Wand2 className="w-5 h-5" />
              Tailor Resume
            </>
          )}
        </button>

        {tailorError && (
          <div className="mt-4 flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <p className="flex-1 text-sm text-red-700">{tailorError}</p>
            <button onClick={handleTailor} disabled={isProcessing} className="text-xs font-medium text-red-700 hover:text-red-900 shrink-0 underline">Retry</button>
          </div>
        )}
      </div>

      {/* Results */}
      {tailoredContent && (
        <div className="space-y-4">
          {/* What changed panel */}
          {whatChanged.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-violet-500" />
                What was optimized
              </h4>
              <div className="space-y-2">
                {whatChanged.map((change, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-violet-100 text-violet-700 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </div>
                    <p className="text-sm text-gray-700 leading-snug">{change}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suggestions panel */}
          {suggestions.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
              <h4 className="text-xs font-semibold text-amber-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5" />
                Optional improvements
              </h4>
              <div className="space-y-2">
                {suggestions.map((s, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 shrink-0" />
                    <p className="text-sm text-amber-800 leading-snug">{s}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Editable tailored resume */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Tailored resume
              </h4>
              <div className="flex items-center gap-2">
                {saved && (
                  <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" /> Saved
                  </span>
                )}
                <button
                  onClick={() => { navigator.clipboard.writeText(editableTailored); showNotification('success', 'Copied to clipboard!'); }}
                  className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 px-2.5 py-1.5 border border-gray-200 rounded-lg transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" /> Copy
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-400 mb-3">You can edit the content below before saving.</p>
            <textarea
              value={editableTailored}
              onChange={(e) => setEditableTailored(e.target.value)}
              className="w-full min-h-96 text-sm px-3 py-2.5 border border-gray-200 rounded-lg font-mono leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-violet-500 text-gray-800"
            />
            <div className="mt-4 flex gap-2.5">
              {!saved ? (
                <button
                  onClick={saveToLibrary}
                  disabled={savingToLibrary}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:shadow-lg hover:shadow-violet-200 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-all"
                >
                  {savingToLibrary ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Saving…
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save as new version
                    </>
                  )}
                </button>
              ) : (
                <div className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-50 text-emerald-700 text-sm font-medium rounded-xl border border-emerald-200">
                  <CheckCircle className="w-4 h-4" />
                  {savedResumeId ? "Saved to your library" : "Saved locally"}
                </div>
              )}
              <button
                onClick={() => { setTailoredContent(''); setEditableTailored(''); setWhatChanged([]); setSuggestions([]); setSaved(false); setSavedResumeId(null); }}
                className="px-4 py-2.5 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-xl transition-colors"
              >
                Start over
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!tailoredContent && !isProcessing && (
        <div className="border-2 border-dashed border-gray-200 rounded-2xl p-10 text-center">
          <div className="w-14 h-14 bg-violet-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Wand2 className="w-7 h-7 text-violet-400" />
          </div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2">
            Your tailored resume will appear here
          </h4>
          <p className="text-xs text-gray-400 max-w-sm mx-auto leading-relaxed">
            Paste a job description above and click Tailor Resume. The AI will rewrite your resume to match the role — and explain every change.
          </p>
        </div>
      )}
    </div>
  );
}