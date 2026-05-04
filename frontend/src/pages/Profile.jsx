import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Mail, Pencil, Save, ShieldCheck, UserRound } from "lucide-react";
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword, updateProfile } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { apiFetch } from "@/lib/api";
import { useAuthState } from "react-firebase-hooks/auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

function getInitials(name) {
    return name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase();
}

function Panel({ children, className = "" }) {
    return (
        <section className={`rounded-xl border border-[#ded7c8] bg-[#fffdf8] shadow-[0_18px_55px_rgba(32,31,22,0.06)] ${className}`}>
            {children}
        </section>
    );
}

export default function Profile() {
    const [user, loading] = useAuthState(auth);
    const [isEditing, setIsEditing] = useState(false);
    const [backendProfile, setBackendProfile] = useState(null);
    const [backendLoading, setBackendLoading] = useState(false);
    const [backendError, setBackendError] = useState("");
    const [profileSaving, setProfileSaving] = useState(false);
    const [profileSaveError, setProfileSaveError] = useState("");
    const [profileSaveSuccess, setProfileSaveSuccess] = useState("");
    const [formData, setFormData] = useState({
        fullName: "",
        displayName: "",
    });
    const {
        register,
        handleSubmit,
        watch,
        reset,
        formState: { errors: pwErrors },
    } = useForm();
    const [pwLoading, setPwLoading] = useState(false);
    const [pwError, setPwError] = useState(null);
    const [pwSuccess, setPwSuccess] = useState(null);

    const profileDisplayName = (user?.displayName || backendProfile?.display_name || "User").trim() || "User";
    const firstName = profileDisplayName.split(" ")[0] || "U";
    const email = user?.email || "";
    const photoURL = user?.photoURL;
    const initials = getInitials(profileDisplayName) || firstName[0];

    const handleChange = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    useEffect(() => {
        if (!user) {
            setBackendProfile(null);
            setBackendError("");
            setBackendLoading(false);
            return;
        }

        let isMounted = true;

        const fetchBackendProfile = async () => {
            setBackendLoading(true);
            setBackendError("");

            try {
                const data = await apiFetch("/api/users/me/");
                if (isMounted) {
                    setBackendProfile(data);
                    setFormData({
                        fullName: data?.full_name || "",
                        displayName: data?.display_name || user?.displayName || "",
                    });
                }
            } catch (error) {
                if (isMounted) {
                    setBackendError(error.message || "Failed to load backend profile.");
                }
            } finally {
                if (isMounted) {
                    setBackendLoading(false);
                }
            }
        };

        fetchBackendProfile();

        return () => {
            isMounted = false;
        };
    }, [user]);

    const handleProfileAction = async () => {
        if (!isEditing) {
            setIsEditing(true);
            setProfileSaveError("");
            setProfileSaveSuccess("");
            return;
        }

        const nextFullName = formData.fullName.trim();
        const nextDisplayName = formData.displayName.trim();

        setProfileSaveError("");
        setProfileSaveSuccess("");
        setProfileSaving(true);

        try {
            const updated = await apiFetch("/api/users/me/", {
                method: "PUT",
                body: JSON.stringify({
                    full_name: nextFullName,
                    display_name: nextDisplayName,
                }),
            });

            if (user) {
                try {
                    await updateProfile(user, { displayName: nextDisplayName });
                } catch (firebaseSyncError) {
                    console.error("Failed to sync Firebase display name:", firebaseSyncError);
                }
            }

            setBackendProfile((prev) => ({
                ...(prev || {}),
                ...(updated || {}),
                full_name: nextFullName,
                display_name: nextDisplayName,
            }));
            setFormData({
                fullName: nextFullName,
                displayName: nextDisplayName,
            });
            setIsEditing(false);
            setProfileSaveSuccess("Profile updated successfully.");
        } catch (error) {
            setProfileSaveError(error.message || "Failed to update profile.");
        } finally {
            setProfileSaving(false);
        }
    };

    const onChangePassword = async (data) => {
        setPwError(null);
        setPwSuccess(null);
        setPwLoading(true);
        try {
            const credential = EmailAuthProvider.credential(user.email, data.currentPassword);
            await reauthenticateWithCredential(user, credential);
            await updatePassword(user, data.newPassword);
            setPwSuccess("Password updated successfully.");
            reset();
        } catch (error) {
            switch (error.code) {
                case "auth/wrong-password":
                case "auth/invalid-credential":
                    setPwError("Current password is incorrect.");
                    break;
                case "auth/requires-recent-login":
                    setPwError("Please log out and log back in before changing your password.");
                    break;
                default:
                    setPwError(error.message);
            }
        } finally {
            setPwLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="mx-auto max-w-7xl px-4 pb-24 text-sm text-zinc-600 sm:px-6 lg:px-8">
                Loading profile...
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
            <header className="mb-8 grid gap-6 border-b border-[#e3dece] pb-6 lg:grid-cols-[1fr_360px] lg:items-end">
                <div>
                    <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">Profile settings</h1>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600">
                        Keep your account details accurate so generated drafts can use the right name and saved profile context.
                    </p>
                </div>
                <Panel className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="size-12 overflow-hidden rounded-full border border-[#d9d2c2] bg-[#eef2d8]">
                            {photoURL ? (
                                <img src={photoURL} alt="avatar" className="h-full w-full object-cover" />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-[#5d681c]">
                                    {initials}
                                </div>
                            )}
                        </div>
                        <div className="min-w-0">
                            <p className="truncate font-semibold text-zinc-950">{profileDisplayName}</p>
                            <p className="truncate text-sm text-zinc-600">{email}</p>
                        </div>
                    </div>
                </Panel>
            </header>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
                <div className="space-y-6">
                    <Panel className="p-5 lg:p-6">
                        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h2 className="text-lg font-semibold tracking-tight text-zinc-950">Account identity</h2>
                                <p className="mt-1 text-sm text-zinc-600">Update your display and profile names.</p>
                            </div>
                            <Button
                                type="button"
                                onClick={handleProfileAction}
                                disabled={backendLoading || profileSaving}
                                className="rounded-md bg-[#5d681c] text-white hover:bg-[#4d5818]"
                            >
                                {isEditing ? (
                                    <>
                                        <Save className="size-4" strokeWidth={1.8} />
                                        {profileSaving ? "Saving..." : "Save changes"}
                                    </>
                                ) : (
                                    <>
                                        <Pencil className="size-4" strokeWidth={1.8} />
                                        Edit profile
                                    </>
                                )}
                            </Button>
                        </div>

                        <div className="grid gap-5 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label>Full Name</Label>
                                <Input
                                    placeholder="Your full name"
                                    value={formData.fullName}
                                    onChange={(event) => handleChange("fullName", event.target.value)}
                                    disabled={!isEditing}
                                    className="h-11 rounded-lg border-[#d9d2c2] bg-white"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Display Name</Label>
                                <Input
                                    placeholder="Your display name"
                                    value={formData.displayName}
                                    onChange={(event) => handleChange("displayName", event.target.value)}
                                    disabled={!isEditing}
                                    className="h-11 rounded-lg border-[#d9d2c2] bg-white"
                                />
                            </div>
                        </div>

                        <div className="mt-5 space-y-2">
                            {backendLoading && <p className="text-sm text-zinc-600">Loading profile...</p>}
                            {backendError && <p className="whitespace-pre-wrap text-sm text-red-600">{backendError}</p>}
                            {profileSaveError && <p className="whitespace-pre-wrap text-sm text-red-600">{profileSaveError}</p>}
                            {profileSaveSuccess && <p className="text-sm text-[#5d681c]">{profileSaveSuccess}</p>}
                        </div>
                    </Panel>

                    <Panel className="p-5 lg:p-6">
                        <div className="mb-6">
                            <h2 className="text-lg font-semibold tracking-tight text-zinc-950">Change password</h2>
                            <p className="mt-1 text-sm text-zinc-600">Use a current password and a stronger replacement.</p>
                        </div>

                        <form onSubmit={handleSubmit(onChangePassword)} className="grid gap-5 md:grid-cols-2">
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="currentPassword">Current Password</Label>
                                <Input
                                    id="currentPassword"
                                    type="password"
                                    placeholder="Enter your current password"
                                    className="h-11 rounded-lg border-[#d9d2c2] bg-white"
                                    {...register("currentPassword", {
                                        required: "Current password is required",
                                    })}
                                />
                                {pwErrors.currentPassword && (
                                    <p className="text-xs text-red-600">{pwErrors.currentPassword.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="newPassword">New Password</Label>
                                <Input
                                    id="newPassword"
                                    type="password"
                                    placeholder="Enter new password"
                                    className="h-11 rounded-lg border-[#d9d2c2] bg-white"
                                    {...register("newPassword", {
                                        required: "Password is required",
                                        minLength: {
                                            value: 8,
                                            message: "Password must be at least 8 characters",
                                        },
                                        pattern: {
                                            value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/,
                                            message: "Must include uppercase, lowercase, a number, and a special character",
                                        },
                                    })}
                                />
                                {pwErrors.newPassword && (
                                    <p className="text-xs text-red-600">{pwErrors.newPassword.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="confirmNewPassword">Confirm New Password</Label>
                                <Input
                                    id="confirmNewPassword"
                                    type="password"
                                    placeholder="Re-enter new password"
                                    className="h-11 rounded-lg border-[#d9d2c2] bg-white"
                                    {...register("confirmNewPassword", {
                                        required: "Please confirm your new password",
                                        validate: (value) => value === watch("newPassword") || "Passwords do not match",
                                    })}
                                />
                                {pwErrors.confirmNewPassword && (
                                    <p className="text-xs text-red-600">{pwErrors.confirmNewPassword.message}</p>
                                )}
                            </div>

                            <div className="flex flex-col gap-2 md:col-span-2">
                                <Button
                                    type="submit"
                                    disabled={pwLoading}
                                    className="w-fit rounded-md bg-[#5d681c] px-6 text-white hover:bg-[#4d5818]"
                                >
                                    {pwLoading ? "Updating..." : "Change password"}
                                </Button>
                                {pwError && <p className="text-sm text-red-600">{pwError}</p>}
                                {pwSuccess && <p className="text-sm text-[#5d681c]">{pwSuccess}</p>}
                            </div>
                        </form>
                    </Panel>
                </div>

                <aside className="space-y-6">
                    <Panel className="p-5">
                        <div className="flex items-start gap-3">
                            <div className="flex size-10 items-center justify-center rounded-md bg-[#eef2d8] text-[#5d681c]">
                                <Mail className="size-5" strokeWidth={1.8} />
                            </div>
                            <div>
                                <h2 className="font-semibold text-zinc-950">Primary email</h2>
                                <p className="mt-1 break-all text-sm text-zinc-600">{email}</p>
                            </div>
                        </div>
                    </Panel>

                    <Panel className="p-5">
                        <div className="flex items-start gap-3">
                            <div className="flex size-10 items-center justify-center rounded-md bg-[#eef2d8] text-[#5d681c]">
                                <ShieldCheck className="size-5" strokeWidth={1.8} />
                            </div>
                            <div>
                                <h2 className="font-semibold text-zinc-950">Profile quality</h2>
                                <p className="mt-1 text-sm leading-6 text-zinc-600">
                                    A complete profile gives generated drafts more reliable sender details.
                                </p>
                            </div>
                        </div>
                    </Panel>

                    <Panel className="border-[#cbd3ad] bg-[#f4f6e8] p-5">
                        <div className="flex items-start gap-3">
                            <div className="flex size-10 items-center justify-center rounded-md bg-white text-[#5d681c]">
                                <UserRound className="size-5" strokeWidth={1.8} />
                            </div>
                            <div>
                                <h2 className="font-semibold text-zinc-950">Generation context</h2>
                                <p className="mt-1 text-sm leading-6 text-zinc-700">
                                    Keep your profile current before generating high-stakes application packets.
                                </p>
                            </div>
                        </div>
                    </Panel>
                </aside>
            </div>
        </div>
    );
}
