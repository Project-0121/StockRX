import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileQuestion, ArrowLeft, Home } from "lucide-react";
import { APP_NAME } from "@/lib/constants";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white border border-border rounded-lg shadow-sm p-8 text-center space-y-6">
        <div className="w-14 h-14 bg-blue-50 text-primary rounded-full flex items-center justify-center mx-auto border border-blue-200">
          <FileQuestion className="h-7 w-7" />
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-navy">404 - Not Found</h1>
          <p className="text-sm text-muted-foreground">
            The requested clinical resource or record does not exist or has been relocated within {APP_NAME}.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/dashboard">
            <Button className="w-full bg-primary hover:bg-primary-hover text-white">
              <Home className="h-4 w-4 mr-2" /> Return to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
