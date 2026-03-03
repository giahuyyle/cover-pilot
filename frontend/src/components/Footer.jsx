import { Link } from "react-router";

export default function Footer() {
    return (
        <footer className="py-10 px-10 w-full bg-gray-200">
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
    );
};