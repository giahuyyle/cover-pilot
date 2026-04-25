import { useForm } from "react-hook-form";
import { useNavigate } from "react-router";
import { auth } from "@/lib/firebase";
import { apiFetch } from "@/lib/api";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, browserLocalPersistence, browserSessionPersistence, setPersistence, fetchSignInMethodsForEmail, sendPasswordResetEmail } from "firebase/auth";
import { useAuthState } from "react-firebase-hooks/auth";
import { useState, useEffect, useCallback } from "react";

const loginDetails = {
    text: "Welcome back!",
    subText: "Enter your Credentials to access your account",
    fields: [
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
    ],
    checkbox: "Remember for 30 days",
    question: <h2 className="text-center mt-5 text-sm">Don't have an account? <a href="/signup" className="text-[rgb(108,144,46)] hover:underline">Sign Up</a></h2>,
}

const registerDetails = {
    text: "Create an account",
    subText: "Enter your details to create your account",
    fields: [
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
                pattern: {
                    value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9\s])/,
                    message: "Must include uppercase, lowercase, a number, and a special character",
                },
            },
        },
        {
            name: "confirmPassword",
            label: "Confirm Password",
            placeholder: "Re-enter your password",
            type: "password",
            rules: {
                required: "Please confirm your password",
            },
        },
    ],
    checkbox: <h1 className="text-sm">I agree to the <a href="#" className="text-[rgb(108,144,46)] hover:underline">Terms of Service</a> and <a href="#" className="text-[rgb(108,144,46)] hover:underline">Privacy Policy</a></h1>,
    question: <h2 className="text-center mt-5 text-sm">Already has an account? <a href="/login" className="text-[rgb(108,144,46)] hover:underline">Sign In</a></h2>,
}

export default function AuthLayout({ isLogin = true }) {
    const details = isLogin ? loginDetails : registerDetails;
    const { register, handleSubmit, watch, getValues, formState: { errors } } = useForm();
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
            // Do not block login/signup when profile sync fails.
            console.error("Failed to sync user profile to backend:", error);
        }
    }, []);

    useEffect(() => {
        let isMounted = true;

        const completeRedirectSignIn = async () => {
            try {
                const result = await getRedirectResult(auth);

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

    // Redirect to dashboard if already signed in
    useEffect(() => {
        if (!checkingRedirect && user) navigate("/dashboard");
    }, [checkingRedirect, user, navigate]);

    const onSubmit = async (data) => {
        setAuthError(null);
        setAuthMessage(null);
        setLoading(true);

        try {
            if (isLogin) {
                // "Remember for 30 days" = local persistence (survives browser close)
                // Otherwise = session persistence (cleared when tab closes)
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
                    // Check if this email was registered via Google
                    try {
                        const methods = await fetchSignInMethodsForEmail(auth, data.email);
                        if (methods.includes("google.com") && !methods.includes("password")) {
                            setAuthError("This account was signed up via Google. Please use the Sign In with Google button below to access your account.");
                            break;
                        }
                    } catch { /* ignore lookup errors */ }
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
        <div className="min-h-screen flex relative">
            <img src="/logo.svg" alt="logo" className="absolute top-4 left-4 h-30 rounded-md" />

            <div className="flex-1 h-screen py-35 px-50">
                <div className="flex flex-col justify-left w-full">

                    <h1 className="text-3xl">{details.text}</h1>

                    <h2 className="text-xl font-extralight mt-3">{details.subText}</h2>

                    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col mt-10 gap-5">
                        {details.fields.map((field) => (
                            <div key={field.name} className="flex flex-col gap-2">
                                <label className="text-sm font-medium">{field.label}</label>
                                <input
                                    type={field.type}
                                    placeholder={field.placeholder}
                                    className={`border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[rgb(108,144,46)] ${errors[field.name] ? "border-red-500" : "border-gray-300"}`}
                                    {...register(field.name, {
                                        ...field.rules,
                                        ...(field.name === "confirmPassword" && {
                                            validate: (value) => value === watch("password") || "Passwords do not match",
                                        }),
                                    })}
                                />
                                {errors[field.name] && (
                                    <p className="text-red-500 text-xs">{errors[field.name].message}</p>
                                )}
                            </div>
                        ))}

                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="checkbox"
                                    className="h-4 w-4 focus:ring-[rgb(108,144,46)] border-gray-300 rounded"
                                    {...(isLogin
                                        ? register("rememberMe")
                                        : register("agreeTerms", { required: "You must agree to the Terms of Service and Privacy Policy" })
                                    )}
                                />
                                <label htmlFor="checkbox" className="text-sm">{details.checkbox}</label>
                            </div>
                            {errors.agreeTerms && (
                                <p className="text-red-500 text-xs">{errors.agreeTerms.message}</p>
                            )}

                            {isLogin && (
                                <button
                                    type="button"
                                    onClick={handleForgotPassword}
                                    className="w-fit text-sm text-[rgb(108,144,46)] hover:underline mt-2 cursor-pointer"
                                >
                                    Forgot your password?
                                </button>
                            )}
                        </div>

                        <button type="submit" disabled={loading} className="bg-[rgb(108,144,46)]/80 hover:bg-[rgb(108,144,46)] cursor-pointer text-white py-2 rounded-md transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed">
                            {loading ? "Please wait..." : (isLogin ? "Login" : "Sign Up")}
                        </button>
                    </form>

                    {authError && (
                        <p className="text-red-500 text-sm text-center mt-3">{authError}</p>
                    )}
                    {authMessage && (
                        <p className="text-green-600 text-sm text-center mt-3">{authMessage}</p>
                    )}

                    <h1 className="text-center mt-5">OR</h1>
                    <button
                        onClick={handleGoogleSignIn}
                        disabled={loading}
                        className="bg-gray-200 text-gray-700 py-2 rounded-md hover:bg-gray-300 transition duration-200 mt-5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
                    >
                        <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
                            <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303C33.654 32.657 29.193 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.955 3.045l5.657-5.657C34.046 6.053 29.27 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.651-.389-3.917z"/>
                            <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.955 3.045l5.657-5.657C34.046 6.053 29.27 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
                            <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.153 35.091 26.715 36 24 36c-5.172 0-9.619-3.321-11.283-7.946l-6.52 5.025C9.505 39.556 16.227 44 24 44z"/>
                            <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.05 12.05 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.651-.389-3.917z"/>
                        </svg>
                        Sign In with Google
                    </button>

                    {details.question}
                </div>
            </div>

            <img src="/auth/auth-picture.jpg" alt="picture" className="sticky top-0 ml-auto rounded-l-2xl h-screen object-cover" />
        </div>
    );
}
