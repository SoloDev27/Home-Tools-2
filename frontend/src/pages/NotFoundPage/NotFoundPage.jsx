import { Link } from "react-router-dom";

export default function NotFoundPage() {
    return (
        <div className="flex-1 w-full flex flex-col items-center justify-center p-8 text-center bg-gradient-to-b from-background to-muted/30">
            <div className="max-w-md space-y-4">
                <span className="text-6xl font-extrabold text-primary">404</span>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">Page Not Found</h1>
                <p className="text-muted-foreground text-sm">The page you requested does not exist or has been moved.</p>
                <div className="pt-2">
                    <Link 
                        to="/" 
                        className="inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground font-medium px-4 py-2 text-sm hover:opacity-90 transition-opacity"
                    >
                        Go Home
                    </Link>
                </div>
            </div>
        </div>
    );
}
