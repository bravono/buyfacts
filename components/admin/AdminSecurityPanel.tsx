"use client";

import React, { useCallback, useEffect, useState } from "react";
import styles from "@/app/admin/admin.module.css";
import {
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  Users,
  Activity,
  RefreshCw,
  Smartphone,
  UserPlus,
  Power,
  RotateCcw,
} from "lucide-react";

interface SecurityPanelProps {
  role: string;
  currentUserId?: string;
}

interface Account {
  id: number;
  email: string;
  name: string | null;
  role: string;
  isActive: boolean;
  twoFactorEnabled?: boolean;
  lastLoginAt?: string | null;
}

interface AuditEntry {
  id: string;
  action: string;
  actorEmail: string | null;
  actorRole: string | null;
  target: string | null;
  targetId: string | null;
  status: string;
  metadata: unknown;
  ip: string | null;
  createdAt: string;
}

const ROLE_OPTIONS = ["super_admin", "admin", "editor", "user"];

const PASSWORD_HINT = "At least 12 characters, with upper and lower case letters and a number.";

export default function AdminSecurityPanel({ role, currentUserId }: SecurityPanelProps) {
  const isSuper = role === "super_admin";

  // Password change
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // 2FA
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [setupSecret, setSetupSecret] = useState("");
  const [setupUri, setSetupUri] = useState("");
  const [setupCode, setSetupCode] = useState("");
  const [disablePassword, setDisablePassword] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [twoFactorMsg, setTwoFactorMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Accounts (super admin)
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [activeSupers, setActiveSupers] = useState(0);
  const [accountsMsg, setAccountsMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [newAccount, setNewAccount] = useState({ email: "", name: "", role: "admin", password: "" });
  const [showNewAccount, setShowNewAccount] = useState(false);

  // Audit (super admin)
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [failedLogins, setFailedLogins] = useState(0);
  const [auditOnlyDestructive, setAuditOnlyDestructive] = useState(false);
  const [auditLoading, setAuditLoading] = useState(false);

  const loadAccount = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/account");
      const data = await res.json();
      if (data.success && data.account) {
        setTwoFactorEnabled(Boolean(data.account.twoFactorEnabled));
      }
    } catch {
      /* ignore */
    }
  }, []);

  const loadAccounts = useCallback(async () => {
    if (!isSuper) return;
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      if (data.success) {
        setAccounts(data.users || []);
        setActiveSupers(data.activeSuperAdmins || 0);
      }
    } catch {
      /* ignore */
    }
  }, [isSuper]);

  const loadAudit = useCallback(async () => {
    if (!isSuper) return;
    setAuditLoading(true);
    try {
      const params = new URLSearchParams({ limit: "60" });
      if (auditOnlyDestructive) params.set("destructive", "true");
      const res = await fetch(`/api/admin/audit?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setEntries(data.entries || []);
        setFailedLogins(data.failedLoginsLast24h || 0);
      }
    } catch {
      /* ignore */
    } finally {
      setAuditLoading(false);
    }
  }, [isSuper, auditOnlyDestructive]);

  useEffect(() => {
    loadAccount();
    loadAccounts();
  }, [loadAccount, loadAccounts]);

  useEffect(() => {
    loadAudit();
  }, [loadAudit]);

  // ---------------------------------------------------------------- password
  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);

    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: "err", text: "The new passwords do not match." });
      return;
    }

    const res = await fetch("/api/auth/account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "change_password", currentPassword, newPassword }),
    });
    const data = await res.json().catch(() => ({}));

    if (data.success) {
      setPasswordMsg({ type: "ok", text: "Password updated." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } else {
      setPasswordMsg({ type: "err", text: data.error || "Could not change the password." });
    }
  };

  // ---------------------------------------------------------------- 2FA
  const startTwoFactorSetup = async () => {
    setTwoFactorMsg(null);
    const res = await fetch("/api/auth/account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "enable_2fa" }),
    });
    const data = await res.json().catch(() => ({}));
    if (data.success) {
      setSetupSecret(data.secret);
      setSetupUri(data.otpauthUri);
    } else {
      setTwoFactorMsg({ type: "err", text: data.error || "Could not start 2FA setup." });
    }
  };

  const confirmTwoFactor = async () => {
    setTwoFactorMsg(null);
    const res = await fetch("/api/auth/account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "confirm_2fa", code: setupCode }),
    });
    const data = await res.json().catch(() => ({}));
    if (data.success) {
      setTwoFactorEnabled(true);
      setSetupSecret("");
      setSetupUri("");
      setSetupCode("");
      setTwoFactorMsg({ type: "ok", text: "Two-factor authentication is on. You will be asked for a code at every sign-in." });
      loadAccounts();
    } else {
      setTwoFactorMsg({ type: "err", text: data.error || "That code was not accepted." });
    }
  };

  const disableTwoFactor = async () => {
    setTwoFactorMsg(null);
    const res = await fetch("/api/auth/account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "disable_2fa", password: disablePassword, code: disableCode }),
    });
    const data = await res.json().catch(() => ({}));
    if (data.success) {
      setTwoFactorEnabled(false);
      setDisablePassword("");
      setDisableCode("");
      setTwoFactorMsg({ type: "ok", text: "Two-factor authentication is off." });
    } else {
      setTwoFactorMsg({ type: "err", text: data.error || "Could not disable 2FA." });
    }
  };

  // ---------------------------------------------------------------- accounts
  const createAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setAccountsMsg(null);
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newAccount),
    });
    const data = await res.json().catch(() => ({}));
    if (data.success) {
      setAccountsMsg({ type: "ok", text: data.message || "Account created." });
      setNewAccount({ email: "", name: "", role: "admin", password: "" });
      setShowNewAccount(false);
      loadAccounts();
    } else {
      setAccountsMsg({ type: "err", text: data.error || "Could not create the account." });
    }
  };

  const patchAccount = async (id: number, payload: Record<string, unknown>) => {
    setAccountsMsg(null);
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (data.success) {
      setAccountsMsg({ type: "ok", text: data.message || "Updated." });
      loadAccounts();
      loadAudit();
    } else {
      setAccountsMsg({ type: "err", text: data.error || "Could not update the account." });
    }
  };

  const resetAccountPassword = async (account: Account) => {
    const password = window.prompt(
      `Set a temporary password for ${account.email}\n\n${PASSWORD_HINT}\nShare it with them over a secure channel.`
    );
    if (!password) return;
    await patchAccount(account.id, { action: "reset_password", newPassword: password });
  };

  return (
    <div className={styles.securityGrid}>
      {/* My password */}
      <section className={styles.securityCard}>
        <h3 className={styles.securityCardTitle}>
          <KeyRound size={16} /> My password
        </h3>
        <p className={styles.securityCardHint}>{PASSWORD_HINT}</p>
        {passwordMsg && (
          <div className={passwordMsg.type === "ok" ? styles.successBanner : styles.errorBanner}>
            {passwordMsg.text}
          </div>
        )}
        <form onSubmit={changePassword} style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          <input
            type="password"
            className={styles.formInput}
            placeholder="Current password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
          <input
            type="password"
            className={styles.formInput}
            placeholder="New password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
          <input
            type="password"
            className={styles.formInput}
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
          <button type="submit" className={styles.submitBtn}>
            Update password
          </button>
        </form>
      </section>

      {/* Two factor */}
      <section className={styles.securityCard}>
        <h3 className={styles.securityCardTitle}>
          {twoFactorEnabled ? <ShieldCheck size={16} /> : <ShieldAlert size={16} />} Two-factor authentication
        </h3>
        <p className={styles.securityCardHint}>
          {twoFactorEnabled
            ? "On. A 6-digit code from your authenticator app is required at every sign-in."
            : "Recommended. Even if your password leaks, nobody can sign in without your phone."}
        </p>
        {twoFactorMsg && (
          <div className={twoFactorMsg.type === "ok" ? styles.successBanner : styles.errorBanner}>
            {twoFactorMsg.text}
          </div>
        )}

        {!twoFactorEnabled && !setupSecret && (
          <button type="button" className={styles.submitBtn} onClick={startTwoFactorSetup}>
            <Smartphone size={14} /> Set up 2FA
          </button>
        )}

        {!twoFactorEnabled && setupSecret && (
          <div className={styles.twoFactorBox}>
            <p className={styles.securityCardHint}>
              1. Add this key to your authenticator app (Google Authenticator, 1Password, Authy…).
            </p>
            <div className={styles.secretCode}>{setupSecret}</div>
            {setupUri && (
              <p className={styles.securityCardHint}>
                Or paste this link into the app: <span className={styles.secretCode}>{setupUri}</span>
              </p>
            )}
            <p className={styles.securityCardHint}>2. Enter the 6-digit code the app shows:</p>
            <input
              className={styles.formInput}
              inputMode="numeric"
              maxLength={6}
              placeholder="123456"
              value={setupCode}
              onChange={(e) => setSetupCode(e.target.value.replace(/\D/g, ""))}
            />
            <button type="button" className={styles.submitBtn} onClick={confirmTwoFactor}>
              Confirm and enable
            </button>
          </div>
        )}

        {twoFactorEnabled && (
          <div className={styles.twoFactorBox}>
            <p className={styles.securityCardHint}>To turn it off, confirm your password and a current code.</p>
            <input
              type="password"
              className={styles.formInput}
              placeholder="Password"
              value={disablePassword}
              onChange={(e) => setDisablePassword(e.target.value)}
            />
            <input
              className={styles.formInput}
              inputMode="numeric"
              maxLength={6}
              placeholder="6-digit code"
              value={disableCode}
              onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, ""))}
            />
            <button type="button" className={styles.cancelBtn} onClick={disableTwoFactor}>
              Disable 2FA
            </button>
          </div>
        )}
      </section>

      {/* Accounts — super admin only */}
      {isSuper && (
        <section className={styles.securityCard} style={{ gridColumn: "1 / -1" }}>
          <h3 className={styles.securityCardTitle}>
            <Users size={16} /> Administrator accounts
          </h3>
          <p className={styles.securityCardHint}>
            {activeSupers} active super admin{activeSupers === 1 ? "" : "s"}. Keep at least two: if one person
            leaves or loses access, the other can still manage the portal. The last active super admin cannot be
            demoted or deactivated, and accounts are never deleted — only deactivated.
          </p>
          {accountsMsg && (
            <div className={accountsMsg.type === "ok" ? styles.successBanner : styles.errorBanner}>
              {accountsMsg.text}
            </div>
          )}

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
              <thead>
                <tr style={{ textAlign: "left", color: "var(--text-muted)" }}>
                  <th style={{ padding: "0.4rem 0.5rem" }}>Name</th>
                  <th style={{ padding: "0.4rem 0.5rem" }}>Email</th>
                  <th style={{ padding: "0.4rem 0.5rem" }}>Role</th>
                  <th style={{ padding: "0.4rem 0.5rem" }}>2FA</th>
                  <th style={{ padding: "0.4rem 0.5rem" }}>Last login</th>
                  <th style={{ padding: "0.4rem 0.5rem" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => {
                  const isMe = String(account.id) === String(currentUserId);
                  return (
                    <tr key={account.id} style={{ borderTop: "1px solid #f1f3f5" }}>
                      <td style={{ padding: "0.5rem" }}>
                        {account.name || "—"} {isMe && <span style={{ color: "var(--text-muted)" }}>(you)</span>}
                      </td>
                      <td style={{ padding: "0.5rem" }}>{account.email}</td>
                      <td style={{ padding: "0.5rem" }}>
                        <select
                          className={styles.formSelect}
                          value={account.role}
                          disabled={isMe || !account.isActive}
                          onChange={(e) => patchAccount(account.id, { action: "role", role: e.target.value })}
                        >
                          {ROLE_OPTIONS.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td style={{ padding: "0.5rem" }}>{account.twoFactorEnabled ? "On" : "—"}</td>
                      <td style={{ padding: "0.5rem", color: "var(--text-muted)" }}>
                        {account.lastLoginAt ? new Date(account.lastLoginAt).toLocaleString() : "Never"}
                      </td>
                      <td style={{ padding: "0.5rem", display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
                        <button
                          type="button"
                          className={styles.cancelBtn}
                          onClick={() => resetAccountPassword(account)}
                          title="Set a temporary password"
                        >
                          <RotateCcw size={12} /> Reset
                        </button>
                        <button
                          type="button"
                          className={styles.cancelBtn}
                          onClick={() => patchAccount(account.id, { action: "reset_2fa" })}
                          title="Clear the second factor (lost phone)"
                        >
                          Reset 2FA
                        </button>
                        {account.isActive ? (
                          <button
                            type="button"
                            className={styles.cancelBtn}
                            disabled={isMe}
                            onClick={() => patchAccount(account.id, { action: "deactivate" })}
                            title={isMe ? "You cannot deactivate yourself" : "Block this account from signing in"}
                          >
                            <Power size={12} /> Deactivate
                          </button>
                        ) : (
                          <button
                            type="button"
                            className={styles.cancelBtn}
                            onClick={() => patchAccount(account.id, { action: "activate" })}
                          >
                            <Power size={12} /> Activate
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {!showNewAccount ? (
            <button type="button" className={styles.submitBtn} onClick={() => setShowNewAccount(true)}>
              <UserPlus size={14} /> Add administrator
            </button>
          ) : (
            <form onSubmit={createAccount} className={styles.twoFactorBox}>
              <p className={styles.securityCardHint}>
                Create the account, then hand the password over in person or through a password manager. The new
                person should change it at first sign-in and turn on 2FA.
              </p>
              <input
                className={styles.formInput}
                placeholder="Full name"
                value={newAccount.name}
                onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
                required
              />
              <input
                type="email"
                className={styles.formInput}
                placeholder="Email"
                value={newAccount.email}
                onChange={(e) => setNewAccount({ ...newAccount, email: e.target.value })}
                required
              />
              <select
                className={styles.formSelect}
                value={newAccount.role}
                onChange={(e) => setNewAccount({ ...newAccount, role: e.target.value })}
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              <input
                type="password"
                className={styles.formInput}
                placeholder="Temporary password"
                value={newAccount.password}
                onChange={(e) => setNewAccount({ ...newAccount, password: e.target.value })}
                required
              />
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button type="submit" className={styles.submitBtn}>
                  Create account
                </button>
                <button type="button" className={styles.cancelBtn} onClick={() => setShowNewAccount(false)}>
                  Cancel
                </button>
              </div>
            </form>
          )}
        </section>
      )}

      {/* Audit — super admin only */}
      {isSuper && (
        <section className={styles.securityCard} style={{ gridColumn: "1 / -1" }}>
          <h3 className={styles.securityCardTitle}>
            <Activity size={16} /> Audit trail
          </h3>
          <p className={styles.securityCardHint}>
            Every sign-in, change and deletion is recorded with who did it and when.
            {failedLogins > 0 && (
              <strong style={{ color: "#c92a2a" }}> {failedLogins} failed sign-in attempt(s) in the last 24 hours.</strong>
            )}
          </p>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <label style={{ fontSize: "0.8rem", display: "flex", gap: "0.35rem", alignItems: "center" }}>
              <input
                type="checkbox"
                checked={auditOnlyDestructive}
                onChange={(e) => setAuditOnlyDestructive(e.target.checked)}
              />
              Deletions &amp; role changes only
            </label>
            <button type="button" className={styles.cancelBtn} onClick={loadAudit}>
              <RefreshCw size={12} className={auditLoading ? "spin" : ""} /> Refresh
            </button>
          </div>
          <div>
            {entries.length === 0 && <p className={styles.securityCardHint}>No audit entries yet.</p>}
            {entries.map((entry) => (
              <div key={entry.id} className={styles.auditRow}>
                <span className={styles.auditMeta}>{new Date(entry.createdAt).toLocaleString()}</span>
                <span>
                  <span className={styles.auditAction}>{entry.action}</span>
                  {entry.target && (
                    <span className={styles.auditMeta}>
                      {" "}
                      · {entry.target}
                      {entry.targetId ? ` #${entry.targetId}` : ""}
                    </span>
                  )}
                  <br />
                  <span className={styles.auditMeta}>
                    {entry.actorEmail || "system"}
                    {entry.actorRole ? ` (${entry.actorRole})` : ""}
                    {entry.status === "failure" ? " · FAILED" : ""}
                    {entry.ip ? ` · ${entry.ip}` : ""}
                  </span>
                </span>
                <span className={styles.auditMeta}>
                  {entry.metadata ? JSON.stringify(entry.metadata).slice(0, 120) : ""}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
