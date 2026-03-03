import { useState } from "react";
import { useForm } from "react-hook-form";
import { auth } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth";
import { Search, Bell } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export default function Profile() {
    const [user, loading] = useAuthState(auth);
    const [isEditing, setIsEditing] = useState(false);

    const displayName = user?.displayName || "User";
    const firstName = displayName.split(" ")[0];
    const email = user?.email || "";
    const photoURL = user?.photoURL;

    const today = new Date();
    const formattedDate = today.toLocaleDateString("en-US", {
        weekday: "short",
        day: "2-digit",
        month: "long",
        year: "numeric",
    });

    const [formData, setFormData] = useState({
        fullName: "",
        nickName: "",
    });

    const handleChange = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    // Change password form
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
            <div className="flex items-center justify-center h-64">
                <p className="text-muted-foreground">Loading...</p>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto px-6 pb-12">
            {/* Top bar: Welcome + Search + Notification + Avatar */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-semibold text-foreground">
                        Welcome, {firstName}
                    </h1>
                    <p className="text-sm text-muted-foreground">{formattedDate}</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search"
                            className="pl-9 w-48 h-9 rounded-full bg-muted/50"
                        />
                    </div>
                    <button className="relative p-2 rounded-full hover:bg-muted transition">
                        <Bell className="h-5 w-5 text-muted-foreground" />
                    </button>
                    <div className="h-9 w-9 rounded-full overflow-hidden border border-border">
                        {photoURL ? (
                            <img
                                src={photoURL}
                                alt="avatar"
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            <div className="h-full w-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground">
                                {firstName[0]}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Gradient banner */}
            <div className="h-24 w-full rounded-xl mb-8 bg-linear-to-r from-blue-100 via-blue-50 to-amber-50" />

            {/* Profile header */}
            <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-full overflow-hidden border-2 border-border">
                        {photoURL ? (
                            <img
                                src={photoURL}
                                alt="avatar"
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            <div className="h-full w-full bg-muted flex items-center justify-center text-lg font-semibold text-muted-foreground">
                                {firstName[0]}
                            </div>
                        )}
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-foreground">
                            {displayName}
                        </h2>
                        <p className="text-sm text-muted-foreground">{email}</p>
                    </div>
                </div>
                <Button
                    onClick={() => setIsEditing(!isEditing)}
                    className="rounded-lg px-6"
                >
                    {isEditing ? "Save" : "Edit"}
                </Button>
            </div>

            {/* Form fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 mb-10">
                {/* Full Name */}
                <div className="space-y-2">
                    <Label>Full Name</Label>
                    <Input
                        placeholder="Your Full Name"
                        value={formData.fullName}
                        onChange={(e) => handleChange("fullName", e.target.value)}
                        disabled={!isEditing}
                    />
                </div>

                {/* Nick Name */}
                <div className="space-y-2">
                    <Label>Nick Name</Label>
                    <Input
                        placeholder="Your Nick Name"
                        value={formData.nickName}
                        onChange={(e) => handleChange("nickName", e.target.value)}
                        disabled={!isEditing}
                    />
                </div>
            </div>

            {/* My email Address */}
            <div>
                <h3 className="text-lg font-semibold text-foreground mb-4">
                    My E-mail Address
                </h3>
                <div className="flex items-center gap-3 mb-4">
                    <div className="flex items-center justify-center h-10 w-10 rounded-full bg-blue-500">
                        <svg
                            className="h-5 w-5 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                            />
                        </svg>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-foreground">{email}</p>
                        <p className="text-xs text-muted-foreground">Primary E-mail</p>
                    </div>
                </div>
            </div>

            {/* Change Password */}
            <div className="mt-10">
                <h3 className="text-lg font-semibold text-foreground mb-4">
                    Change Password
                </h3>
                <form
                    onSubmit={handleSubmit(onChangePassword)}
                    className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 max-w-3xl"
                >
                    {/* Current Password - full width */}
                    <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="currentPassword">Enter Current Password</Label>
                        <Input
                            id="currentPassword"
                            type="password"
                            placeholder="Enter your current password"
                            {...register("currentPassword", {
                                required: "Current password is required",
                            })}
                        />
                        {pwErrors.currentPassword && (
                            <p className="text-red-500 text-xs">{pwErrors.currentPassword.message}</p>
                        )}
                    </div>

                    {/* New Password */}
                    <div className="space-y-2">
                        <Label htmlFor="newPassword">Enter New Password</Label>
                        <Input
                            id="newPassword"
                            type="password"
                            placeholder="Enter new password"
                            {...register("newPassword", {
                                required: "Password is required",
                                minLength: {
                                    value: 8,
                                    message: "Password must be at least 8 characters",
                                },
                                pattern: {
                                    value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/,
                                    message: "Must include uppercase, lowercase, a number, and a special character",
                                },
                            })}
                        />
                        {pwErrors.newPassword && (
                            <p className="text-red-500 text-xs">{pwErrors.newPassword.message}</p>
                        )}
                    </div>

                    {/* Re-enter New Password */}
                    <div className="space-y-2">
                        <Label htmlFor="confirmNewPassword">Re-enter New Password</Label>
                        <Input
                            id="confirmNewPassword"
                            type="password"
                            placeholder="Re-enter new password"
                            {...register("confirmNewPassword", {
                                required: "Please confirm your new password",
                                validate: (value) =>
                                    value === watch("newPassword") || "Passwords do not match",
                            })}
                        />
                        {pwErrors.confirmNewPassword && (
                            <p className="text-red-500 text-xs">{pwErrors.confirmNewPassword.message}</p>
                        )}
                    </div>

                    {/* Submit + feedback */}
                    <div className="md:col-span-2 flex flex-col gap-2">
                        <Button
                            type="submit"
                            disabled={pwLoading}
                            className="w-fit rounded-lg px-6"
                        >
                            {pwLoading ? "Updating..." : "Change Password"}
                        </Button>
                        {pwError && <p className="text-red-500 text-sm">{pwError}</p>}
                        {pwSuccess && <p className="text-green-600 text-sm">{pwSuccess}</p>}
                    </div>
                </form>
            </div>
        </div>
    );
}