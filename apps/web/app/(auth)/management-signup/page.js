"use client";

import { useState } from "react";
import { z } from "zod";
import Link from "@/app/_components/AppLink";
import { useRouter } from "@/app/_hooks/navigation";
import { useAuth } from "@/app/_context/AuthContext";
import {
  AppForm,
  FieldSection,
  TextField,
  PasswordField,
  CheckboxField,
  SubmitButton,
} from "@/app/_components/forms";
import { Mail, User, Phone, Building, CheckCircle, AlertCircle } from "lucide-react";

const FEATURES = [
  "Unlimited property listings",
  "Automated rent collection",
  "Tenant screening & onboarding",
  "Maintenance request tracking",
  "Financial reporting & analytics",
  "M-Pesa & bank integrations",
];

const signupSchema = z
  .object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().min(1, "Email is required").email("Invalid email"),
    phone: z.string().optional(),
    company: z.string().optional(),
    password: z.string().min(8, "At least 8 characters"),
    confirmPassword: z.string().min(1, "Confirm your password"),
    agreeToTerms: z
      .boolean()
      .refine((v) => v === true, "Please agree to the terms of service"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export default function SignupPage() {
  const { signup } = useAuth();
  const router = useRouter();
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleSignup = async (values) => {
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const result = await signup({
        email: values.email,
        password: values.password,
        firstName: values.firstName,
        lastName: values.lastName,
        role: "Management",
      });

      if (result?.requiresEmailVerification) {
        setSuccessMsg(result.message);
        setTimeout(() => {
          router.push(
            `/verify-email?email=${encodeURIComponent(values.email)}`,
          );
        }, 1500);
      } else {
        setSuccessMsg("Account created — redirecting…");
      }
    } catch (err) {
      setErrorMsg(err.message || "Signup failed. Please try again.");
      throw err;
    }
  };

  return (
    <div className="grid w-full grid-cols-1 lg:grid-cols-12">

      <div className="relative hidden flex-col justify-between bg-blue-700 px-10 py-14 text-white lg:col-span-5 lg:flex lg:px-14 xl:px-20">
        <p className="section-label !text-white/45">— Free 30-day trial —</p>
        <div>
          <h1
            className="text-5xl font-black uppercase leading-[0.95] tracking-tight xl:text-6xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Start free.<br />
            <span className="text-white/30">No card needed.</span>
          </h1>
          <p className="mt-6 max-w-md text-base leading-relaxed text-white/55">
            Join hundreds of property managers running their portfolios on
            Makazicloud.
          </p>
        </div>
        <ul className="space-y-3 border-t border-white/10 pt-8">
          {FEATURES.map((f) => (
            <li
              key={f}
              className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.18em] text-white/70"
            >
              <span className="h-px w-6 bg-white/40" />
              {f}
            </li>
          ))}
        </ul>
      </div>


      <div className="flex items-center justify-center bg-white px-4 py-12 sm:px-6 sm:py-16 lg:col-span-7 lg:py-20">
        <div className="w-full max-w-2xl">
          <p className="section-label">— Create account —</p>
          <h2
            className="mt-3 text-3xl font-black uppercase leading-tight tracking-tight text-black sm:text-4xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Set up your workspace.
          </h2>
          <p className="mt-3  mb-3 text-sm leading-relaxed text-black/55">
            Already have an account?{" "}
            <Link
              href="/login"
              className="border-b border-blue-700/40 pb-0.5 font-bold text-black hover:border-blue-700"
            >
              Sign in
            </Link>
          </p>

          {errorMsg && (
            <div className="mt-6 flex items-start gap-3 border-l-2 border-blue-700 bg-stone-50 p-4">
              <AlertCircle
                className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-700"
                strokeWidth={1.8}
              />
              <p className="text-[12px] font-bold text-black">{errorMsg}</p>
            </div>
          )}

          {successMsg && (
            <div className="mt-6 flex items-start gap-3 border-l-2 border-blue-700 bg-stone-50 p-4">
              <CheckCircle
                className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-700"
                strokeWidth={1.8}
              />
              <p className="text-[12px] font-bold text-black">{successMsg}</p>
            </div>
          )}

          <AppForm
            schema={signupSchema}
            defaultValues={{
              firstName: "",
              lastName: "",
              email: "",
              phone: "",
              company: "",
              password: "",
              confirmPassword: "",
              agreeToTerms: false,
            }}
            onSubmit={handleSignup}
            className="mt-8 space-y-7"
          >
            <FieldSection title="Personal" columns={2}>
              <TextField
                name="firstName"
                label="First Name"
                icon={User}
                placeholder="Jane"
                required
              />
              <TextField
                name="lastName"
                label="Last Name"
                icon={User}
                placeholder="Muthoni"
                required
              />
            </FieldSection>

            <FieldSection title="Contact" columns={2}>
              <TextField
                name="email"
                label="Email Address"
                type="email"
                icon={Mail}
                placeholder="you@company.com"
                required
              />
              <TextField
                name="phone"
                label="Phone"
                type="tel"
                icon={Phone}
                placeholder="+254 700 000 000"
              />
            </FieldSection>
            <TextField
              name="company"
              label="Company / Organisation"
              icon={Building}
              placeholder="Optional"
            />

            <FieldSection title="Security" columns={2}>
              <PasswordField
                name="password"
                label="Password"
                placeholder="Min 8 characters"
                helper="At least 8 characters"
                required
              />
              <PasswordField
                name="confirmPassword"
                label="Confirm Password"
                placeholder="Repeat password"
                required
              />
            </FieldSection>

            <CheckboxField
              name="agreeToTerms"
              required
              label={
                <>
                  I agree to the{" "}
                  <Link
                    href="/terms"
                    className="border-b border-blue-700/40 pb-0.5 font-bold text-black hover:border-blue-700"
                  >
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link
                    href="/privacy"
                    className="border-b border-blue-700/40 pb-0.5 font-bold text-black hover:border-blue-700"
                  >
                    Privacy Policy
                  </Link>
                  .
                </>
              }
            />

            <SubmitButton>Create Account</SubmitButton>
          </AppForm>
        </div>
      </div>
    </div>
  );
}
