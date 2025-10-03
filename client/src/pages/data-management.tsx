import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Download, Upload, AlertTriangle, Database } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Trip } from "@shared/schema";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function DataManagement() {
  const { toast } = useToast();
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [parsedTrips, setParsedTrips] = useState<any[]>([]);

  const { data: trips = [], isLoading } = useQuery<Trip[]>({
    queryKey: ["/api/trips"],
  });

  const exportMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/trips/export", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to export");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `airport-carpool-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
    onSuccess: () => {
      toast({
        title: "Export Successful",
        description: "Your trips have been exported to CSV.",
      });
    },
    onError: () => {
      toast({
        title: "Export Failed",
        description: "Failed to export trips. Please try again.",
        variant: "destructive",
      });
    },
  });

  const importMutation = useMutation({
    mutationFn: async (trips: any[]) => {
      await apiRequest("POST", "/api/trips/import", trips);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trips"] });
      toast({
        title: "Import Successful",
        description: `Successfully imported ${parsedTrips.length} trips. All previous data has been replaced.`,
      });
      setCsvFile(null);
      setParsedTrips([]);
    },
    onError: (error) => {
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : "Failed to import trips",
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const parsed = parseCSV(text);
      setParsedTrips(parsed);
    };
    reader.readAsText(file);
  };

  const parseCSV = (text: string) => {
    const lines = text.trim().split("\n");
    if (lines.length < 2) return [];

    // Helper to parse a CSV line handling quoted values
    const parseCSVLine = (line: string): string[] => {
      const values: string[] = [];
      let currentValue = "";
      let insideQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];

        if (char === '"') {
          if (insideQuotes && nextChar === '"') {
            // Escaped quote
            currentValue += '"';
            i++; // Skip next quote
          } else {
            // Toggle quote state
            insideQuotes = !insideQuotes;
          }
        } else if (char === "," && !insideQuotes) {
          // End of value
          values.push(currentValue.trim());
          currentValue = "";
        } else {
          currentValue += char;
        }
      }
      
      // Add last value
      values.push(currentValue.trim());
      return values;
    };

    const headers = parseCSVLine(lines[0]).map((h) => h.trim().toLowerCase());
    const trips = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      const trip: any = {};

      headers.forEach((header, index) => {
        const value = values[index];
        if (header === "name") trip.name = value;
        else if (header === "flight date" || header === "flightdate") trip.flightDate = value;
        else if (header === "flight time" || header === "flighttime") trip.flightTime = value;
        else if (header === "flight number" || header === "flightnumber") trip.flightNumber = value;
        else if (header === "car status" || header === "carstatus") {
          const status = value.toLowerCase();
          if (status.includes("book")) trip.carStatus = "booked";
          else if (status.includes("look")) trip.carStatus = "looking";
          else if (status.includes("shar")) trip.carStatus = "sharing";
          else trip.carStatus = status;
        }
      });

      if (trip.name && trip.flightDate && trip.flightTime && trip.flightNumber && trip.carStatus) {
        trips.push(trip);
      }
    }

    return trips;
  };

  const handleImport = () => {
    if (parsedTrips.length === 0) {
      toast({
        title: "No Data",
        description: "Please select a valid CSV file with trip data.",
        variant: "destructive",
      });
      return;
    }
    setShowImportConfirm(true);
  };

  const confirmImport = () => {
    importMutation.mutate(parsedTrips);
    setShowImportConfirm(false);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Data Management</h1>
        <p className="text-muted-foreground">
          Export your trips to CSV or import data from Google Sheets.
        </p>
      </div>

      <div className="space-y-6">
        {/* Export Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Export Data
            </CardTitle>
            <CardDescription>
              Download all trips as a CSV file. You can open this in Excel or Google Sheets.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Button
                onClick={() => exportMutation.mutate()}
                disabled={exportMutation.isPending || isLoading}
                data-testid="button-export-csv"
              >
                <Download className="mr-2 h-4 w-4" />
                {exportMutation.isPending ? "Exporting..." : `Export ${trips.length} Trips`}
              </Button>
              {!isLoading && (
                <span className="text-sm text-muted-foreground">
                  Current database has {trips.length} trip{trips.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Import Section */}
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Import Data (Danger Zone)
            </CardTitle>
            <CardDescription>
              Upload a CSV file to replace ALL existing trips. This action cannot be undone.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Warning: Data Replacement</AlertTitle>
              <AlertDescription>
                <p className="font-semibold mb-2">Importing will DELETE all {trips.length} existing trips and replace them with your CSV data.</p>
                <p className="text-sm">⚠️ <strong>Export your current data first</strong> as a backup.</p>
                <p className="text-sm">⚠️ If an error occurs during import, data may be lost.</p>
                <p className="text-sm">⚠️ This operation cannot be undone.</p>
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Select CSV File
                </label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="block w-full text-sm text-muted-foreground
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-semibold
                    file:bg-primary file:text-primary-foreground
                    hover:file:bg-primary/90
                    cursor-pointer"
                  data-testid="input-csv-file"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  CSV should have columns: Name, Flight Date, Flight Time, Flight Number, Car Status
                </p>
              </div>

              {csvFile && parsedTrips.length > 0 && (
                <div className="rounded-md bg-muted p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Database className="h-4 w-4" />
                    <span className="font-medium">Preview</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    File: <span className="font-medium">{csvFile.name}</span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Found: <span className="font-medium">{parsedTrips.length} valid trips</span>
                  </p>
                </div>
              )}

              <Button
                onClick={handleImport}
                disabled={!csvFile || parsedTrips.length === 0 || importMutation.isPending}
                variant="destructive"
                data-testid="button-import-csv"
              >
                <Upload className="mr-2 h-4 w-4" />
                {importMutation.isPending ? "Importing..." : "Import and Replace All Data"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={showImportConfirm} onOpenChange={setShowImportConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Are you absolutely sure?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p className="font-semibold">This is a destructive operation that will:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Delete all {trips.length} existing trips from the database</li>
                <li>Import {parsedTrips.length} new trips from your CSV file</li>
                <li><strong>Cannot be undone</strong></li>
                <li className="text-destructive"><strong>If an error occurs, data may be lost</strong></li>
              </ul>
              <p className="font-semibold mt-4 text-destructive">
                ⚠️ Have you exported your current data as a backup?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-import">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmImport}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-import"
            >
              Yes, Replace All Data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
