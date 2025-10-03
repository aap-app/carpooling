import { Link, useLocation } from "wouter";
import { Car, Plus, List, LogOut, User, Settings } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Header() {
  const [location] = useLocation();
  const { user, isAuthenticated } = useAuth();

  const getUserInitials = () => {
    if (!user) return "U";
    if (user.firstName && user.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user.email) {
      return user.email[0].toUpperCase();
    }
    return "U";
  };

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
          
          <div className="flex items-center space-x-4">
            {/* View Toggle - only show when authenticated */}
            {isAuthenticated && (
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
                <Link 
                  href="/admin"
                  className={`inline-flex items-center text-xs px-3 py-1.5 rounded-md transition-colors ${
                    location === "/admin" 
                      ? "bg-card shadow-sm text-foreground" 
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  data-testid="link-admin"
                >
                  <Settings className="mr-1.5 h-3 w-3" />
                  Admin
                </Link>
              </div>
            )}

            {/* Login Button - show when not authenticated */}
            {!isAuthenticated && (
              <Button onClick={() => window.location.href = '/api/login'} data-testid="button-header-login">
                Log In
              </Button>
            )}

            {/* User Menu - show when authenticated */}
            {isAuthenticated && user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full" data-testid="button-user-menu">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user.profileImageUrl || undefined} alt={user.email || "User"} />
                      <AvatarFallback>{getUserInitials()}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {user.firstName && user.lastName 
                          ? `${user.firstName} ${user.lastName}` 
                          : "My Account"}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email || ""}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => window.location.href = '/api/logout'} data-testid="button-logout">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log Out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
