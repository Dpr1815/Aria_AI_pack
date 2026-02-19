import { type FormEvent, useState } from "react";
import { Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLabels } from "@/i18n";
import { useAuth } from "../hooks";
import { EMAIL_REGEX } from "../constants";

/* ── Component ───────────────────────────────────────────── */

export function LoginForm() {
  const { auth: a } = useLabels();
  const { login, loginPending, loginError, resetLoginError } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    resetLoginError();

    const errors: Record<string, string | undefined> = {};
    if (!email.trim()) errors.email = a.validation.emailRequired;
    else if (!EMAIL_REGEX.test(email)) errors.email = a.validation.emailInvalid;
    if (!password) errors.password = a.validation.passwordRequired;

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    try {
      await login({ email: email.trim(), password });
    } catch {
      /* Error is surfaced via loginError */
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <Input
        label={a.email}
        type="email"
        placeholder={a.emailPlaceholder}
        autoComplete="email"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: undefined }));
        }}
        error={fieldErrors.email}
        leftIcon={<Mail size={16} />}
      />

      <Input
        label={a.password}
        type={showPassword ? "text" : "password"}
        placeholder={a.passwordMask}
        autoComplete="current-password"
        value={password}
        onChange={(e) => {
          setPassword(e.target.value);
          if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: undefined }));
        }}
        error={fieldErrors.password}
        leftIcon={<Lock size={16} />}
        rightElement={
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPassword((p) => !p)}
            className="text-text-muted transition-colors hover:text-text"
            aria-label={showPassword ? a.hidePassword : a.showPassword}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        }
      />

      {loginError && (
        <p className="text-center text-xs text-error" role="alert">
          {loginError}
        </p>
      )}

      <Button type="submit" disabled={loginPending} className="mt-1 w-full">
        {loginPending ? (
          <Loader2 size={18} className="animate-spin" />
        ) : (
          a.login
        )}
      </Button>
    </form>
  );
}
