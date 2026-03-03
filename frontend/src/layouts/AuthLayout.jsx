import { useForm } from "react-hook-form";
import { useNavigate } from "react-router";
import { auth } from "@/lib/firebase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, GoogleAuthProvider, signInWithPopup, browserLocalPersistence, browserSessionPersistence, setPersistence, fetchSignInMethodsForEmail } from "firebase/auth";
import { useAuthState } from "react-firebase-hooks/auth";
import { useState, useEffect } from "react";

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
                    value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/,
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
    const { register, handleSubmit, watch, formState: { errors } } = useForm();
    const [authError, setAuthError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [user, authLoading] = useAuthState(auth);
    const navigate = useNavigate();

    // Redirect to dashboard if already signed in
    useEffect(() => {
        if (user) navigate("/dashboard");
    }, [user, navigate]);

    const onSubmit = async (data) => {
        setAuthError(null);
        setLoading(true);

        try {
            if (isLogin) {
                // "Remember for 30 days" = local persistence (survives browser close)
                // Otherwise = session persistence (cleared when tab closes)
                const persistence = data.rememberMe ? browserLocalPersistence : browserSessionPersistence;
                await setPersistence(auth, persistence);
                await signInWithEmailAndPassword(auth, data.email, data.password);
            } else {
                const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
                await updateProfile(userCredential.user, { displayName: data.fullName });
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
                    } catch (_) { /* ignore lookup errors */ }
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
        setLoading(true);
        try {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
            navigate("/dashboard");
        } catch (error) {
            setAuthError(error.message);
        } finally {
            setLoading(false);
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
                        </div>

                        <button type="submit" disabled={loading} className="bg-[rgb(108,144,46)]/80 hover:bg-[rgb(108,144,46)] cursor-pointer text-white py-2 rounded-md transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed">
                            {loading ? "Please wait..." : (isLogin ? "Login" : "Sign Up")}
                        </button>
                    </form>

                    {authError && (
                        <p className="text-red-500 text-sm text-center mt-3">{authError}</p>
                    )}

                    <h1 className="text-center mt-5">OR</h1>
                    <button
                        onClick={handleGoogleSignIn}
                        disabled={loading}
                        className="bg-gray-200 text-gray-700 py-2 rounded-md hover:bg-gray-300 transition duration-200 mt-5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                        Sign In with Google
                    </button>

                    {details.question}
                </div>
            </div>

            <img src="/auth/auth-picture.jpg" alt="picture" className="sticky top-0 ml-auto rounded-l-2xl h-screen object-cover" />
        </div>
    );
}