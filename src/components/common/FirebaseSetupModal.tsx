import React, { useState, useEffect } from 'react';
import {
  X,
  Flame,
  CheckCircle2,
  AlertCircle,
  Database,
  CloudUpload,
  Loader2,
  KeyRound,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import {
  getStoredFirebaseConfig,
  saveStoredFirebaseConfig,
  initializeFirebaseApp,
  getFirebaseDb,
  testFirestoreConnection,
  FirebaseWebConfig,
} from '../../services/firebase';
import { migrateLocalDataToFirestore } from '../../services/firestoreService';
import { usePortal } from '../../store/portalStore';

interface FirebaseSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FirebaseSetupModal: React.FC<FirebaseSetupModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { addToast } = usePortal();

  const [config, setConfig] = useState<FirebaseWebConfig>(() => {
    return (
      getStoredFirebaseConfig() || {
        apiKey: '',
        authDomain: '',
        projectId: '',
        storageBucket: '',
        messagingSenderId: '',
        appId: '',
      }
    );
  });

  const [isTesting, setIsTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'untested' | 'connected' | 'error'>('untested');
  const [statusMessage, setStatusMessage] = useState<string>('');

  // Migration state
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationProgress, setMigrationProgress] = useState<{ current: number; total: number; stage: string } | null>(null);
  const [migrationResult, setMigrationResult] = useState<Record<string, number> | null>(null);

  useEffect(() => {
    if (isOpen) {
      const stored = getStoredFirebaseConfig();
      if (stored) {
        setConfig(stored);
        handleTestConnection(stored);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestConnection = async (confToTest?: FirebaseWebConfig) => {
    const targetConfig = confToTest || config;
    if (!targetConfig.apiKey || !targetConfig.projectId) {
      setConnectionStatus('error');
      setStatusMessage('Please enter at least API Key and Project ID.');
      return;
    }

    setIsTesting(true);
    setConnectionStatus('untested');
    setStatusMessage('Connecting to Firebase Cloud Firestore...');

    const initRes = initializeFirebaseApp(targetConfig);
    if (!initRes.isConfigured || !initRes.db) {
      setIsTesting(false);
      setConnectionStatus('error');
      setStatusMessage(initRes.error ? String(initRes.error) : 'Failed to initialize Firebase SDK with provided credentials.');
      return;
    }

    const testRes = await testFirestoreConnection(initRes.db);
    setIsTesting(false);

    if (testRes.success) {
      setConnectionStatus('connected');
      setStatusMessage('Successfully connected to Cloud Firestore (default database)!');
      saveStoredFirebaseConfig(targetConfig);
    } else {
      setConnectionStatus('error');
      setStatusMessage(testRes.error || 'Connection check failed.');
    }
  };

  const handleSaveConfig = () => {
    if (!config.apiKey || !config.projectId) {
      addToast('API Key and Project ID are required', 'error');
      return;
    }
    saveStoredFirebaseConfig(config);
    initializeFirebaseApp(config);
    addToast('Firebase configuration saved successfully!', 'success');
    handleTestConnection(config);
  };

  const handleRunMigration = async () => {
    const db = getFirebaseDb();
    if (!db) {
      addToast('Please establish a valid Firebase connection first.', 'error');
      return;
    }

    if (!window.confirm('Run data migration to Cloud Firestore? All current students, marks, examinations, and settings will be safely uploaded. Existing local storage records will be preserved.')) {
      return;
    }

    setIsMigrating(true);
    setMigrationResult(null);

    const res = await migrateLocalDataToFirestore((prog) => {
      setMigrationProgress(prog);
    });

    setIsMigrating(false);

    if (res.success) {
      setMigrationResult(res.migratedCounts);
      addToast('Data migration to Firestore completed successfully!', 'success');
    } else {
      addToast(res.error || 'Migration failed', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-2xl w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-50 rounded-lg text-amber-600 border border-amber-200">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Firebase Cloud Firestore Connection</h2>
              <p className="text-xs text-slate-500">
                Gopinath Bordoloi Senior Secondary School, Paglahat
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Connection Status Banner */}
        <div
          className={`p-3.5 rounded-lg border text-xs flex items-start gap-3 ${
            connectionStatus === 'connected'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : connectionStatus === 'error'
              ? 'bg-red-50 border-red-300 text-red-900'
              : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}
        >
          {connectionStatus === 'connected' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          ) : connectionStatus === 'error' ? (
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          ) : (
            <Database className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <span className="font-bold block">
              {connectionStatus === 'connected'
                ? 'Firestore Connected (Live)'
                : connectionStatus === 'error'
                ? 'Connection Error'
                : 'Awaiting Configuration'}
            </span>
            <span className="text-[11px] leading-relaxed">
              {statusMessage || 'Enter your Firebase Web App configuration below or verify your credentials.'}
            </span>
          </div>
          <button
            type="button"
            disabled={isTesting}
            onClick={() => handleTestConnection()}
            className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded text-[11px] font-semibold text-slate-700 transition-colors shrink-0 flex items-center gap-1 cursor-pointer disabled:opacity-50"
          >
            {isTesting ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            <span>Test Connection</span>
          </button>
        </div>

        {/* Configuration Form */}
        <div className="space-y-3.5 text-xs">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-teal-700" />
            <span>Firebase Web App Configuration</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                API Key <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="AIzaSy..."
                value={config.apiKey}
                onChange={(e) => setConfig({ ...config, apiKey: e.target.value.trim() })}
                className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono text-xs focus:outline-teal-600"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Project ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="my-school-project"
                value={config.projectId}
                onChange={(e) => setConfig({ ...config, projectId: e.target.value.trim() })}
                className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono text-xs focus:outline-teal-600"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Auth Domain</label>
              <input
                type="text"
                placeholder="my-project.firebaseapp.com"
                value={config.authDomain}
                onChange={(e) => setConfig({ ...config, authDomain: e.target.value.trim() })}
                className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono text-xs focus:outline-teal-600"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">App ID</label>
              <input
                type="text"
                placeholder="1:123456789:web:abcdef"
                value={config.appId}
                onChange={(e) => setConfig({ ...config, appId: e.target.value.trim() })}
                className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono text-xs focus:outline-teal-600"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={handleSaveConfig}
              className="px-4 py-1.5 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded shadow-xs text-xs transition-colors cursor-pointer"
            >
              Save Configuration
            </button>
          </div>
        </div>

        {/* Data Migration Card */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CloudUpload className="w-4 h-4 text-teal-700" />
              <h4 className="font-bold text-slate-800">Safe Local-to-Firestore Data Migration</h4>
            </div>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">
              Preserves Local Records
            </span>
          </div>

          <p className="text-slate-600 leading-relaxed text-[11px]">
            Uploads your school student admissions, marks records, examination timetables, and grading settings into Cloud Firestore.
            Local browser storage is kept untouched as a secure offline backup.
          </p>

          {isMigrating && migrationProgress && (
            <div className="space-y-1.5 p-3 bg-white border border-teal-200 rounded">
              <div className="flex items-center justify-between font-mono text-[11px]">
                <span className="text-teal-800 font-bold">{migrationProgress.stage}</span>
                <span className="text-slate-500">
                  {migrationProgress.current} / {migrationProgress.total}
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-teal-600 h-1.5 rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.round((migrationProgress.current / migrationProgress.total) * 100)}%`,
                  }}
                />
              </div>
            </div>
          )}

          {migrationResult && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded text-emerald-900 font-mono text-[11px] grid grid-cols-3 gap-2 text-center">
              <div>Students: <strong>{migrationResult.students || 0}</strong></div>
              <div>Marks: <strong>{migrationResult.marks || 0}</strong></div>
              <div>Exams: <strong>{migrationResult.exams || 0}</strong></div>
            </div>
          )}

          <div className="flex justify-end pt-1">
            <button
              type="button"
              disabled={isMigrating || connectionStatus !== 'connected'}
              onClick={handleRunMigration}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#9333ea] hover:bg-[#7e22ce] text-white font-bold rounded text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isMigrating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Migrating Records...</span>
                </>
              ) : (
                <>
                  <CloudUpload className="w-3.5 h-3.5" />
                  <span>Start Safe Firestore Migration</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Security & Access Guidelines */}
        <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg text-slate-700 text-xs space-y-1 leading-relaxed">
          <span className="font-bold text-teal-900 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-teal-700" />
            <span>Super Admin & Security Rules Note:</span>
          </span>
          <p className="text-[11px]">
            Your published Firestore rules allow active Super Admin access. Log in with your Super Admin email address (or UDISE <strong>18020200403</strong> with your Super Admin password).
            The portal checks <code className="font-mono bg-teal-100 px-1 rounded">users/{'{uid}'}</code> on successful login to verify role and active status.
          </p>
        </div>
      </div>
    </div>
  );
};
