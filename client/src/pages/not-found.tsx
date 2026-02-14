import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import Seo from "@/lib/seo/Seo";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <Seo
        title="Page not found | TwoPaws"
        description="The page you requested could not be found."
        canonicalUrl="/"
        noIndex
      />
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <h1 className="text-2xl font-bold text-gray-900">404 Page Not Found</h1>
          </div>

          <p className="mt-4 text-sm text-gray-600">
            The page may have moved, or the URL might be incorrect.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
