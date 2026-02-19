import { type FormEvent, useState } from "react";
import { Building2, Eye, EyeOff, Loader2, Lock, Mail, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLabels, t } from "@/i18n";
import { useAuth } from "../hooks";
import { EMAIL_REGEX, PASSWORD_MIN_LENGTH } from "../constants";

/* ── Component ───────────────────────────────────────────── */

export function SignupForm() {
  const { auth: a } = useLabels();
  const { signup, signupPending, signupError, resetSignupError } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});

  const clearFieldError = (field: string) =>
    setFieldErrors((p) => ({ ...p, [field]: undefined }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    resetSignupError();

    const errors: Record<string, string | undefined> = {};
    if (!name.trim()) errors.name = a.validation.nameRequired;
    if (!email.trim()) errors.email = a.validation.emailRequired;
    else if (!EMAIL_REGEX.test(email)) errors.email = a.validation.emailInvalid;
    if (!password) errors.password = a.validation.passwordRequired;
    else if (password.length < PASSWORD_MIN_LENGTH)
      errors.password = t(a.validation.passwordMinLength, { min: PASSWORD_MIN_LENGTH });

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    try {
      await signup({
        name: name.trim(),
        email: email.trim(),
        password,
        ...(companyName.trim() && { companyName: companyName.trim() }),
      });
    } catch {
      /* Error is surfaced via signupError */
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <Input
        label={a.fullName}
        type="text"
        placeholder={a.fullNamePlaceholder}
        autoComplete="name"
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          if (fieldErrors.name) clearFieldError("name");
        }}
        error={fieldErrors.name}
        leftIcon={<User size={16} />}
      />

      <Input
        label={a.email}
        type="email"
        placeholder={a.emailPlaceholder}
        autoComplete="email"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          if (fieldErrors.email) clearFieldError("email");
        }}
        error={fieldErrors.email}
        leftIcon={<Mail size={16} />}
      />

      <Input
        label={a.password}
        type={showPassword ? "text" : "password"}
        placeholder={a.passwordPlaceholder}
        autoComplete="new-password"
        value={password}
        onChange={(e) => {
          setPassword(e.target.value);
          if (fieldErrors.password) clearFieldError("password");
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

      <Input
        label={a.companyName}
        type="text"
        placeholder={a.companyNamePlaceholder}
        autoComplete="organization"
        value={companyName}
        onChange={(e) => setCompanyName(e.target.value)}
        leftIcon={<Building2 size={16} />}
      />

      {signupError && (
        <p className="text-center text-xs text-error" role="alert">
          {signupError}
        </p>
      )}

      <Button type="submit" disabled={signupPending} className="mt-1 w-full">
        {signupPending ? (
          <Loader2 size={18} className="animate-spin" />
        ) : (
          a.createAccount
        )}
      </Button>
    </form>
  );
}
