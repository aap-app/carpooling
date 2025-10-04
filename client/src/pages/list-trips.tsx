import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { type Trip } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
import EditTripModal from "@/components/edit-trip-modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plane, CheckCircle, Search, Users, Filter, Layers, Calendar, Clock, Edit } from "lucide-react";

export default function ListTrips() {
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [sortBy, setSortBy] = useState("date-asc");
  const [filterStatus, setFilterStatus] = useState("all");
  const [groupedView, setGroupedView] = useState(false);
  const [nearbyFilter, setNearbyFilter] = useState<string>("off");
  const { user } = useAuth();

  const { data: trips = [], isLoading } = useQuery<Trip[]>({
    queryKey: ["/api/trips"],
  });

  const statusCounts = useMemo(() => {
    return {
      total: trips.length,
      booked: trips.filter(t => t.carStatus === "booked").length,
      looking: trips.filter(t => t.carStatus === "looking").length,
      sharing: trips.filter(t => t.carStatus === "sharing").length,
    };
  }, [trips]);

  const filteredAndSortedTrips = useMemo(() => {
    let filtered = trips;
    
    // Filter by status
    if (filterStatus !== "all") {
      filtered = filtered.filter(trip => trip.carStatus === filterStatus);
    }

    // Filter by nearby flights
    if (nearbyFilter !== "off" && user) {
      const userName = [user.firstName, user.lastName].filter(Boolean).join(" ");
      
      // Find user's flights
      const userTrips = filtered.filter(trip => trip.name === userName);
      
      if (userTrips.length > 0) {
        const minutesRange = parseInt(nearbyFilter);
        
        // Get all flights within time range of user's flights
        const nearbyTrips = filtered.filter(trip => {
          // Always include user's own trips
          if (trip.name === userName) return true;
          
          // Check if this trip is within range of any of user's trips
          return userTrips.some(userTrip => {
            const userDateTime = new Date(`${userTrip.flightDate}T${userTrip.flightTime}`).getTime();
            const tripDateTime = new Date(`${trip.flightDate}T${trip.flightTime}`).getTime();
            const diffMinutes = Math.abs(tripDateTime - userDateTime) / (1000 * 60);
            return diffMinutes <= minutesRange;
          });
        });
        
        filtered = nearbyTrips;
      }
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "date-desc":
          return new Date(`${b.flightDate}T${b.flightTime}`).getTime() - new Date(`${a.flightDate}T${a.flightTime}`).getTime();
        case "status":
          return a.carStatus.localeCompare(b.carStatus);
        case "date-asc":
        default:
          return new Date(`${a.flightDate}T${a.flightTime}`).getTime() - new Date(`${b.flightDate}T${b.flightTime}`).getTime();
      }
    });

    return sorted;
  }, [trips, sortBy, filterStatus, nearbyFilter, user]);

  const groupedTrips = useMemo(() => {
    const groups = filteredAndSortedTrips.reduce((acc, trip) => {
      // Group by flight number AND date/time
      const key = `${trip.flightNumber}|${trip.flightDate}|${trip.flightTime}`;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(trip);
      return acc;
    }, {} as Record<string, Trip[]>);

    return Object.entries(groups).map(([key, trips]) => {
      const [flightNumber, date, time] = key.split('|');
      return {
        flightNumber,
        date,
        time,
        trips,
        count: trips.length,
        key,
      };
    });
  }, [filteredAndSortedTrips]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getStatusBadge = (status: string) => {
    const config = {
      booked: { icon: CheckCircle, className: "bg-accent/10 text-accent", label: "Booked" },
      looking: { icon: Search, className: "bg-warning/10 text-warning", label: "Looking" },
      sharing: { icon: Users, className: "bg-secondary/10 text-secondary", label: "Sharing" }
    };
    
    const { icon: Icon, className, label } = config[status as keyof typeof config];
    
    return (
      <Badge className={`${className} border-0`} data-testid={`badge-status-${status}`}>
        <Icon className="mr-1 h-3 w-3" />
        {label}
      </Badge>
    );
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  if (isLoading) {
    return (
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-1/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="container mx-auto px-4 py-8 max-w-7xl">
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Trips</p>
                <p className="text-2xl font-bold mt-1" data-testid="stat-total-trips">{statusCounts.total}</p>
              </div>
              <div className="bg-primary/10 rounded-full p-3">
                <Plane className="text-primary text-xl" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Cars Booked</p>
                <p className="text-2xl font-bold mt-1" data-testid="stat-booked">{statusCounts.booked}</p>
              </div>
              <div className="bg-accent/10 rounded-full p-3">
                <CheckCircle className="text-accent text-xl" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Looking for Ride</p>
                <p className="text-2xl font-bold mt-1" data-testid="stat-looking">{statusCounts.looking}</p>
              </div>
              <div className="bg-warning/10 rounded-full p-3">
                <Search className="text-warning text-xl" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Sharing Rides</p>
                <p className="text-2xl font-bold mt-1" data-testid="stat-sharing">{statusCounts.sharing}</p>
              </div>
              <div className="bg-secondary/10 rounded-full p-3">
                <Users className="text-secondary text-xl" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Sort Controls */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center space-x-2">
              <Filter className="text-muted-foreground h-4 w-4" />
              <span className="text-sm font-medium">Filters & Sort</span>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              {/* Sort by Date */}
              <div className="flex items-center space-x-2">
                <label className="text-xs text-muted-foreground">Sort by:</label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="h-9 text-sm" data-testid="select-sort">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date-asc">Date (Earliest)</SelectItem>
                    <SelectItem value="date-desc">Date (Latest)</SelectItem>
                    <SelectItem value="status">Status</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Filter by Status */}
              <div className="flex items-center space-x-2">
                <label className="text-xs text-muted-foreground">Status:</label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="h-9 text-sm" data-testid="select-filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="booked">Booked</SelectItem>
                    <SelectItem value="looking">Looking</SelectItem>
                    <SelectItem value="sharing">Sharing</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Nearby Flights Filter */}
              <div className="flex items-center space-x-2">
                <label className="text-xs text-muted-foreground">Nearby:</label>
                <Select value={nearbyFilter} onValueChange={setNearbyFilter}>
                  <SelectTrigger className="h-9 text-sm" data-testid="select-nearby">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="off">Off</SelectItem>
                    <SelectItem value="30">Within 30 min</SelectItem>
                    <SelectItem value="60">Within 1 hour</SelectItem>
                    <SelectItem value="180">Within 3 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Group by Flight */}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setGroupedView(!groupedView)}
                data-testid="button-toggle-grouping"
              >
                <Layers className="mr-2 h-4 w-4" />
                {groupedView ? "Ungroup Flights" : "Group by Flight"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trips List */}
      <Card className="overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">Name</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">Flight Date & Time</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">Flight Number</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">Car Status</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredAndSortedTrips.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                    No trips found. Add your first trip to get started!
                  </td>
                </tr>
              ) : (
                filteredAndSortedTrips.map((trip) => (
                  <tr key={trip.id} className="hover:bg-muted/30 transition-colors" data-testid={`row-trip-${trip.id}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <span className="text-primary font-medium text-sm">{getInitials(trip.name)}</span>
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-foreground" data-testid={`text-name-${trip.id}`}>{trip.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-foreground" data-testid={`text-date-${trip.id}`}>{formatDate(trip.flightDate)}</div>
                      <div className="text-xs text-muted-foreground" data-testid={`text-time-${trip.id}`}>{formatTime(trip.flightTime)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="inline-flex items-center px-2.5 py-1 rounded-md bg-muted text-sm font-mono" data-testid={`text-flight-number-${trip.id}`}>
                        {trip.flightNumber}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(trip.carStatus)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setEditingTrip(trip)}
                        data-testid={`button-edit-${trip.id}`}
                      >
                        <Edit className="mr-1 h-4 w-4" />
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-border">
          {filteredAndSortedTrips.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No trips found. Add your first trip to get started!
            </div>
          ) : (
            filteredAndSortedTrips.map((trip) => (
              <div key={trip.id} className="p-4 hover:bg-muted/30 transition-colors" data-testid={`card-trip-${trip.id}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0 h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <span className="text-primary font-medium text-sm">{getInitials(trip.name)}</span>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-foreground">{trip.name}</div>
                      <div className="text-xs text-muted-foreground font-mono">{trip.flightNumber}</div>
                    </div>
                  </div>
                  {getStatusBadge(trip.carStatus)}
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                  <div className="flex items-center">
                    <Calendar className="mr-1 h-3 w-3" />
                    <span>{formatDate(trip.flightDate)}</span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="mr-1 h-3 w-3" />
                    <span>{formatTime(trip.flightTime)}</span>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={() => setEditingTrip(trip)}
                  data-testid={`button-edit-mobile-${trip.id}`}
                >
                  <Edit className="mr-1 h-4 w-4" />
                  Edit Trip
                </Button>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Carpool Opportunities Section */}
      {groupedView && (
        <Card className="mt-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">
                <Users className="inline text-secondary mr-2" />
                Carpool Opportunities
              </h3>
              <span className="text-xs text-muted-foreground">Same flight = Easy carpooling</span>
            </div>
            
            <div className="space-y-3">
              {groupedTrips.map((group) => (
                <div key={group.key} className="bg-muted/30 rounded-lg p-4 border border-border" data-testid={`group-${group.key}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <Badge className="bg-primary/10 text-primary font-mono font-medium">
                        {group.flightNumber}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(group.date)} • {formatTime(group.time)}
                      </span>
                    </div>
                    <span className="text-xs font-medium text-foreground">
                      {group.count} traveler{group.count !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {group.trips.map((trip) => (
                      <div key={trip.id} className="inline-flex items-center space-x-1.5 bg-card px-3 py-1.5 rounded-md border border-border">
                        <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
                          <span className="text-primary text-xs font-medium">{getInitials(trip.name)}</span>
                        </div>
                        <span className="text-xs font-medium">{trip.name}</span>
                        <div className="text-xs">
                          {getStatusBadge(trip.carStatus)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <EditTripModal 
        trip={editingTrip} 
        isOpen={!!editingTrip} 
        onClose={() => setEditingTrip(null)} 
      />
    </main>
  );
}
