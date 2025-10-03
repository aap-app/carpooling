import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plane, Users, Calendar, Car } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-blue-600 dark:bg-blue-500 rounded-full">
              <Plane className="h-12 w-12 text-white" />
            </div>
          </div>
          <h1 className="text-5xl font-bold mb-4 text-gray-900 dark:text-white">
            Airport Carpool Coordinator
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
            Coordinate rides to the airport with your friends. Share costs, reduce carbon footprint, and travel together.
          </p>
          <Button
            size="lg"
            className="text-lg px-8 py-6"
            onClick={() => window.location.href = '/api/login'}
            data-testid="button-login"
          >
            Log In to Get Started
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-16">
          <Card>
            <CardHeader>
              <div className="flex justify-center mb-4">
                <Calendar className="h-10 w-10 text-blue-600 dark:text-blue-400" />
              </div>
              <CardTitle className="text-center">Add Your Trip</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                Enter your flight details including date, time, and flight number to let others know when you're traveling.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex justify-center mb-4">
                <Users className="h-10 w-10 text-blue-600 dark:text-blue-400" />
              </div>
              <CardTitle className="text-center">Find Travel Buddies</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                See who else is traveling on the same day and coordinate carpools with friends heading to the airport.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex justify-center mb-4">
                <Car className="h-10 w-10 text-blue-600 dark:text-blue-400" />
              </div>
              <CardTitle className="text-center">Share the Ride</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                Split costs, reduce traffic, and enjoy the company. Update your status to booked, looking, or offering to share.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Join your travel community and make airport trips easier for everyone.
          </p>
        </div>
      </div>
    </div>
  );
}
