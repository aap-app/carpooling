import { Link, useLocation } from "wouter";
import { Car, Plus, List } from "lucide-react";

export default function Header() {
  const [location] = useLocation();

  return (
    <header className="bg-card border-b border-border sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4 py-4 max-w-7xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-primary text-primary-foreground rounded-lg p-2">
              <Car className="text-xl" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Airport Carpool</h1>
              <p className="text-xs text-muted-foreground">Schedule your rides together</p>
            </div>
          </div>
          
          {/* View Toggle */}
          <div className="flex items-center space-x-2 bg-muted rounded-lg p-1">
            <Link 
              href="/add"
              className={`inline-flex items-center text-xs px-3 py-1.5 rounded-md transition-colors ${
                location === "/" || location === "/add" 
                  ? "bg-card shadow-sm text-foreground" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
              data-testid="link-add-trip"
            >
              <Plus className="mr-1.5 h-3 w-3" />
              Add Trip
            </Link>
            <Link 
              href="/trips"
              className={`inline-flex items-center text-xs px-3 py-1.5 rounded-md transition-colors ${
                location === "/trips" 
                  ? "bg-card shadow-sm text-foreground" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
              data-testid="link-view-trips"
            >
              <List className="mr-1.5 h-3 w-3" />
              View Trips
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
