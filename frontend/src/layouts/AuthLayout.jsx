const loginDetails = {
    text: "Welcome back!",
    subText: "Enter your Credentials to access your account",
    fields: {
        "Email Address": "Enter your email",
        "Password": "Enter your password",
    },
    checkbox: "Remember for 30 days",
    question: <h2 className="text-center mt-5 text-sm">Don't have an account? <a href="/signup" className="text-[rgb(108,144,46)] hover:underline">Sign Up</a></h2>,
}

const registerDetails = {
    text: "Create an account",
    subText: "Enter your details to create your account",
    fields: {
        "Full Name": "Enter your full name",
        "Email Address": "Enter your email",
        "Password": "Enter your password",
        "Confirm Password": "Re-enter your password",
    },
    checkbox: <h1 className="text-sm">I agree to the <a href="#" className="text-[rgb(108,144,46)] hover:underline">Terms of Service</a> and <a href="#" className="text-[rgb(108,144,46)] hover:underline">Privacy Policy</a></h1>,
    question: <h2 className="text-center mt-5 text-sm">Already has an account? <a href="/login" className="text-[rgb(108,144,46)] hover:underline">Sign In</a></h2>,
}

export default function AuthLayout({ isLogin = true }) {
    const details = isLogin ? loginDetails : registerDetails;

    return (
        <div className="min-h-screen flex relative">
            <img src="/logo.svg" alt="logo" className="absolute top-4 left-4 h-30 rounded-md" />

            <div className="flex-1 h-screen py-35 px-50">
                <div className="flex flex-col justify-left w-full">

                    <h1 className="text-3xl">{details.text}</h1>

                    <h2 className="text-xl font-extralight mt-3">{details.subText}</h2>

                    <form className="flex flex-col mt-10 gap-5">
                        {Object.entries(details.fields).map(([label, placeholder]) => (
                            <div key={label} className="flex flex-col gap-2">
                                <label className="text-sm font-medium">{label}</label>
                                <input
                                    type={label.toLowerCase().includes("password") ? "password" : "text"}
                                    placeholder={placeholder}
                                    className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[rgb(108,144,46)]"
                                />
                            </div>
                        ))}

                        <div className="flex items-center gap-2">
                            <input type="checkbox" id="remember" className="h-4 w-4 focus:ring-[rgb(108,144,46)] border-gray-300 rounded" />
                            <label htmlFor="remember" className="text-sm">{details.checkbox}</label>
                        </div>

                        <button type="submit" className="bg-[rgb(108,144,46)] text-white py-2 rounded-md  transition duration-200">
                            {isLogin ? "Login" : "Sign Up"}
                        </button>
                    </form>

                    <h1 className="text-center mt-5">OR</h1>
                    <button className="bg-gray-200 text-gray-700 py-2 rounded-md hover:bg-gray-300 transition duration-200 mt-5">
                        Sign In with Google
                    </button>

                    {details.question}
                </div>
            </div>

            <img src="/auth/auth-picture.jpg" alt="picture" className="sticky top-0 ml-auto rounded-l-2xl h-screen object-cover" />
        </div>
    );
}