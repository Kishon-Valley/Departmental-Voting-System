import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { User, Mail, GraduationCap, Upload, Image as ImageIcon, Save, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function Profile() {
  const { user, refetchUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    fullName: user?.fullName || "",
    email: user?.email || "",
    year: user?.year || "",
    profilePicture: user?.profilePicture || "",
  });

  // Update form data when user changes
  useEffect(() => {
    if (user) {
      setFormData({
        fullName: user.fullName || "",
        email: user.email || "",
        year: user.year || "",
        profilePicture: user.profilePicture || "",
      });
    }
  }, [user]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please select a JPEG, PNG, or WebP image.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 5MB.",
        variant: "destructive",
      });
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewImage(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload file
    handleFileUpload(file);
  };

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    try {
      // First, verify user is authenticated by getting user ID
      const userResponse = await fetch('/api/auth/me', {
        credentials: 'include',
      });

      if (!userResponse.ok) {
        throw new Error('Authentication required');
      }

      const userData = await userResponse.json();
      const userId = userData.user?.id;

      if (!userId) {
        throw new Error('User ID not found');
      }

      // If Supabase client is not available, fall back to server upload
      if (!supabase) {
        // Fallback: try server upload with base64
        const reader = new FileReader();
        reader.onloadend = async () => {
          try {
            const base64 = reader.result as string;
            const response = await apiRequest('POST', '/api/auth/upload-avatar-base64', {
              file: base64,
              filename: file.name,
              mimeType: file.type,
            });
            const data = await response.json();
            setFormData(prev => ({ ...prev, profilePicture: data.url }));
            toast({
              title: "Image uploaded",
              description: "Your profile picture has been uploaded successfully.",
            });
          } catch (error) {
            const err = error as Error;
            toast({
              title: "Upload Failed",
              description: err.message || "Failed to upload image. Please try again.",
              variant: "destructive",
            });
            setPreviewImage(null);
          } finally {
            setIsUploading(false);
          }
        };
        reader.readAsDataURL(file);
        return;
      }

      // Upload directly to Supabase Storage
      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('student-avatars')
        .upload(filePath, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        throw new Error(uploadError.message || 'Failed to upload to storage');
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('student-avatars')
        .getPublicUrl(filePath);

      // Update form data with new URL
      setFormData(prev => ({ ...prev, profilePicture: urlData.publicUrl }));
      
      toast({
        title: "Image uploaded",
        description: "Your profile picture has been uploaded successfully.",
      });
    } catch (error) {
      const err = error as Error;
      toast({
        title: "Upload Failed",
        description: err.message || "Failed to upload image. Please try again.",
        variant: "destructive",
      });
      setPreviewImage(null);
    } finally {
      setIsUploading(false);
    }
  };

  const updateProfileMutation = useMutation({
    mutationFn: async (data: { fullName?: string; email?: string | null; year?: string | null; profilePicture?: string | null }) => {
      const res = await apiRequest("PUT", "/api/auth/profile", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      refetchUser();
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    setIsSaving(true);
    updateProfileMutation.mutate({
      fullName: formData.fullName,
      email: formData.email || null,
      year: formData.year || null,
      profilePicture: formData.profilePicture || null,
    });
    setIsSaving(false);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (!user) {
    return null;
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 py-12">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-8">
              <h1 className="text-3xl font-bold font-serif mb-2">My Profile</h1>
              <p className="text-muted-foreground">Manage your personal information and account settings</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Profile Picture Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Profile Picture</CardTitle>
                  <CardDescription>Update your profile picture</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-center">
                    <div className="relative group">
                      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 dark:from-primary/30 dark:to-primary/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <Avatar className="relative h-32 w-32 ring-4 ring-slate-100 dark:ring-slate-800 ring-offset-4 shadow-lg">
                        <AvatarImage 
                          src={previewImage || formData.profilePicture || user.profilePicture || undefined} 
                          alt={user.fullName}
                          className="object-cover"
                        />
                        <AvatarFallback className="text-3xl font-bold bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 text-slate-700 dark:text-slate-300">
                          {getInitials(user.fullName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-2 -right-2">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/jpeg,image/jpg,image/png,image/webp"
                          className="hidden"
                          onChange={handleFileSelect}
                          disabled={isUploading}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-10 w-10 rounded-full p-0 border-2 border-white dark:border-slate-950 bg-white dark:bg-slate-900 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploading}
                          title="Upload profile picture"
                        >
                          {isUploading ? (
                            <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Upload className="h-4 w-4 text-primary" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Input
                      type="url"
                      value={formData.profilePicture}
                      onChange={(e) => setFormData({ ...formData, profilePicture: e.target.value })}
                      placeholder="Or enter image URL"
                      className="text-sm"
                    />
                    <p className="text-xs text-muted-foreground text-center">
                      Max 5MB (JPEG, PNG, WebP)
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Personal Information Card */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Personal Information</CardTitle>
                  <CardDescription>Update your personal details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="indexNumber" className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Index Number
                    </Label>
                    <Input
                      id="indexNumber"
                      value={user.indexNumber}
                      disabled
                      className="bg-slate-100/80 dark:bg-slate-900/80 font-mono cursor-not-allowed"
                    />
                    <p className="text-xs text-muted-foreground">
                      Index number cannot be changed
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fullName" className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Full Name
                    </Label>
                    <Input
                      id="fullName"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      placeholder="Enter your full name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email Address
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="student@example.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="year" className="flex items-center gap-2">
                      <GraduationCap className="h-4 w-4" />
                      Academic Year / Class
                    </Label>
                    <Input
                      id="year"
                      value={formData.year}
                      onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                      placeholder="e.g., Year 1, Year 2, Level 300"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setFormData({
                          fullName: user.fullName || "",
                          email: user.email || "",
                          year: user.year || "",
                          profilePicture: user.profilePicture || "",
                        });
                        setPreviewImage(null);
                      }}
                      disabled={isSaving || isUploading}
                    >
                      Reset
                    </Button>
                    <Button
                      onClick={handleSave}
                      disabled={isSaving || isUploading}
                      className="min-w-[130px]"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </ProtectedRoute>
  );
}

