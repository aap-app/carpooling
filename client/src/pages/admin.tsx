import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Users, Key, Database, Copy, Trash2, AlertTriangle, Download, Upload, CheckCircle, XCircle, Settings, Plus, X as XIcon, Shuffle, Link as LinkIcon } from "lucide-react";
import { nanoid } from "nanoid";
import { useToast } from "@/hooks/use-toast";
import { useAuth, type UserWithAdmin } from "@/hooks/useAuth";
import type { InvitationCode, Trip } from "@shared/schema";

export default function Admin() {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedTrips, setParsedTrips] = useState<any[]>([]);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isCreateInviteDialogOpen, setIsCreateInviteDialogOpen] = useState(false);
  const [customInviteCode, setCustomInviteCode] = useState("");
  const [inviteMaxUses, setInviteMaxUses] = useState(1);
  const [inviteExpiresInHours, setInviteExpiresInHours] = useState(24);
  const [allowedDomains, setAllowedDomains] = useState<string[]>([]);
  const [allowedGitHubOrgs, setAllowedGitHubOrgs] = useState<string[]>([]);
  const [newDomain, setNewDomain] = useState("");
  const [newOrg, setNewOrg] = useState("");

  // Fetch all users (admin only)
  const { data: users = [], isLoading: usersLoading } = useQuery<UserWithAdmin[]>({
    queryKey: ["/api/admin/users"],
    enabled: currentUser?.isAdmin ?? false,
  });

  // Fetch all invitation codes (admin only)
  const { data: invitations = [], isLoading: invitationsLoading } = useQuery<InvitationCode[]>({
    queryKey: ["/api/admin/invitations"],
    enabled: currentUser?.isAdmin ?? false,
  });

  // Fetch all trips for CSV export
  const { data: trips = [] } = useQuery<Trip[]>({
    queryKey: ["/api/trips"],
  });

  // Create invitation code mutation
  const createInvitationMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/invitations");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Invitation code created",
        description: "A new invitation code has been generated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/invitations"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create invitation code",
        variant: "destructive",
      });
    },
  });

  // Revoke invitation code mutation
  const revokeInvitationMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/invitations/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Invitation code revoked",
        description: "The invitation code has been revoked.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/invitations"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to revoke invitation code",
        variant: "destructive",
      });
    },
  });

  // Import CSV mutation
  const importMutation = useMutation({
    mutationFn: async (trips: any[]) => {
      const response = await apiRequest("POST", "/api/trips/import", trips);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Import successful",
        description: `Imported ${data.count} trips. Deleted ${data.deleted} existing trips.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/trips"] });
      setIsImportDialogOpen(false);
      setSelectedFile(null);
      setParsedTrips([]);
    },
    onError: (error: any) => {
      toast({
        title: "Import failed",
        description: error.message || "Failed to import trips",
        variant: "destructive",
      });
    },
  });

  // Fetch OAuth settings (admin only)
  const { data: oauthSettings } = useQuery<{ allowedDomains: string[]; allowedGitHubOrgs: string[] }>({
    queryKey: ["/api/admin/settings/oauth"],
    enabled: currentUser?.isAdmin ?? false,
  });

  // Update local state when OAuth settings are loaded
  useEffect(() => {
    if (oauthSettings) {
      setAllowedDomains(oauthSettings.allowedDomains || []);
      setAllowedGitHubOrgs(oauthSettings.allowedGitHubOrgs || []);
    }
  }, [oauthSettings]);

  // Update OAuth settings mutation
  const updateOAuthSettingsMutation = useMutation({
    mutationFn: async (settings: { allowedDomains: string[]; allowedGitHubOrgs: string[] }) => {
      const response = await apiRequest("PUT", "/api/admin/settings/oauth", settings);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Settings saved",
        description: "OAuth settings have been updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings/oauth"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update OAuth settings",
        variant: "destructive",
      });
    },
  });

  // Create invitation with configuration
  const createConfiguredInvitationMutation = useMutation({
    mutationFn: async (params: { code?: string; maxUses: number; expiresInHours: number }) => {
      const response = await apiRequest("POST", "/api/admin/invitations", params);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Invitation code created",
        description: "A new invitation code has been generated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/invitations"] });
      setIsCreateInviteDialogOpen(false);
      setCustomInviteCode("");
      setInviteMaxUses(1);
      setInviteExpiresInHours(24);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create invitation code",
        variant: "destructive",
      });
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest("DELETE", `/api/admin/users/${userId}`);
    },
    onSuccess: () => {
      toast({
        title: "User deleted",
        description: "The user has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive",
      });
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Invitation code copied to clipboard",
    });
  };

  const handleExport = () => {
    window.location.href = "/api/trips/export";
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseCSV(text);
      setParsedTrips(parsed);
    };
    reader.readAsText(file);
  };

  const parseCSV = (text: string) => {
    const lines = text.trim().split("\n");
    if (lines.length < 2) return [];

    const parseCSVLine = (line: string): string[] => {
      const values: string[] = [];
      let currentValue = "";
      let insideQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];

        if (char === '"') {
          if (insideQuotes && nextChar === '"') {
            currentValue += '"';
            i++;
          } else {
            insideQuotes = !insideQuotes;
          }
        } else if (char === "," && !insideQuotes) {
          values.push(currentValue.trim());
          currentValue = "";
        } else {
          currentValue += char;
        }
      }
      
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
        title: "No data to import",
        description: "Please select a valid CSV file with trip data.",
        variant: "destructive",
      });
      return;
    }
    setIsImportDialogOpen(true);
  };

  const confirmImport = () => {
    importMutation.mutate(parsedTrips);
  };

  const addDomain = () => {
    if (newDomain && !allowedDomains.includes(newDomain)) {
      setAllowedDomains([...allowedDomains, newDomain]);
      setNewDomain("");
    }
  };

  const removeDomain = (domain: string) => {
    setAllowedDomains(allowedDomains.filter(d => d !== domain));
  };

  const addGitHubOrg = () => {
    if (newOrg && !allowedGitHubOrgs.includes(newOrg)) {
      setAllowedGitHubOrgs([...allowedGitHubOrgs, newOrg]);
      setNewOrg("");
    }
  };

  const removeGitHubOrg = (org: string) => {
    setAllowedGitHubOrgs(allowedGitHubOrgs.filter(o => o !== org));
  };

  const saveOAuthSettings = () => {
    updateOAuthSettingsMutation.mutate({ allowedDomains, allowedGitHubOrgs });
  };

  const createInvitationWithConfig = () => {
    if (!customInviteCode.trim()) {
      toast({
        title: "Error",
        description: "Please enter or generate an invitation code",
        variant: "destructive",
      });
      return;
    }
    createConfiguredInvitationMutation.mutate({
      code: customInviteCode.trim(),
      maxUses: inviteMaxUses,
      expiresInHours: inviteExpiresInHours,
    });
  };

  const copyInviteUrl = (code: string) => {
    const url = `${window.location.origin}/invite/${code}`;
    navigator.clipboard.writeText(url);
    toast({
      title: "Copied!",
      description: "Invitation link copied to clipboard",
    });
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Administration</h1>
        <p className="text-muted-foreground">Manage users, invitation codes, and data</p>
      </div>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList data-testid="tabs-admin">
          <TabsTrigger value="users" data-testid="tab-users">
            <Users className="h-4 w-4 mr-2" />
            Users
          </TabsTrigger>
          <TabsTrigger value="invitations" data-testid="tab-invitations">
            <Key className="h-4 w-4 mr-2" />
            Invitations
          </TabsTrigger>
          {currentUser?.isAdmin && (
            <TabsTrigger value="oauth" data-testid="tab-oauth">
              <Settings className="h-4 w-4 mr-2" />
              OAuth Settings
            </TabsTrigger>
          )}
          <TabsTrigger value="data" data-testid="tab-data">
            <Database className="h-4 w-4 mr-2" />
            Data
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>Registered Users</CardTitle>
              <CardDescription>All users who can access the application</CardDescription>
            </CardHeader>
            <CardContent>
              {usersLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading users...</div>
              ) : users.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No users found</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Auth Method</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <tr key={user.id} data-testid={`row-user-${user.id}`}>
                        <TableCell className="font-medium">
                          {user.firstName} {user.lastName}
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge variant={user.authProvider === "oidc" ? "default" : "secondary"} data-testid={`badge-auth-${user.id}`}>
                            {user.authProvider === "oidc" ? "OAuth" : "Invitation"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(user.createdAt!).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {currentUser?.isAdmin && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                if (window.confirm(`Are you sure you want to delete ${user.firstName} ${user.lastName}? This action cannot be undone.`)) {
                                  deleteUserMutation.mutate(user.id);
                                }
                              }}
                              disabled={deleteUserMutation.isPending || user.id === currentUser?.id || user.isAdmin}
                              data-testid={`button-delete-user-${user.id}`}
                              title={
                                user.isAdmin 
                                  ? "Cannot delete admin user" 
                                  : user.id === currentUser?.id 
                                    ? "Cannot delete your own account" 
                                    : "Delete user"
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </tr>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invitations">
          <Card>
            <CardHeader>
              <CardTitle>Invitation Codes</CardTitle>
              <CardDescription>Create and manage invitation codes for new users</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={() => setIsCreateInviteDialogOpen(true)}
                data-testid="button-create-invitation"
              >
                <Plus className="h-4 w-4 mr-2" />
                Generate New Code
              </Button>

              {invitationsLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading invitation codes...</div>
              ) : invitations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No invitation codes yet</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Usage</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invitations.map((invitation) => {
                      const isExpired = invitation.expiresAt && new Date(invitation.expiresAt) < new Date();
                      const isFullyUsed = invitation.currentUses >= invitation.maxUses;
                      return (
                        <TableRow key={invitation.id} data-testid={`row-invitation-${invitation.id}`}>
                          <TableCell className="font-mono font-medium">{invitation.code}</TableCell>
                          <TableCell>
                            {invitation.revokedAt ? (
                              <Badge variant="destructive" data-testid={`status-revoked-${invitation.id}`}>
                                <XCircle className="h-3 w-3 mr-1" />
                                Revoked
                              </Badge>
                            ) : isExpired ? (
                              <Badge variant="secondary" data-testid={`status-expired-${invitation.id}`}>
                                Expired
                              </Badge>
                            ) : isFullyUsed ? (
                              <Badge variant="secondary" data-testid={`status-used-${invitation.id}`}>
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Used Up
                              </Badge>
                            ) : (
                              <Badge variant="default" data-testid={`status-active-${invitation.id}`}>
                                Active
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {invitation.currentUses} / {invitation.maxUses}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {invitation.expiresAt 
                              ? new Date(invitation.expiresAt).toLocaleString()
                              : "Never"}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {!invitation.revokedAt && !isExpired && !isFullyUsed && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => copyToClipboard(invitation.code)}
                                    data-testid={`button-copy-${invitation.id}`}
                                    title="Copy invitation code"
                                  >
                                    <Copy className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => copyInviteUrl(invitation.code)}
                                    data-testid={`button-copy-url-${invitation.id}`}
                                    title="Copy invitation link"
                                  >
                                    <LinkIcon className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => revokeInvitationMutation.mutate(invitation.id)}
                                    disabled={revokeInvitationMutation.isPending}
                                    data-testid={`button-revoke-${invitation.id}`}
                                    title="Revoke invitation"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="oauth">
          <Card>
            <CardHeader>
              <CardTitle>OAuth Access Control</CardTitle>
              <CardDescription>Restrict who can log in using OAuth providers</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="allowed-domains" className="text-base font-semibold">
                    Allowed Email Domains (Google Auth)
                  </Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    Only users with email addresses from these domains can log in via Google. Leave empty to allow all domains.
                  </p>
                  <div className="flex gap-2 mb-3">
                    <Input
                      id="allowed-domains"
                      placeholder="example.com"
                      value={newDomain}
                      onChange={(e) => setNewDomain(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && addDomain()}
                      data-testid="input-domain"
                    />
                    <Button onClick={addDomain} data-testid="button-add-domain">
                      <Plus className="h-4 w-4 mr-2" />
                      Add
                    </Button>
                  </div>
                  {allowedDomains.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {allowedDomains.map((domain) => (
                        <Badge key={domain} variant="secondary" className="pl-3 pr-1 py-1">
                          {domain}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-4 w-4 p-0 ml-2"
                            onClick={() => removeDomain(domain)}
                            data-testid={`button-remove-domain-${domain}`}
                          >
                            <XIcon className="h-3 w-3" />
                          </Button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="allowed-orgs" className="text-base font-semibold">
                    Allowed GitHub Organizations
                  </Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    Only users who are members of these GitHub organizations can log in. Leave empty to allow all GitHub users.
                    <br />
                    <span className="text-amber-600 dark:text-amber-500">Note: GitHub org validation requires additional setup and is not yet fully implemented.</span>
                  </p>
                  <div className="flex gap-2 mb-3">
                    <Input
                      id="allowed-orgs"
                      placeholder="my-org"
                      value={newOrg}
                      onChange={(e) => setNewOrg(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && addGitHubOrg()}
                      data-testid="input-github-org"
                    />
                    <Button onClick={addGitHubOrg} data-testid="button-add-github-org">
                      <Plus className="h-4 w-4 mr-2" />
                      Add
                    </Button>
                  </div>
                  {allowedGitHubOrgs.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {allowedGitHubOrgs.map((org) => (
                        <Badge key={org} variant="secondary" className="pl-3 pr-1 py-1">
                          {org}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-4 w-4 p-0 ml-2"
                            onClick={() => removeGitHubOrg(org)}
                            data-testid={`button-remove-github-org-${org}`}
                          >
                            <XIcon className="h-3 w-3" />
                          </Button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <Button 
                onClick={saveOAuthSettings}
                disabled={updateOAuthSettingsMutation.isPending}
                data-testid="button-save-oauth-settings"
              >
                {updateOAuthSettingsMutation.isPending ? "Saving..." : "Save OAuth Settings"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Export Data</CardTitle>
                <CardDescription>Download all trips as CSV file</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={handleExport} data-testid="button-export">
                  <Download className="h-4 w-4 mr-2" />
                  Download CSV ({trips.length} trips)
                </Button>
              </CardContent>
            </Card>

            {/* Only show import to users with "Fedor" in their name */}
            {currentUser && (currentUser.firstName?.includes("Fedor") || currentUser.lastName?.includes("Fedor")) && (
              <Card className="border-red-200 dark:border-red-900">
                <CardHeader>
                  <CardTitle className="text-red-600 dark:text-red-400">Import Data</CardTitle>
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
                      CSV File
                    </label>
                    <Input
                      type="file"
                      accept=".csv"
                      onChange={handleFileChange}
                      data-testid="input-csv-file"
                    />
                  </div>

                  {selectedFile && parsedTrips.length > 0 && (
                    <Alert>
                      <AlertDescription>
                        <strong>Ready to import:</strong> {parsedTrips.length} valid trips found in {selectedFile.name}
                      </AlertDescription>
                    </Alert>
                  )}

                  {selectedFile && parsedTrips.length === 0 && (
                    <Alert variant="destructive">
                      <AlertDescription>
                        No valid trips found in the selected file. Please check your CSV format.
                      </AlertDescription>
                    </Alert>
                  )}

                  <Button
                    variant="destructive"
                    onClick={handleImport}
                    disabled={!selectedFile || parsedTrips.length === 0 || importMutation.isPending}
                    data-testid="button-import"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {importMutation.isPending ? "Importing..." : "Import CSV"}
                  </Button>
                </div>
              </CardContent>
            </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={isCreateInviteDialogOpen} onOpenChange={setIsCreateInviteDialogOpen}>
        <DialogContent data-testid="dialog-create-invitation">
          <DialogHeader>
            <DialogTitle>Create Invitation Code</DialogTitle>
            <DialogDescription>
              Configure the invitation code settings
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="custom-code">Invitation Code</Label>
              <div className="flex gap-2">
                <Input
                  id="custom-code"
                  value={customInviteCode}
                  onChange={(e) => setCustomInviteCode(e.target.value.toUpperCase())}
                  placeholder="Enter custom code or generate random"
                  data-testid="input-custom-code"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCustomInviteCode(nanoid(8).toUpperCase())}
                  data-testid="button-generate-code"
                >
                  <Shuffle className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Custom code or click the shuffle button to generate a random one
              </p>
            </div>
            <div>
              <Label htmlFor="max-uses">Maximum Uses</Label>
              <Input
                id="max-uses"
                type="number"
                min="1"
                value={inviteMaxUses}
                onChange={(e) => setInviteMaxUses(parseInt(e.target.value) || 1)}
                data-testid="input-max-uses"
              />
              <p className="text-sm text-muted-foreground mt-1">
                How many people can use this code (default: 1)
              </p>
            </div>
            <div>
              <Label htmlFor="expires-in">Expires In (hours)</Label>
              <Input
                id="expires-in"
                type="number"
                min="1"
                value={inviteExpiresInHours}
                onChange={(e) => setInviteExpiresInHours(parseInt(e.target.value) || 24)}
                data-testid="input-expires-in"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Code expiration time in hours (default: 24)
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateInviteDialogOpen(false)}
              data-testid="button-cancel-create"
            >
              Cancel
            </Button>
            <Button
              onClick={createInvitationWithConfig}
              disabled={createConfiguredInvitationMutation.isPending}
              data-testid="button-confirm-create"
            >
              {createConfiguredInvitationMutation.isPending ? "Creating..." : "Create Code"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <AlertDialogContent data-testid="dialog-import-confirm">
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
