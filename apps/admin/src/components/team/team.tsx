"use client";

import {
  PASSWORD_LENGTH,
  ROLES,
  ValidationError,
  deniedReason,
  errorMessage,
  passwordProblem,
  type Role,
  type TeamMember,
} from "@Stratford-city-motorcars-Ltd/core";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Check, Copy, Eye, EyeOff, KeyRound, RotateCcw, Send, ShieldCheck, Sparkles, UserMinus, UserPlus } from "lucide-react";

import { MemberStatusBadge, Tag } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, useConfirm } from "@/components/ui/dialog";
import { Field, Select, TextInput } from "@/components/ui/form";
import { ActionMenu, type MenuAction } from "@/components/ui/menu";
import { ErrorState, LoadingRows, Notice, PageBody, PageHeader, Panel } from "@/components/ui/page";
import { DataTable, type Column } from "@/components/ui/table";
import { notify } from "@/components/ui/toast";
import { api } from "@/lib/api";
import { formatRelative, initials } from "@/lib/format";
import { queryKeys, useAdminMutation } from "@/lib/query";
import { useSession } from "@/lib/session";

/**
 * Who can sign in, and as what. Only the owner changes anything here; staff
 * see the list so they know who to ask. Accounts are never created by
 * signing up: the owner creates each one with an email and password and
 * passes those on, and can set a new password at any time.
 */
export function Team() {
  const { user, can } = useSession();
  const manage = can("team.manage");
  const confirm = useConfirm();
  const { data, isPending, error, refetch } = useQuery({ queryKey: queryKeys.team, queryFn: () => api.team.list() });
  const [inviting, setInviting] = useState(false);
  const [changingRole, setChangingRole] = useState<TeamMember | null>(null);
  const [settingPassword, setSettingPassword] = useState<TeamMember | null>(null);

  const update = useAdminMutation(({ id, input }: { id: string; input: Parameters<typeof api.team.update>[1] }) => api.team.update(id, input), {
    failure: "Nothing was changed",
  });
  const resend = useAdminMutation((id: string) => api.team.resendInvite(id), { success: "Invitation sent again", failure: "The invitation was not sent" });

  const deactivate = async (member: TeamMember) => {
    const ok = await confirm({
      title: `Deactivate ${member.name}?`,
      body: "They are signed out and can no longer sign in. Their notes and history keep their name. Open enquiries they were handling become unassigned.",
      confirmLabel: "Deactivate",
      tone: "danger",
    });
    if (ok) update.mutate({ id: member.id, input: { status: "deactivated" } }, { onSuccess: () => notify.success(`${member.name} deactivated`) });
  };

  const reactivate = (member: TeamMember) =>
    update.mutate({ id: member.id, input: { status: "active" } }, { onSuccess: () => notify.success(`${member.name} can sign in again`) });

  const menu = (member: TeamMember): MenuAction[] => {
    const self = member.id === user.id;
    return [
      { label: "Change role", icon: <ShieldCheck />, onSelect: () => setChangingRole(member), hidden: member.status === "deactivated" },
      { label: "Set password", icon: <KeyRound />, onSelect: () => setSettingPassword(member), hidden: member.status === "deactivated" },
      { label: "Send invitation again", icon: <Send />, onSelect: () => resend.mutate(member.id), hidden: member.status !== "invited" },
      { label: "Reactivate", icon: <RotateCcw />, onSelect: () => reactivate(member), hidden: member.status !== "deactivated" },
      "separator",
      {
        label: member.status === "invited" ? "Cancel invitation" : "Deactivate",
        icon: <UserMinus />,
        tone: "danger",
        onSelect: () => void deactivate(member),
        hidden: member.status === "deactivated",
        disabled: self,
        reason: self ? "You cannot deactivate yourself." : undefined,
      },
    ];
  };

  const members = [...(data ?? [])].sort((a, b) => {
    const order = { active: 0, invited: 1, deactivated: 2 } as const;
    return order[a.status] - order[b.status] || a.name.localeCompare(b.name);
  });

  const columns: Column<TeamMember>[] = [
    {
      id: "name",
      header: "Name",
      cell: (member) => (
        <div className="flex items-center gap-3">
          <span aria-hidden className="flex size-9 shrink-0 items-center justify-center bg-ink-100 text-xs font-medium">
            {initials(member.name)}
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium">
              {member.name}
              {member.id === user.id ? <span className="ml-2 text-xs font-normal text-ink-500">You</span> : null}
            </p>
            <p className="truncate text-xs text-ink-500">{member.email}</p>
          </div>
        </div>
      ),
    },
    { id: "role", header: "Role", cell: (member) => <Tag>{ROLES.find((role) => role.value === member.role)?.label}</Tag> },
    { id: "status", header: "Status", cell: (member) => <MemberStatusBadge status={member.status} /> },
    {
      id: "active",
      header: "Last signed in",
      minWidth: "lg",
      cell: (member) => <span className="text-[0.8125rem] text-ink-600">{member.lastActiveAt ? formatRelative(member.lastActiveAt) : member.status === "invited" ? "Not yet accepted" : "Never"}</span>,
    },
  ];

  return (
    <PageBody>
      <PageHeader
        eyebrow="Business"
        title="Team"
        description="Everyone who can sign in to this admin."
        actions={
          manage ? (
            <Button variant="primary" onClick={() => setInviting(true)}>
              <UserPlus aria-hidden />
              Add team member
            </Button>
          ) : null
        }
      />

      {!manage ? <Notice className="mb-5">{deniedReason("team.manage")} Ask them to add someone, change a role or set a new password.</Notice> : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0">
          {error ? (
            <ErrorState error={error} onRetry={() => void refetch()} title="The team could not be loaded" />
          ) : isPending ? (
            <LoadingRows rows={3} thumb={false} label="Loading the team" />
          ) : (
            <DataTable
              caption="Team"
              rows={members}
              columns={columns}
              rowKey={(member) => member.id}
              sortable={false}
              rowClassName={(member) => (member.status === "deactivated" ? "bg-surface/60" : "")}
              actions={manage ? (member) => <ActionMenu label={`Actions for ${member.name}`} actions={menu(member)} /> : undefined}
              renderCard={(member) => (
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {member.name}
                    {member.id === user.id ? <span className="ml-2 text-xs font-normal text-ink-500">You</span> : null}
                  </p>
                  <p className="truncate text-xs text-ink-500">{member.email}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <Tag>{ROLES.find((role) => role.value === member.role)?.label}</Tag>
                    <MemberStatusBadge status={member.status} />
                  </div>
                </div>
              )}
            />
          )}
        </div>

        <Panel title="What each role can do">
          <ul className="space-y-4">
            {ROLES.map((role) => (
              <li key={role.value}>
                <p className="text-sm font-medium">{role.label}</p>
                <p className="mt-0.5 text-[0.8125rem] leading-relaxed text-ink-600">{role.summary}</p>
              </li>
            ))}
          </ul>
          <p className="mt-5 border-t border-border pt-4 text-xs leading-relaxed text-ink-500">
            Every account signs in with its own email address. Don&rsquo;t share a login — notes and changes are recorded under the person who made them.
          </p>
        </Panel>
      </div>

      {inviting ? <InviteDialog onClose={() => setInviting(false)} /> : null}
      {changingRole ? <RoleDialog member={changingRole} onClose={() => setChangingRole(null)} /> : null}
      {settingPassword ? <PasswordDialog member={settingPassword} onClose={() => setSettingPassword(null)} /> : null}
    </PageBody>
  );
}

/** A readable random password: no look-alike characters, 16 long. */
function generatePassword(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

/** Password entry for the owner: show/hide, generate, and copy to pass it on. */
function PasswordField({ value, onChange, error, label = "Password" }: { value: string; onChange: (value: string) => void; error?: string; label?: string }) {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      notify.error("Could not copy", "Select the password and copy it yourself.");
    }
  };

  return (
    <Field
      label={label}
      required
      error={error}
      description={`At least ${PASSWORD_LENGTH.min} characters. Give it to them in person or by a private message, not in a shared chat.`}
      action={
        <button
          type="button"
          onClick={() => {
            onChange(generatePassword());
            setVisible(true);
          }}
          className="inline-flex items-center gap-1 text-xs font-medium text-ink-700 underline-offset-2 hover:underline"
        >
          <Sparkles className="size-3.5" aria-hidden />
          Generate
        </button>
      }
    >
      {(c) => (
        <div className="relative">
          <TextInput
            {...c}
            type={visible ? "text" : "password"}
            autoComplete="new-password"
            spellCheck={false}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="pr-20 font-mono"
          />
          <div className="absolute top-1/2 right-0.5 flex -translate-y-1/2">
            <button
              type="button"
              onClick={() => void copy()}
              disabled={!value}
              aria-label={copied ? "Copied" : "Copy password"}
              className="flex size-10 items-center justify-center text-ink-500 hover:text-foreground disabled:opacity-40"
            >
              {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
            </button>
            <button
              type="button"
              onClick={() => setVisible((current) => !current)}
              aria-label={visible ? "Hide password" : "Show password"}
              aria-pressed={visible}
              className="flex size-10 items-center justify-center text-ink-500 hover:text-foreground"
            >
              {visible ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
            </button>
          </div>
        </div>
      )}
    </Field>
  );
}

function InviteDialog({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("staff");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const mutation = useAdminMutation(() => api.team.invite({ name, email, role, password }), {
    success: (member) => `Account created for ${member.name}`,
    successDetail: "They can sign in now with that email address and password.",
    onSuccess: onClose,
  });

  const submit = () => {
    const local: Record<string, string> = {};
    if (name.trim().length < 2) local.name = "Add their name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) local.email = "That doesn't look like an email address.";
    const weak = passwordProblem(password);
    if (weak) local.password = weak;
    setErrors(local);
    if (Object.keys(local).length) return;
    mutation.mutate(undefined, { onError: (error) => error instanceof ValidationError && setErrors(error.fields) });
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title="Add a team member"
      description="Create their login here and pass the email address and password on to them. Nobody can sign up on their own."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} busy={mutation.isPending}>
            <UserPlus aria-hidden />
            Create account
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Name" required error={errors.name}>
          {(c) => <TextInput {...c} value={name} autoComplete="off" onChange={(e) => setName(e.target.value)} data-autofocus />}
        </Field>
        <Field label="Email address" required error={errors.email} description="They sign in with this address.">
          {(c) => <TextInput {...c} type="email" inputMode="email" autoCapitalize="none" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} />}
        </Field>
        <PasswordField value={password} onChange={setPassword} error={errors.password} />
        <Field label="Role" description={ROLES.find((item) => item.value === role)?.summary}>
          {(c) => (
            <Select {...c} value={role} onChange={(e) => setRole(e.target.value as Role)}>
              {ROLES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </Select>
          )}
        </Field>
        {mutation.error && !(mutation.error instanceof ValidationError && Object.keys(mutation.error.fields).length) ? (
          <p role="alert" className="text-sm text-destructive">
            {errorMessage(mutation.error)}
          </p>
        ) : null}
      </div>
    </Dialog>
  );
}

function PasswordDialog({ member, onClose }: { member: TeamMember; onClose: () => void }) {
  const { user } = useSession();
  const self = member.id === user.id;
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | undefined>();
  const mutation = useAdminMutation(() => api.team.update(member.id, { password }), {
    success: self ? "Your password was changed" : `New password set for ${member.name}`,
    successDetail: self ? "Other devices you were signed in on have been signed out." : "They are signed out everywhere and sign in with the new password.",
    onSuccess: onClose,
  });

  const submit = () => {
    const weak = passwordProblem(password);
    setError(weak ?? undefined);
    if (weak) return;
    mutation.mutate(undefined, { onError: (failure) => failure instanceof ValidationError && setError(failure.fields.password) });
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title={self ? "Change your password" : `Set a new password for ${member.name}`}
      description={
        self
          ? "You stay signed in here; any other devices are signed out."
          : `${member.email} signs in with this password from now on. Their current sessions end.`
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} busy={mutation.isPending}>
            <KeyRound aria-hidden />
            Save password
          </Button>
        </>
      }
    >
      <PasswordField label="New password" value={password} onChange={setPassword} error={error} />
      {mutation.error && !(mutation.error instanceof ValidationError && mutation.error.fields.password) ? (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {errorMessage(mutation.error)}
        </p>
      ) : null}
    </Dialog>
  );
}

function RoleDialog({ member, onClose }: { member: TeamMember; onClose: () => void }) {
  const [role, setRole] = useState<Role>(member.role);
  const mutation = useAdminMutation(() => api.team.update(member.id, { role }), {
    success: "Role changed",
    successDetail: "It takes effect the next time they load a page.",
    onSuccess: onClose,
  });
  return (
    <Dialog
      open
      onClose={onClose}
      title={`Change ${member.name}'s role`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => mutation.mutate(undefined)} busy={mutation.isPending} disabled={role === member.role}>
            Change role
          </Button>
        </>
      }
    >
      <fieldset className="space-y-2">
        <legend className="sr-only">Role</legend>
        {ROLES.map((item) => (
          <label key={item.value} className={`flex cursor-pointer items-start gap-3 border px-3 py-3 transition-colors ${role === item.value ? "border-ink-950 bg-ink-50" : "border-border hover:border-ink-400"}`}>
            <input type="radio" name="role" checked={role === item.value} onChange={() => setRole(item.value)} className="mt-1 accent-ink-950" />
            <span>
              <span className="block text-sm font-medium">{item.label}</span>
              <span className="block text-[0.8125rem] text-ink-600">{item.summary}</span>
            </span>
          </label>
        ))}
      </fieldset>
      {mutation.error ? (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {errorMessage(mutation.error)}
        </p>
      ) : null}
    </Dialog>
  );
}
