import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  KeyRound,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  History,
  Lock,
  Edit2,
  Power,
  RotateCcw,
  Sparkles,
  Info,
} from 'lucide-react';
import { usePortal } from '../../store/portalStore';
import { User, UserRole } from '../../types';
import { PasswordInput } from './PasswordInput';
import { sanitizeUdiseCode, isValidUdiseCode } from '../../utils/validators';

export const UserManagementTab: React.FC = () => {
  const {
    currentUser,
    users,
    addUser,
    updateUser,
    deleteUser,
    resetUserPassword,
    authAuditLogs,
    otpDeliveryMode,
    setOtpDeliveryMode,
    defaultFirstTimePassword,
    setDefaultFirstTimePassword,
    addToast,
  } = usePortal();

  // Modal states
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Form states for Add/Edit User
  const [userName, setUserName] = useState('');
  const [userCode, setUserCode] = useState('');
  const [userRole, setUserRole] = useState<UserRole>('teacher');
  const [tempPassword, setTempPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Reset password modal state
  const [resetModalUser, setResetModalUser] = useState<User | null>(null);
  const [resetTempPassword, setResetTempPassword] = useState('');

  // Handle Create User
  const handleCreateOrUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanCode = sanitizeUdiseCode(userCode);
    if (!userName.trim()) {
      setFormError('Please enter user full name.');
      return;
    }
    if (!cleanCode) {
      setFormError('Please enter School UDISE Code.');
      return;
    }
    if (!isValidUdiseCode(cleanCode)) {
      setFormError('School UDISE Code must be 11 digits');
      return;
    }

    if (editingUser) {
      updateUser(editingUser.id, {
        name: userName.trim(),
        udiseCode: cleanCode,
        role: userRole,
      });
      addToast(`User ${userName} updated successfully!`, 'success');
      setEditingUser(null);
      setIsAddUserModalOpen(false);
    } else {
      if (!tempPassword || tempPassword.length < 8) {
        setFormError('Temporary password must be at least 8 characters.');
        return;
      }
      // Check duplicate code
      const existing = users.find(
        (u) => (u.udiseCode || u.institutionCode || '').toUpperCase() === cleanCode.toUpperCase()
      );
      if (existing) {
        setFormError(`School UDISE Code "${cleanCode}" is already assigned to ${existing.name}.`);
        return;
      }

      await addUser(
        {
          udiseCode: cleanCode,
          name: userName.trim(),
          role: userRole,
          mustChangePassword: true,
          active: true,
        },
        tempPassword
      );

      addToast(`User ${userName} created with temporary password.`, 'success');
      setIsAddUserModalOpen(false);
    }

    setUserName('');
    setUserCode('');
    setUserRole('teacher');
    setTempPassword('');
  };

  // Open Edit User
  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setUserName(user.name);
    setUserCode(user.udiseCode || user.institutionCode || '');
    setUserRole(user.role);
    setFormError(null);
    setIsAddUserModalOpen(true);
  };

  // Handle Reset Password confirmation
  const handleConfirmResetPassword = async () => {
    if (!resetModalUser) return;
    if (!resetTempPassword || resetTempPassword.length < 8) {
      addToast('Temporary password must be at least 8 characters.', 'error');
      return;
    }
    await resetUserPassword(resetModalUser.id, resetTempPassword);
    addToast(
      `Password for ${resetModalUser.name} reset. User must change it on next login.`,
      'success'
    );
    setResetModalUser(null);
  };

  // Handle Delete User
  const handleDeleteUser = (user: User) => {
    if (user.id === currentUser?.id) {
      addToast('You cannot delete your own active administrator account.', 'error');
      return;
    }
    if (confirm(`Are you sure you want to delete user "${user.name}" (${user.udiseCode})?`)) {
      deleteUser(user.id);
      addToast(`User ${user.name} removed.`, 'info');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Top Banner Notice */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3 text-xs text-blue-900">
        <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold">Local Storage Security Note</p>
          <p>
            This app currently stores data in this browser only. For real multi-user security across different devices, connect a cloud database backend.
          </p>
        </div>
      </div>

      {/* 1. Global Authentication & OTP Settings */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-purple-700" />
            <h3 className="text-sm font-bold text-slate-800">
              Authentication & Security Settings
            </h3>
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* OTP Delivery Mode */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700">
              Forgot Password OTP Delivery Mode
            </label>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="radio"
                  name="otpMode"
                  value="demo"
                  checked={otpDeliveryMode === 'demo'}
                  onChange={() => setOtpDeliveryMode('demo')}
                  className="text-purple-600 focus:ring-purple-500"
                />
                <span className="font-semibold">Demo Mode (Display OTP on Screen)</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="radio"
                  name="otpMode"
                  value="live"
                  checked={otpDeliveryMode === 'live'}
                  onChange={() => setOtpDeliveryMode('live')}
                  className="text-purple-600 focus:ring-purple-500"
                />
                <span className="font-semibold">Live Mode (Masked Delivery)</span>
              </label>
            </div>
            <p className="text-[11px] text-slate-500">
              In Demo mode, OTPs are shown directly in an on-screen yellow banner. Live mode simulates sending to registered mobile/email.
            </p>
          </div>

          {/* Default First-time Password */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700">
              Default First-Time Login Password
            </label>
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={defaultFirstTimePassword}
                onChange={(e) => setDefaultFirstTimePassword(e.target.value)}
                className="w-48 px-3 py-1.5 text-xs font-mono rounded border border-slate-300 focus:border-purple-600 focus:ring-1 focus:ring-purple-600 focus:outline-hidden"
              />
              <span className="text-xs text-slate-500">
                Displayed in login helper note
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. User Accounts Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-purple-700" />
            <h3 className="text-sm font-bold text-slate-800">
              Authorized Portal Users ({users.length})
            </h3>
          </div>

          <button
            type="button"
            onClick={() => {
              setEditingUser(null);
              setUserName('');
              setUserCode('');
              setUserRole('teacher');
              setTempPassword('');
              setFormError(null);
              setIsAddUserModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#9333ea] hover:bg-[#7e22ce] text-white rounded text-xs font-bold shadow-xs cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Add New User</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <th className="py-3 px-4">User Name</th>
                <th className="py-3 px-4">School UDISE Code</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Password Status</th>
                <th className="py-3 px-4">Account Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {users.map((u) => {
                const isCurrent = u.id === currentUser?.id;
                const displayCode = u.udiseCode || u.institutionCode || '18000000000';
                return (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900 flex items-center gap-2">
                      <span>{u.name}</span>
                      {isCurrent && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 font-normal">
                          You
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-slate-700">
                      {displayCode}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-bold uppercase ${
                          u.role === 'admin'
                            ? 'bg-purple-100 text-purple-800'
                            : u.role === 'teacher'
                            ? 'bg-teal-100 text-teal-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {u.mustChangePassword ? (
                        <span className="text-amber-700 font-medium flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Must Change on Login</span>
                        </span>
                      ) : (
                        <span className="text-emerald-700 font-medium flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Active Password</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 font-semibold ${
                          u.active ? 'text-emerald-700' : 'text-slate-400'
                        }`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            u.active ? 'bg-emerald-500' : 'bg-slate-400'
                          }`}
                        />
                        {u.active ? 'Active' : 'Deactivated'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Reset Password */}
                        <button
                          type="button"
                          onClick={() => {
                            setResetModalUser(u);
                            setResetTempPassword('');
                          }}
                          className="p-1 rounded text-slate-500 hover:text-purple-700 hover:bg-purple-50 transition-colors"
                          title="Reset user password"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                        </button>

                        {/* Edit User */}
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(u)}
                          className="p-1 rounded text-slate-500 hover:text-teal-700 hover:bg-teal-50 transition-colors"
                          title="Edit user details"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Toggle Active */}
                        {!isCurrent && (
                          <button
                            type="button"
                            onClick={() => {
                              updateUser(u.id, { active: !u.active });
                              addToast(
                                `User ${u.name} ${u.active ? 'deactivated' : 'activated'}.`,
                                'info'
                              );
                            }}
                            className="p-1 rounded text-slate-500 hover:text-amber-700 hover:bg-amber-50 transition-colors"
                            title={u.active ? 'Deactivate user' : 'Activate user'}
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Delete User */}
                        {!isCurrent && (
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(u)}
                            className="p-1 rounded text-slate-500 hover:text-red-700 hover:bg-red-50 transition-colors"
                            title="Delete user"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Security & Access Audit Log */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-purple-700" />
            <h3 className="text-sm font-bold text-slate-800">
              Authentication Audit Logs ({authAuditLogs.length})
            </h3>
          </div>
        </div>

        <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 text-xs">
          {authAuditLogs.length === 0 ? (
            <div className="p-6 text-center text-slate-400">
              No authentication events logged yet.
            </div>
          ) : (
            authAuditLogs.slice(0, 20).map((log) => (
              <div key={log.id} className="px-6 py-2.5 flex items-center justify-between hover:bg-slate-50">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      log.type === 'login_success'
                        ? 'bg-emerald-500'
                        : log.type === 'login_failure'
                        ? 'bg-red-500'
                        : 'bg-purple-500'
                    }`}
                  />
                  <div>
                    <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                      {log.type.replace('_', ' ')}
                    </span>
                    <span className="text-slate-500 ml-2">
                      School UDISE Code: <strong className="text-slate-700">{log.udiseCode}</strong>
                      {log.userName && ` (${log.userName})`}
                    </span>
                    {log.details && (
                      <span className="text-slate-500 ml-2 italic">&bull; {log.details}</span>
                    )}
                  </div>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">
                  {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })},{' '}
                  {new Date(log.timestamp).toLocaleDateString()}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add / Edit User Modal */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="text-sm font-bold">
                {editingUser ? 'Edit User Details' : 'Create New Portal User'}
              </h3>
              <button
                type="button"
                onClick={() => setIsAddUserModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleCreateOrUpdateUser} className="p-6 space-y-4 text-xs">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 font-medium">
                  {formError}
                </div>
              )}

              <div className="space-y-1">
                <label className="block font-bold text-slate-700">Full Name</label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="e.g. Pranab Kumar Das"
                  className="w-full px-3 py-2 rounded border border-slate-300 text-xs focus:border-purple-600 focus:outline-hidden"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-slate-700">
                  School UDISE Code (11 Digits)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={11}
                  value={userCode}
                  onChange={(e) => setUserCode(sanitizeUdiseCode(e.target.value))}
                  placeholder="e.g. 18000000000"
                  className="w-full px-3 py-2 rounded border border-slate-300 text-xs font-mono focus:border-purple-600 focus:outline-hidden"
                  required
                />
                <p className="text-[11px] text-slate-500">
                  Must be exactly 11 digits numeric code.
                </p>
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-slate-700">Role & Access</label>
                <select
                  value={userRole}
                  onChange={(e) => setUserRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 rounded border border-slate-300 text-xs focus:border-purple-600 focus:outline-hidden bg-white"
                >
                  <option value="admin">Administrator (Full Access & Settings)</option>
                  <option value="teacher">Teacher (Marks Entry, Tabulation & Marksheets)</option>
                  <option value="viewer">Viewer (Read-Only Portal Access)</option>
                </select>
              </div>

              {!editingUser && (
                <div className="space-y-1">
                  <label className="block font-bold text-slate-700">
                    Temporary Initial Password
                  </label>
                  <input
                    type="text"
                    value={tempPassword}
                    onChange={(e) => setTempPassword(e.target.value)}
                    placeholder="Enter initial password (min. 8 characters)"
                    className="w-full px-3 py-2 rounded border border-slate-300 text-xs font-mono focus:border-purple-600 focus:outline-hidden"
                  />
                  <p className="text-[11px] text-slate-500">
                    User will be forced to choose a new password upon first login.
                  </p>
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddUserModalOpen(false)}
                  className="px-4 py-2 rounded text-slate-600 hover:bg-slate-100 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded bg-[#9333ea] hover:bg-[#7e22ce] text-white text-xs font-bold uppercase shadow-xs"
                >
                  {editingUser ? 'Save Changes' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-sm w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="text-sm font-bold">Reset User Password</h3>
              <button
                type="button"
                onClick={() => setResetModalUser(null)}
                className="text-slate-400 hover:text-white text-xs"
              >
                Cancel
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <p className="text-slate-700 leading-relaxed">
                Set a temporary password for <strong>{resetModalUser.name}</strong> (
                <code>{resetModalUser.udiseCode}</code>). The user will be required to change it on their next login.
              </p>

              <div className="space-y-1">
                <label className="block font-bold text-slate-700">Temporary Password</label>
                <input
                  type="text"
                  value={resetTempPassword}
                  onChange={(e) => setResetTempPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded border border-slate-300 font-mono text-xs focus:border-purple-600 focus:outline-hidden"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setResetModalUser(null)}
                  className="px-3.5 py-1.5 rounded text-slate-600 hover:bg-slate-100 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmResetPassword}
                  className="px-4 py-1.5 rounded bg-[#9333ea] hover:bg-[#7e22ce] text-white text-xs font-bold uppercase shadow-xs"
                >
                  Reset Password
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
