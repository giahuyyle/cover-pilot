import { Link } from "react-router";
import { Zap, Globe, ShieldCheck } from "lucide-react";

const offerings = [
    {
        text: "Instant Productivity",
        logo: Zap,
        target: "productivity",
    },
    {
        text: "Template Market",
        logo: Globe,
        target: "templates",
    },
    {
        text: "Advanced Technology",
        logo: ShieldCheck,
        target: "advanced-technology",
    },
];

const footerLinks = [
    "Contact",
    "Social",
    "Address",
    "Legal Terms",
];

const partners = [
    {
        name: "UAlberta",
        logo: "/landing/landing-hero-ua.png",
    },
    {
        name: "TU Eindhoven",
        logo: "/landing/landing-hero-tue.png",
    },
    // {
    //     name: "Hanoi-Amsterdam",
    //     logo: "/landing/landing-hero-ams.jpg",
    // }
]

const efffiencyFeatures = [
    {
        text: "Generate cover letter in seconds",
        logo: "/landing/landing-efficiency-1.svg",
    },
    {
        text: "Tailor your resume",
        logo: "/landing/landing-efficiency-2.svg",
    },
    {
        text: "Get AI-powered improvements",
        logo: "/landing/landing-efficiency-3.svg",
    },
    {
        text: "Provide you with templates",
        logo: "/landing/landing-efficiency-4.svg",
    },
]

const templateFeatures = [
    {
        text: "Professional Cover Templates",
        logo: "https://focus-teal-coast.figma.site/_assets/v11/624ca513adf58ee43a7949875bf7f394594e86b2.png",
        subtext1: "Any Cover Letter Template You, At The Palm Of Your Hand",
    },
    {
        text: "Professional Resume Templates",
        logo: "https://focus-teal-coast.figma.site/_assets/v11/3b08d984c887ed2137ecba9e6ce406228ea26ca2.png",
        subtext1: "Any Resume Template Recruiters Love, At Your Fingertips",
    },
]

export default function Landing() {
    return (
        <div className="min-h-screen flex">
            <div className="w-2/5 h-screen sticky top-0 bg-[rgb(60,69,20)]">
                <div className="flex mt-5 mx-8">
                    <div className="text-white text-2xl grid grid-cols-2">
                        <p>cover</p>
                        <p className="font-bold">pilot.</p>
                    </div>
                    
                    <Link 
                        className="ml-auto cursor-pointer bg-[rgb(219,252,167)] hover:bg-[rgb(108,144,46)] text-black text-sm font-extralight py-2 px-4 rounded-md"
                        to="/login"
                    >
                        Get Started
                    </Link>
                </div>

                <div className="mt-10 mx-8 font-light text-4xl text-white">
                    <h1>Cover Letters Made</h1>
                    <h1 className="text-[rgb(219,252,167)]">Simple.</h1>

                    <p className="mt-5 text-sm font-extralight text-gray-300">No LaTeX or editing skill required.</p>
                </div>

                <div className="mt-15 mx-8">
                    <p className="text-[rgb(219,252,167)] font-extralight">Our Offerings</p>

                    <div className="grid grid-cols-3 gap-2">
                        {offerings.map((offering, index) => (
                            <button 
                                key={index} 
                                className="text-black bg-[rgb(219,252,167)] hover:bg-[rgb(108,144,46)] mt-5 py-5 px-2 rounded-md flex flex-col items-center justify-center cursor-pointer"
                                onClick={() => document.getElementById(offering.target)?.scrollIntoView({ behavior: 'smooth' })}
                            >
                                <offering.logo className="w-6 h-6" />
                                <p className="mt-3 font-extralight text-wrap">{offering.text}</p>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="mt-15 mx-8 flex flex-row gap-3">
                    {footerLinks.map((link, index) => (
                        <p 
                            key={index} 
                            className="text-[rgb(219,252,167)] font-extralight text-sm cursor-pointer hover:underline"
                        >
                            {link}
                        </p>
                    ))}
                </div>

                <footer className="absolute bottom-5 text-white font-extralight text-sm justify-center flex w-full">
                    &copy; 2026 Cover Pilot. All rights reserved.
                </footer>
            </div>

            <div className="relative right-0 min-h-screen w-3/5 bg-[rgb(245,245,220)]">
                <div
                    id="hero"
                >
                    <img 
                        src="/landing/landing-hero.jpg" 
                        alt="Landing Hero"
                        className="px-5 py-5 rounded-4xl mb-5 mx-auto"
                    />
                    <p className="font-extralight text-lg text-wrap justify-center flex">We escalate editing efficiency</p>
                    <p className="font-extralight text-lg text-wrap justify-center flex">and productivity</p>

                    <div className="mt-5 h-10 flex flex-row justify-center w-full gap-5">
                        {partners.map((partner, index) => (
                            <img key={index} src={partner.logo} alt={partner.name} className="scale-75" />
                        ))}
                    </div>
                </div>
                
                <hr className="my-10 mx-5 border-gray-300" />
                
                <div
                    id="productivity"
                    className="mt-10"
                >
                    <div className="flex flex-col justify-center items-center w-full">
                        <h1 className="text-4xl font-extralight text-[rgb(60,69,20)]">Create In Matter Of Seconds</h1>
                        <p className="text-wrap text-center font-extralight text-xs my-2 px-35">
                            Maximize your productivity with smarter tools designed to streamline your workflow to automate tasks, stay organized
                        </p>
                    </div>

                    <div
                        className="grid grid-cols-2 gap-3 mt-10 mx-10"
                    >
                        {efffiencyFeatures.map((feature, index) => (
                            <div
                                key={index}
                                className="bg-[rgb(219,252,167)] py-5 px-10 rounded-md flex flex-col items-center justify-center"
                            >
                                <img src={feature.logo} alt={`Efficiency ${index + 1}`} className="h-25 mb-3" />
                                <p className="flex text-wrap text-center justify-center font-extralight text-md text-[rgb(60,69,20)]">{feature.text}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <hr className="my-10 mx-5 border-gray-300" />

                <div
                    id="templates"
                    className="mt-10"
                >
                    <h1 className="flex justify-center text-4xl font-extralight text-[rgb(60,69,20)]">The Most Reliable Templates</h1>

                    <div className="flex justify-center grid-cols-2 gap-3 mt-10 px-5">
                        {templateFeatures.map((feature, index) => (
                            <div
                                key={index}
                                className="flex flex-col"
                            >
                                <img src={feature.logo} alt={`Template ${index + 1}`} className="" />
                                <p className="mt-5 text-[rgb(60,69,20)] font-extralight text-xs">{feature.subtext1}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <hr className="my-10 mx-5 border-gray-300" />

                <div
                    id="advanced-technology"
                    className="mt-10 px-5"
                >
                    <img src="/landing/landing-software-quality.png" alt="Software Quality" className="rounded-2xl"/>

                    <div className="flex flex-col justify-center items-center w-full mt-10">
                        <h1 className="text-4xl font-extralight text-[rgb(60,69,20)]">First Class Software</h1>
                        <p className="text-wrap text-center font-extralight text-xs my-2 px-35">
                            Get real-time edits, seamless integration, and a user-friendly interface that makes crafting the perfect cover letter effortless.
                        </p>
                    </div>

                    {/* TODO: implement last part of advanced technology section */}
                </div>

                <footer className="mt-20 py-10 px-10 w-full bg-gray-200">
                    <div className="flex flex-row">
                        <img src="/logo-transparent.svg" alt="Cover Pilot Footer Logo" className="h-50" />

                        <div className="ml-auto mr-20 flex flex-row gap-5">
                            
                            <div className="mt-5 flex flex-col">
                                <p className="text-sm font-extralight text-gray-500">
                                    Contact
                                </p>
                                <a href="mailto:cover.pilot@gmail.com" className="mt-2 hover:underline cursor-pointer">
                                    cover.pilot@gmail.com
                                </a>
                                <a href="https://www.instagram.com/coverpilot" className="hover:underline cursor-pointer">
                                    Instagram
                                </a>

                                <Link className="hover:underline cursor-pointer text-gray-500 mt-10" to="/terms">
                                    Terms & Conditions
                                </Link>
                                <Link className="hover:underline cursor-pointer text-gray-500" to="/privacy">
                                    Privacy
                                </Link>
                            </div>
                        </div>
                    </div>
                    
                </footer>
            </div>
        </div>
    );
}