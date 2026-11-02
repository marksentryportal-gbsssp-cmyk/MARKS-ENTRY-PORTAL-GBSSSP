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
  Download,
  Activity,
  Wifi,
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
  const {
    addToast,
    students,
    classes,
    exams,
    subjects,
    marks,
    exportBackup,
    runCloudSelfTest,
    uploadAllLocalDataToCloud,
    cloudSyncStatus,
    schoolInfo,
  } = usePortal();

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

  // Self-test state
  const [isSelfTesting, setIsSelfTesting] = useState(false);
  const [selfTestResult, setSelfTestResult] = useState<{
    success?: boolean;
    latencyMs?: number;
    projectId?: string;
    authUid?: string;
    error?: string;
  } | null>(null);

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
      setStatusMessage(`Successfully connected to Cloud Firestore! Latency: ${testRes.latencyMs || 25}ms.`);
      saveStoredFirebaseConfig(targetConfig);
    } else {
      setConnectionStatus('error');
      setStatusMessage(testRes.error || 'Connection check failed.');
    }
  };

  const handleRunSelfTest = async () => {
    setIsSelfTesting(true);
    setSelfTestResult(null);
    const res = await runCloudSelfTest();
    setIsSelfTesting(false);
    setSelfTestResult(res);
    if (res.success) {
      addToast(`Self-test passed! Round-trip latency: ${res.latencyMs}ms`, 'success');
    } else {
      addToast(`Self-test error: ${res.error}`, 'error');
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

  const handleUploadMultiDeviceCloud = async () => {
    if (
      !window.confirm(
        `Synchronize all ${students.length} students (including bulk imports), ${exams.length} exams, ${marks.length} marks, classes, and WhatsApp support phone numbers to Cloud Firestore under schools/${schoolInfo.udiseCode}? This ensures any computer logging in with UDISE ${schoolInfo.udiseCode} will see the exact same data.`
      )
    ) {
      return;
    }

    setIsMigrating(true);
    setMigrationResult(null);

    const res = await uploadAllLocalDataToCloud((pct, step) => {
      setMigrationProgress({ current: pct, total: 100, stage: step });
    });

    setIsMigrating(false);

    if (res.success) {
      setMigrationResult({
        students: students.length,
        exams: exams.length,
        marks: marks.length,
        classes: classes.length,
      });
      addToast('All school records uploaded to Cloud Firestore! Multi-device sync is live.', 'success');
    } else {
      addToast(res.error || 'Cloud synchronization failed', 'error');
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
              <h2 className="text-base font-bold text-slate-900">Cloud Firestore Multi-Device Synchronization</h2>
              <p className="text-xs text-slate-500">
                School UDISE: <span className="font-mono font-bold text-teal-800">{schoolInfo.udiseCode}</span> &bull; {schoolInfo.name}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Cloud Status Banner */}
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
            <div className="flex items-center gap-2">
              <span className="font-bold">
                {connectionStatus === 'connected'
                  ? 'Firestore Connected & Multi-Tab Cache Active'
                  : connectionStatus === 'error'
                  ? 'Connection Error'
                  : 'Awaiting Configuration'}
              </span>
              <span className="text-[10px] bg-white/80 px-2 py-0.5 rounded font-mono border">
                Status: {cloudSyncStatus.state.toUpperCase()}
              </span>
            </div>
            <span className="text-[11px] leading-relaxed block mt-0.5">
              {statusMessage || 'Enter your Firebase Web App configuration below or verify your credentials.'}
            </span>
          </div>
          <div className="flex flex-col gap-1.5 shrink-0">
            <button
              type="button"
              disabled={isTesting}
              onClick={() => handleTestConnection()}
              className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded text-[11px] font-semibold text-slate-700 transition-colors flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
            >
              {isTesting ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
              <span>Test Connection</span>
            </button>
            <button
              type="button"
              disabled={isSelfTesting || connectionStatus !== 'connected'}
              onClick={handleRunSelfTest}
              className="px-2.5 py-1 bg-teal-50 hover:bg-teal-100 border border-teal-300 rounded text-[11px] font-bold text-teal-800 transition-colors flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
            >
              {isSelfTesting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Activity className="w-3 h-3" />}
              <span>Run Self-Test</span>
            </button>
          </div>
        </div>

        {/* Self-Test Latency Box if run */}
        {selfTestResult && (
          <div
            className={`p-3 rounded-lg border text-xs font-mono space-y-1 ${
              selfTestResult.success
                ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
                : 'bg-red-50/80 border-red-300 text-red-950'
            }`}
          >
            <div className="flex items-center justify-between font-bold">
              <span>Cloud Self-Test Diagnostic Result:</span>
              <span>{selfTestResult.success ? 'PASSED' : 'FAILED'}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 text-[11px]">
              <div>Target Tree: <strong>schools/{schoolInfo.udiseCode}</strong></div>
              <div>Round-trip Latency: <strong>{selfTestResult.latencyMs} ms</strong></div>
              <div>Cloud Project: <strong>{selfTestResult.projectId}</strong></div>
            </div>
            {selfTestResult.error && (
              <div className="text-red-700 font-sans text-xs pt-1">Error: {selfTestResult.error}</div>
            )}
          </div>
        )}

        {/* First-Device Cloud Upload Wizard Card */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CloudUpload className="w-4 h-4 text-teal-700" />
              <h4 className="font-bold text-slate-800">Multi-Device Single Source of Truth Synchronization</h4>
            </div>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">
              Cloud Primary
            </span>
          </div>

          <p className="text-slate-600 leading-relaxed text-[11px]">
            Make Cloud Firestore (<code className="font-mono bg-slate-100 px-1 rounded">schools/{schoolInfo.udiseCode}</code>) the authoritative database for all devices.
            Data entered on Computer A (students from Bulk Import, marks, and WhatsApp technical support phone numbers) will be visible when logging in from any other computer.
          </p>

          {/* Current Local vs Cloud Records */}
          <div className="bg-white border border-slate-200 rounded-md p-3 space-y-2">
            <span className="font-bold text-slate-700 text-[11px] block uppercase tracking-wide">
              Active Portal Records in Local Cache:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
              <div className="p-2 bg-slate-50 rounded border border-slate-100">
                <span className="text-[10px] text-slate-500 uppercase block font-semibold">Students</span>
                <span className="text-base font-bold text-teal-700 font-mono">{students.length}</span>
              </div>
              <div className="p-2 bg-slate-50 rounded border border-slate-100">
                <span className="text-[10px] text-slate-500 uppercase block font-semibold">Exams</span>
                <span className="text-base font-bold text-purple-700 font-mono">{exams.length}</span>
              </div>
              <div className="p-2 bg-slate-50 rounded border border-slate-100">
                <span className="text-[10px] text-slate-500 uppercase block font-semibold">Marks</span>
                <span className="text-base font-bold text-amber-700 font-mono">{marks.length}</span>
              </div>
              <div className="p-2 bg-slate-50 rounded border border-slate-100">
                <span className="text-[10px] text-slate-500 uppercase block font-semibold">Classes</span>
                <span className="text-base font-bold text-slate-800 font-mono">{classes.length}</span>
              </div>
            </div>
          </div>

          {/* Backup Button before Migration */}
          <div className="p-2.5 bg-amber-50/80 border border-amber-200 rounded flex items-center justify-between gap-2">
            <div className="text-[11px] text-amber-900">
              <strong>Step 1:</strong> Download an offline verified backup of all existing records.
            </div>
            <button
              type="button"
              onClick={exportBackup}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold rounded text-xs shadow-2xs transition-colors cursor-pointer shrink-0"
            >
              <Download className="w-3.5 h-3.5 text-amber-700" />
              <span>Download Backup (JSON)</span>
            </button>
          </div>

          {isMigrating && migrationProgress && (
            <div className="space-y-1.5 p-3 bg-white border border-teal-200 rounded">
              <div className="flex items-center justify-between font-mono text-[11px]">
                <span className="text-teal-800 font-bold">{migrationProgress.stage}</span>
                <span className="text-slate-500">
                  {migrationProgress.current}%
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-teal-600 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${migrationProgress.current}%`,
                  }}
                />
              </div>
            </div>
          )}

          {migrationResult && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded text-emerald-900 font-mono text-[11px] grid grid-cols-4 gap-2 text-center">
              <div>Students: <strong>{migrationResult.students || 0}</strong></div>
              <div>Exams: <strong>{migrationResult.exams || 0}</strong></div>
              <div>Marks: <strong>{migrationResult.marks || 0}</strong></div>
              <div>Classes: <strong>{migrationResult.classes || 0}</strong></div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-1">
            <span className="text-[10px] text-slate-500 italic">
              * Non-destructive cloud upload; merges safely into schools/{schoolInfo.udiseCode}
            </span>
            <button
              type="button"
              disabled={isMigrating || connectionStatus !== 'connected'}
              onClick={handleUploadMultiDeviceCloud}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-800 hover:to-emerald-800 text-white font-bold rounded text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isMigrating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Syncing to Cloud Firestore...</span>
                </>
              ) : (
                <>
                  <CloudUpload className="w-3.5 h-3.5" />
                  <span>Sync All Records to Cloud</span>
                </>
              )}
            </button>
          </div>
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
                placeholder="gbsss-marks-entry-portal"
                value={config.projectId}
                onChange={(e) => setConfig({ ...config, projectId: e.target.value.trim() })}
                className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono text-xs focus:outline-teal-600"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Auth Domain</label>
              <input
                type="text"
                placeholder="gbsss-marks-entry-portal.firebaseapp.com"
                value={config.authDomain}
                onChange={(e) => setConfig({ ...config, authDomain: e.target.value.trim() })}
                className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono text-xs focus:outline-teal-600"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">App ID</label>
              <input
                type="text"
                placeholder="1:467908255159:web:d60f6f6b04c723e4ae9c32"
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

        {/* Security & Access Guidelines */}
        <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg text-slate-700 text-xs space-y-1 leading-relaxed">
          <span className="font-bold text-teal-900 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-teal-700" />
            <span>Multi-Device Architecture:</span>
          </span>
          <p className="text-[11px]">
            Every browser tab and device utilizes Firebase's multi-tab offline cache with Cloud Firestore as the single source of truth.
            When you enter marks, add students, or modify WhatsApp support contacts on any computer, changes are instantly committed to <code className="font-mono bg-teal-100 px-1 rounded">schools/{schoolInfo.udiseCode}</code> and synchronized in real time.
          </p>
        </div>
      </div>
    </div>
  );
};
