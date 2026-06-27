import React, { useState, useEffect, useCallback } from 'react';
import { Download, RefreshCw, CheckCircle, AlertCircle, X, Zap } from 'lucide-react';

type UpdateState =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'available'; version: string }
  | { status: 'downloading'; percent: number; version?: string }
  | { status: 'downloaded'; version: string }
  | { status: 'error'; message: string }
  | { status: 'up-to-date'; version: string }
  | { status: 'completed' };

const UpdateBanner: React.FC = () => {
  const [state, setState] = useState<UpdateState>({ status: 'idle' });
  const [dismissed, setDismissed] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [appVersion, setAppVersion] = useState<string>('');

  // Fetch current app version on mount and check if we just updated
  useEffect(() => {
    if (window.electron?.getAppVersion) {
      window.electron.getAppVersion().then((res: any) => {
        if (res?.version) setAppVersion(res.version);
      }).catch(() => {});
    }
    
    // Check if we just completed an update
    if (window.electron?.getUpdateCompletedStatus) {
      window.electron.getUpdateCompletedStatus().then((completed: boolean) => {
        if (completed) {
          setState({ status: 'completed' });
          setDismissed(false);
          // Hide it automatically after a few seconds
          setTimeout(() => setState(prev => prev.status === 'completed' ? { status: 'idle' } : prev), 6000);
          window.electron.clearUpdateCompletedStatus?.();
        }
      }).catch(() => {});
    }
  }, []);

  const handleUpdaterEvent = useCallback((data: any) => {
    switch (data.event) {
      case 'checking':
        setState(prev => {
          // Don't overwrite a 'downloaded' state with 'checking'
          if (prev.status === 'downloaded') return prev;
          return { status: 'checking' };
        });
        setDismissed(false);
        break;
      case 'available':
        setState(prev => {
          if (prev.status === 'downloaded') return prev;
          return { status: 'available', version: data.version };
        });
        setDismissed(false);
        break;
      case 'not-available':
        // Only show "up to date" briefly if user manually checked
        setState(prev => {
          if (prev.status === 'downloaded') return prev;
          return { status: 'up-to-date', version: data.version };
        });
        setTimeout(() => setState(prev => prev.status === 'up-to-date' ? { status: 'idle' } : prev), 4000);
        break;
      case 'progress':
        setState(prev => {
          if (prev.status === 'downloaded') return prev;
          return {
            status: 'downloading',
            percent: data.percent,
            version: prev.status === 'available' ? (prev as any).version : undefined,
          };
        });
        setDismissed(false);
        break;
      case 'downloaded':
        setState({ status: 'downloaded', version: data.version });
        setDismissed(false);
        break;
      case 'error':
        // Don't show trivial network errors — only show if meaningful
        // Also don't overwrite a 'downloaded' state with an error
        if (
          !data.message?.includes('net::ERR_') &&
          !data.message?.includes('ENOTFOUND')
        ) {
          setState(prev => {
            if (prev.status === 'downloaded') return prev;
            return { status: 'error', message: data.message };
          });
        }
        break;
    }
  }, []);

  useEffect(() => {
    if (!window.electron?.onUpdaterEvent) return;
    const unsub = window.electron.onUpdaterEvent(handleUpdaterEvent);
    return unsub;
  }, [handleUpdaterEvent]);

  const handleInstall = async () => {
    if (!window.electron?.installUpdate) return;
    setInstalling(true);
    await window.electron.installUpdate();
  };

  const handleManualCheck = () => {
    if (!window.electron?.checkForUpdates) return;
    setDismissed(false);
    setState({ status: 'checking' });
    window.electron.checkForUpdates().catch(() => {});
  };

  // Nothing to show
  if (dismissed || state.status === 'idle') return null;

  const renderContent = () => {
    switch (state.status) {
      case 'checking':
        return (
          <div className="flex items-center gap-2">
            <RefreshCw className="h-3.5 w-3.5 animate-spin text-blue-400" />
            <span className="text-xs font-medium text-gray-300">Checking for updates...</span>
          </div>
        );

      case 'available':
        return (
          <div className="flex items-center gap-2">
            <Download className="h-3.5 w-3.5 text-blue-400 animate-pulse" />
            <span className="text-xs font-medium text-gray-200">
              Update <span className="text-blue-300 font-semibold">v{state.version}</span> downloading...
            </span>
          </div>
        );

      case 'downloading':
        return (
          <div className="flex items-center gap-2 min-w-0">
            <Download className="h-3.5 w-3.5 text-blue-400 shrink-0" />
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="text-xs font-medium text-gray-300 whitespace-nowrap">
                Downloading update...
              </span>
              {/* Progress bar */}
              <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden min-w-[60px] max-w-[100px]">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-400 rounded-full transition-all duration-300"
                  style={{ width: `${state.percent}%` }}
                />
              </div>
              <span className="text-xs text-blue-300 font-mono whitespace-nowrap">{state.percent}%</span>
            </div>
          </div>
        );

      case 'downloaded':
        return (
          <div className="flex items-center gap-2">
            <Zap className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-xs font-medium text-gray-200">
              <span className="text-emerald-300 font-semibold">v{state.version}</span> ready to install (Test build)
            </span>
            <button
              onClick={handleInstall}
              disabled={installing}
              className="ml-1 px-2.5 py-1 text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-700 text-white rounded-md transition-all duration-150 shadow-sm flex items-center gap-1"
            >
              {installing ? (
                <>
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  Restarting...
                </>
              ) : (
                <>
                  <RefreshCw className="h-3 w-3" />
                  Restart to install update
                </>
              )}
            </button>
          </div>
        );

      case 'completed':
        return (
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-emerald-400" />
            <span className="text-xs font-medium text-emerald-100">
              Update completed successfully! You are now on v{appVersion}
            </span>
          </div>
        );

      case 'up-to-date':
        return (
          <div className="flex items-center gap-2">
            <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-xs font-medium text-gray-300">
              You're up to date <span className="text-emerald-300">v{state.version}</span>
            </span>
          </div>
        );

      case 'error':
        return (
          <div className="flex items-center gap-2">
            <AlertCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />
            <div className="flex flex-col">
              <span className="text-xs font-bold text-red-300">Update failed</span>
              <span className="text-[10px] text-gray-300 max-w-[250px] truncate" title={state.message}>
                {state.message || "Unknown error"}
              </span>
            </div>
            <button
              onClick={handleManualCheck}
              className="ml-2 px-2 py-1 text-xs bg-gray-800 hover:bg-gray-700 text-white rounded transition-colors"
            >
              Retry
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  const isDismissable = state.status !== 'downloading' && state.status !== 'checking';
  const isImportant = state.status === 'downloaded';

  return (
    <div
      className={`
        flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm
        border transition-all duration-300 select-none
        ${isImportant
          ? 'bg-emerald-950/80 border-emerald-700/60 shadow-[0_0_12px_rgba(16,185,129,0.15)]'
          : 'bg-gray-900/80 border-gray-700/50'
        }
        backdrop-blur-sm
      `}
    >
      {renderContent()}

      {/* Dismiss button */}
      {isDismissable && state.status !== 'up-to-date' && (
        <button
          onClick={() => setDismissed(true)}
          className="ml-1 p-0.5 rounded text-gray-500 hover:text-gray-300 transition-colors"
          title="Dismiss"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
};

export default UpdateBanner;
