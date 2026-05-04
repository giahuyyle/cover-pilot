import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router";
import {
    browserLocalPersistence,
    browserSessionPersistence,
    createUserWithEmailAndPassword,
    fetchSignInMethodsForEmail,
    getRedirectResult,
    GoogleAuthProvider,
    sendPasswordResetEmail,
    setPersistence,
    signInWithEmailAndPassword,
    signInWithPopup,
    signInWithRedirect,
    updateProfile,
} from "firebase/auth";
import { useAuthState } from "react-firebase-hooks/auth";
import { ArrowRight, CheckCircle2, FileText, Sparkles } from "lucide-react";
import { auth } from "@/lib/firebase";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const loginFields = [
    {
        name: "email",
        label: "Email Address",
        placeholder: "Enter your email",
        type: "text",
        rules: {
            required: "Email is required",
            pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: "Invalid email address",
            },
        },
    },
    {
        name: "password",
        label: "Password",
        placeholder: "Enter your password",
        type: "password",
        rules: {
            required: "Password is required",
            minLength: { value: 8, message: "Password must be at least 8 characters" },
        },
    },
];

const registerFields = [
    {
        name: "fullName",
        label: "Full Name",
        placeholder: "Enter your full name",
        type: "text",
        rules: {
            required: "Full name is required",
            minLength: { value: 2, message: "Name must be at least 2 characters" },
        },
    },
    ...loginFields,
    {
        name: "confirmPassword",
        label: "Confirm Password",
        placeholder: "Re-enter your password",
        type: "password",
        rules: {
            required: "Please confirm your password",
        },
    },
];

const authBenefits = [
    "Save generated packets while they are available",
    "Use profile details for cleaner sender context",
    "Choose provider and model for generation",
];

let redirectResultPromise;

const getSharedRedirectResult = () => {
    redirectResultPromise ||= getRedirectResult(auth);
    return redirectResultPromise;
};

function GoogleIcon() {
    return (
        <svg viewBox="0 0 48 48" className="size-5" aria-hidden="true">
            <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303C33.654 32.657 29.193 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.955 3.045l5.657-5.657C34.046 6.053 29.27 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.651-.389-3.917z" />
            <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.955 3.045l5.657-5.657C34.046 6.053 29.27 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
            <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.153 35.091 26.715 36 24 36c-5.172 0-9.619-3.321-11.283-7.946l-6.52 5.025C9.505 39.556 16.227 44 24 44z" />
            <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.05 12.05 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.651-.389-3.917z" />
        </svg>
    );
}

function MiniWorkspacePreview() {
    return (
        <div className="rounded-xl border border-white/16 bg-white/10 p-4 shadow-[0_28px_80px_rgba(0,0,0,0.18)] backdrop-blur">
            <div className="mb-4 flex items-center justify-between border-b border-white/12 pb-3">
                <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-[#d6efa3]">Cover Pilot</p>
                    <p className="mt-1 text-base font-semibold text-white">Application workspace</p>
                </div>
                <div className="flex size-9 items-center justify-center rounded-md bg-[#d6efa3] text-[#3f4a14]">
                    <Sparkles className="size-4" strokeWidth={1.8} />
                </div>
            </div>
            <div className="grid gap-3">
                {[
                    ["Resume health", "78%", "bg-[#d6efa3]"],
                    ["Drafts ready", "12", "bg-[#f4dfb7]"],
                    ["Applications", "14", "bg-[#dce6ef]"],
                ].map(([label, value, tone]) => (
                    <div key={label} className="rounded-lg border border-white/12 bg-white/10 p-3">
                        <div className="mb-2 flex items-center justify-between">
                            <span className="text-sm text-zinc-200">{label}</span>
                            <span className="font-semibold text-white">{value}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-white/14">
                            <div className={`h-full w-3/4 rounded-full ${tone}`} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function AuthLayout({ isLogin = true }) {
    const fields = isLogin ? loginFields : registerFields;
    const {
        register,
        handleSubmit,
        watch,
        getValues,
        formState: { errors },
    } = useForm();
    const [authError, setAuthError] = useState(null);
    const [authMessage, setAuthMessage] = useState(null);
    const [loading, setLoading] = useState(false);
    const [checkingRedirect, setCheckingRedirect] = useState(true);
    const [user] = useAuthState(auth);
    const navigate = useNavigate();

    const syncUserProfileToBackend = useCallback(async (firebaseUser, fullNameOverride = "") => {
        if (!firebaseUser) return;

        const normalizedFullName = (fullNameOverride || firebaseUser.displayName || "").trim();
        const normalizedDisplayName = (firebaseUser.displayName || normalizedFullName).trim();

        try {
            await apiFetch("/api/users/me/", {
                method: "PUT",
                body: JSON.stringify({
                    full_name: normalizedFullName,
                    display_name: normalizedDisplayName,
                    photo_url: firebaseUser.photoURL || "",
                }),
            });
        } catch (error) {
            console.error("Failed to sync user profile to backend:", error);
        }
    }, []);

    useEffect(() => {
        let isMounted = true;

        const completeRedirectSignIn = async () => {
            try {
                const result = await getSharedRedirectResult();

                if (result?.user) {
                    await syncUserProfileToBackend(result.user);
                    navigate("/dashboard", { replace: true });
                }
            } catch (error) {
                if (isMounted) setAuthError(error.message);
            } finally {
                if (isMounted) setCheckingRedirect(false);
            }
        };

        completeRedirectSignIn();

        return () => {
            isMounted = false;
        };
    }, [navigate, syncUserProfileToBackend]);

    useEffect(() => {
        if (!checkingRedirect && user) navigate("/dashboard");
    }, [checkingRedirect, user, navigate]);

    const onSubmit = async (data) => {
        setAuthError(null);
        setAuthMessage(null);
        setLoading(true);

        try {
            if (isLogin) {
                const persistence = data.rememberMe ? browserLocalPersistence : browserSessionPersistence;
                await setPersistence(auth, persistence);
                const userCredential = await signInWithEmailAndPassword(auth, data.email, data.password);
                await syncUserProfileToBackend(userCredential.user);
            } else {
                const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
                await updateProfile(userCredential.user, { displayName: data.fullName });
                await syncUserProfileToBackend(userCredential.user, data.fullName);
            }
            navigate("/dashboard");
        } catch (error) {
            switch (error.code) {
                case "auth/email-already-in-use":
                    setAuthError("This email is already registered.");
                    break;
                case "auth/invalid-credential":
                case "auth/wrong-password":
                case "auth/user-not-found": {
                    try {
                        const methods = await fetchSignInMethodsForEmail(auth, data.email);
                        if (methods.includes("google.com") && !methods.includes("password")) {
                            setAuthError("This account was signed up via Google. Please use the Sign in with Google button.");
                            break;
                        }
                    } catch {
                        // Ignore lookup errors and show the standard auth error.
                    }
                    setAuthError("Invalid email or password.");
                    break;
                }
                default:
                    setAuthError(error.message);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setAuthError(null);
        setAuthMessage(null);
        setLoading(true);
        try {
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);
            await syncUserProfileToBackend(result.user);
            navigate("/dashboard");
        } catch (error) {
            if (error.code === "auth/popup-blocked") {
                const provider = new GoogleAuthProvider();
                await signInWithRedirect(auth, provider);
                return;
            }

            setAuthError(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async () => {
        const email = getValues("email")?.trim();

        setAuthError(null);
        setAuthMessage(null);

        if (!email) {
            setAuthError("Please enter your email first, then click Forgot your password?");
            return;
        }

        try {
            await sendPasswordResetEmail(auth, email);
            setAuthMessage("Password reset email sent. Please check your inbox.");
        } catch (error) {
            if (error.code === "auth/invalid-email") {
                setAuthError("Please enter a valid email address.");
                return;
            }
            setAuthError("Could not send reset email. Please try again.");
        }
    };

    return (
        <div className="min-h-screen bg-[linear-gradient(180deg,#fbfaf5_0%,#ffffff_48%,#f4f1e8_100%)] px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-6xl items-center">
                <div className="grid w-full overflow-hidden rounded-2xl border border-[#ded7c8] bg-[#fffdf8] shadow-[0_28px_90px_rgba(45,42,29,0.12)] lg:grid-cols-[minmax(0,1.02fr)_minmax(360px,0.98fr)]">
                    <section className="px-5 py-6 sm:px-8 lg:px-10">
                        <Link to="/" className="flex w-fit items-center gap-3">
                            <img src="/logo.svg" alt="Cover Pilot" className="size-11 rounded-md" />
                            <div>
                                <p className="font-semibold tracking-tight text-zinc-950">Cover Pilot</p>
                                <p className="text-xs font-medium text-[#5d681c]">Application workspace</p>
                            </div>
                        </Link>

                        <div className="mt-10 max-w-2xl">
                            <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">
                                {isLogin ? "Welcome back." : "Create your workspace."}
                            </h1>
                            <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-600">
                                {isLogin
                                    ? "Sign in to continue generating, saving, and tracking your application packets."
                                    : "Start generating tailored resumes and cover letters with saved profile context."}
                            </p>

                            <form onSubmit={handleSubmit(onSubmit)} className="mt-7 space-y-5">
                                <div className={`grid gap-4 ${isLogin ? "grid-cols-1" : "sm:grid-cols-2"}`}>
                                    {fields.map((field) => (
                                        <div key={field.name} className="space-y-2">
                                            <label className="text-sm font-semibold text-zinc-900">{field.label}</label>
                                            <Input
                                                type={field.type}
                                                placeholder={field.placeholder}
                                                className={`h-10 rounded-lg border bg-white text-sm ${
                                                    errors[field.name] ? "border-red-400" : "border-[#d9d2c2]"
                                                }`}
                                                {...register(field.name, {
                                                    ...field.rules,
                                                    ...(field.name === "confirmPassword" && {
                                                        validate: (value) => value === watch("password") || "Passwords do not match",
                                                    }),
                                                })}
                                            />
                                            {errors[field.name] && (
                                                <p className="text-xs text-red-600">{errors[field.name].message}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-start gap-2">
                                        <input
                                            type="checkbox"
                                            id="checkbox"
                                            className="mt-0.5 size-4 rounded border-[#cfc7b7] text-[#5d681c] focus:ring-[#d8dfb6]"
                                            {...(isLogin
                                                ? register("rememberMe")
                                                : register("agreeTerms", { required: "You must agree to the Terms of Service and Privacy Policy" })
                                            )}
                                        />
                                        <label htmlFor="checkbox" className="text-sm leading-5 text-zinc-600">
                                            {isLogin ? (
                                                "Remember for 30 days"
                                            ) : (
                                                <>
                                                    I agree to the{" "}
                                                    <Link to="/terms" className="font-medium text-[#4d5818] hover:underline">Terms</Link>
                                                    {" "}and{" "}
                                                    <Link to="/privacy" className="font-medium text-[#4d5818] hover:underline">Privacy Policy</Link>
                                                </>
                                            )}
                                        </label>
                                    </div>
                                    {errors.agreeTerms && (
                                        <p className="text-xs text-red-600">{errors.agreeTerms.message}</p>
                                    )}

                                    {isLogin && (
                                        <button
                                            type="button"
                                            onClick={handleForgotPassword}
                                            className="text-sm font-medium text-[#4d5818] hover:underline"
                                        >
                                            Forgot your password?
                                        </button>
                                    )}
                                </div>

                                <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                                    <Button
                                        type="submit"
                                        disabled={loading}
                                        className="h-10 rounded-md bg-[#5d681c] text-white hover:bg-[#4d5818]"
                                    >
                                        {loading ? "Please wait..." : (isLogin ? "Login" : "Sign up")}
                                        <ArrowRight className="size-4" strokeWidth={1.8} />
                                    </Button>
                                    <Button
                                        type="button"
                                        onClick={handleGoogleSignIn}
                                        disabled={loading}
                                        variant="outline"
                                        className="h-10 rounded-md border-[#cfc7b7] bg-white px-4"
                                    >
                                        <GoogleIcon />
                                        <span className="hidden sm:inline">Google</span>
                                        <span className="sm:hidden">Sign in with Google</span>
                                    </Button>
                                </div>
                            </form>

                            {authError && (
                                <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{authError}</p>
                            )}
                            {authMessage && (
                                <p className="mt-4 rounded-md border border-[#cbd3ad] bg-[#f4f6e8] px-3 py-2 text-sm text-[#4d5818]">{authMessage}</p>
                            )}

                            <p className="mt-6 text-sm text-zinc-600">
                                {isLogin ? "Do not have an account?" : "Already have an account?"}
                                {" "}
                                <Link to={isLogin ? "/signup" : "/login"} className="font-semibold text-[#4d5818] hover:underline">
                                    {isLogin ? "Sign up" : "Sign in"}
                                </Link>
                            </p>
                        </div>
                    </section>

                    <aside className="hidden bg-[#1f2613] p-6 text-white lg:flex lg:items-center">
                        <div className="mx-auto w-full max-w-md">
                            <div className="mb-8 flex items-center gap-3 text-[#d6efa3]">
                                <FileText className="size-5" strokeWidth={1.8} />
                                <span className="text-sm font-medium">Tailored resumes and cover letters</span>
                            </div>
                            <MiniWorkspacePreview />
                            <h2 className="mt-7 text-2xl font-semibold tracking-tight">
                                Keep every application packet in one focused workspace.
                            </h2>
                            <div className="mt-5 space-y-3">
                                {authBenefits.map((benefit) => (
                                    <div key={benefit} className="flex items-center gap-2 text-sm text-zinc-200">
                                        <CheckCircle2 className="size-4 text-[#d6efa3]" strokeWidth={1.8} />
                                        {benefit}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </aside>
                </div>
            </div>
        </div>
    );
}
