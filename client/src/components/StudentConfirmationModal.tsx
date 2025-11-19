import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { User, Edit2, Check, X, UserCircle, Mail, GraduationCap, Hash, Shield, AlertCircle, Upload, Image as ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { supabase } from "@/lib/supabase";

interface StudentConfirmationModalProps {
  user: {
    id: string;
    indexNumber: string;
    fullName: string;
    email?: string | null;
    year?: string | null;
    profilePicture?: string | null;
  };
  open: boolean;
  onConfirm: () => void;
  onUpdate: (updatedUser: { email?: string | null; year?: string | null; fullName?: string; profilePicture?: string | null }) => void;
}

export default function StudentConfirmationModal({
  user,
  open,
  onConfirm,
  onUpdate,
}: StudentConfirmationModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    fullName: user.fullName,
    email: user.email || "",
    year: user.year || "",
    profilePicture: user.profilePicture || "",
  });
  const { toast } = useToast();

  // Track carousel slide changes
  useEffect(() => {
    if (!api) {
      return;
    }

    setCurrent(api.selectedScrollSnap());

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

  // Reset form when user changes
  useEffect(() => {
    setFormData({
      fullName: user.fullName,
      email: user.email || "",
      year: user.year || "",
      profilePicture: user.profilePicture || "",
    });
    setIsEditing(false);
  }, [user]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setFormData({
      fullName: user.fullName,
      email: user.email || "",
      year: user.year || "",
      profilePicture: user.profilePicture || "",
    });
    setIsEditing(false);
  };

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

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await apiRequest("PUT", "/api/auth/profile", {
        fullName: formData.fullName,
        email: formData.email || null,
        year: formData.year || null,
        profilePicture: formData.profilePicture || null,
      });

      if (!response.ok) {
        throw new Error("Failed to update profile");
      }

      const data = await response.json();
      onUpdate({
        email: data.user.email,
        year: data.user.year,
        fullName: data.user.fullName,
        profilePicture: data.user.profilePicture,
      });

      toast({
        title: "Profile updated",
        description: "Your details have been saved successfully.",
      });

      setIsEditing(false);
      setPreviewImage(null);
    } catch (error) {
      const err = error as Error;
      toast({
        title: "Update Failed",
        description: err.message || "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-[800px] p-0 gap-0 overflow-hidden border border-slate-200/80 dark:border-slate-800/80 shadow-2xl rounded-xl backdrop-blur-sm">
        {/* Professional Header with Enhanced Design */}
        <div className="relative bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 border-b border-slate-200/60 dark:border-slate-800/60 px-8 py-7">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 dark:from-primary/10" />
          <DialogHeader className="relative space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 dark:from-primary/20 dark:to-primary/10 ring-1 ring-primary/20 dark:ring-primary/30 shadow-sm">
                  <Shield className="h-7 w-7 text-primary" />
                </div>
                <div className="space-y-1.5 pt-0.5">
                  <DialogTitle className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
                    Student Information Verification
                  </DialogTitle>
                  <DialogDescription className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    Please review and verify your student information. Ensure all details are accurate before proceeding.
                  </DialogDescription>
                </div>
              </div>
              {isEditing && (
                <div className="px-4 py-2 rounded-lg bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40 border border-amber-200/60 dark:border-amber-800/60 shadow-sm">
                  <span className="text-xs font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-amber-500 dark:bg-amber-400 animate-pulse" />
                    
                  </span>
                </div>
              )}
            </div>
          </DialogHeader>
        </div>

        <div className="p-8 space-y-6 bg-gradient-to-b from-white to-slate-50/50 dark:from-slate-950 dark:to-slate-900/50 max-h-[70vh] overflow-y-auto">
          {/* Student Profile Section - Enhanced */}
          <div className="flex flex-col items-center space-y-5 pb-6 border-b border-slate-200/60 dark:border-slate-800/60">
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
              {isEditing && (
                <div className="absolute -bottom-2 -right-2 flex gap-1">
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
              )}
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-50 tracking-tight">{user.fullName}</h3>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <Hash className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                <p className="text-sm font-mono font-semibold text-slate-700 dark:text-slate-300">{user.indexNumber}</p>
              </div>
              {isEditing && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 px-4 py-2 rounded-md bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50">
                  💡 Click the upload icon above to change your profile picture
                </p>
              )}
            </div>
          </div>

          {/* Carousel Slider */}
          <Carousel setApi={setApi} className="w-full" opts={{ loop: false }}>
            <CarouselContent>
              {/* Slide 1: Personal Information */}
              <CarouselItem>
                <div className="space-y-5">
                  <div className="flex items-center gap-3 pb-3 border-b border-slate-200/60 dark:border-slate-800/60">
                    <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/30">
                      <UserCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Personal Information</h3>
                  </div>
                  <div className="space-y-5">
                    <div className="space-y-2.5">
                      <Label htmlFor="fullName" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Full Name
                      </Label>
                      {isEditing ? (
                        <Input
                          id="fullName"
                          value={formData.fullName}
                          onChange={(e) =>
                            setFormData({ ...formData, fullName: e.target.value })
                          }
                          disabled={isSaving}
                          className="h-11 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        />
                      ) : (
                        <div className="flex items-center justify-between p-4 rounded-lg border border-slate-200/80 dark:border-slate-800/80 bg-gradient-to-r from-slate-50 to-white dark:from-slate-900/50 dark:to-slate-800/30 hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
                          <span className="text-sm font-medium text-slate-900 dark:text-slate-50">{user.fullName}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleEdit}
                            className="h-8 w-8 p-0 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-50 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2.5">
                      <Label htmlFor="profilePicture" className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                        <ImageIcon className="h-4 w-4" />
                        Profile Picture
                      </Label>
                      {isEditing ? (
                        <div className="space-y-3">
                          <div className="flex items-center gap-3 flex-wrap">
                            <input
                              type="file"
                              accept="image/jpeg,image/jpg,image/png,image/webp"
                              className="hidden"
                              ref={fileInputRef}
                              onChange={handleFileSelect}
                              disabled={isUploading || isSaving}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => fileInputRef.current?.click()}
                              disabled={isUploading || isSaving}
                              className="flex items-center gap-2 h-10 px-4 border-2 hover:border-primary/50 hover:bg-primary/5 transition-all"
                            >
                              <Upload className="h-4 w-4" />
                              {isUploading ? "Uploading..." : "Upload Image"}
                            </Button>
                            <span className="text-xs text-slate-500 dark:text-slate-400 px-3 py-1.5 rounded-md bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                              Max 5MB (JPEG, PNG, WebP)
                            </span>
                          </div>
                          <Input
                            id="profilePicture"
                            type="url"
                            value={formData.profilePicture}
                            onChange={(e) =>
                              setFormData({ ...formData, profilePicture: e.target.value })
                            }
                            disabled={isSaving}
                            placeholder="Or enter image URL"
                            className="h-11 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                          />
                        </div>
                      ) : (
                        <div className="flex items-center justify-between p-4 rounded-lg border border-slate-200/80 dark:border-slate-800/80 bg-gradient-to-r from-slate-50 to-white dark:from-slate-900/50 dark:to-slate-800/30 hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
                          <span className={`text-sm flex items-center gap-2 ${!user.profilePicture ? "text-slate-400 dark:text-slate-600 italic" : "text-slate-900 dark:text-slate-50"}`}>
                            {user.profilePicture ? (
                              <>
                                <ImageIcon className="h-4 w-4" />
                                <span className="truncate max-w-[200px]">{user.profilePicture}</span>
                              </>
                            ) : (
                              "No profile picture"
                            )}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleEdit}
                            className="h-8 w-8 p-0 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-50 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CarouselItem>

              {/* Slide 2: Academic Information */}
              <CarouselItem>
                <div className="space-y-5">
                  <div className="flex items-center gap-3 pb-3 border-b border-slate-200/60 dark:border-slate-800/60">
                    <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/30">
                      <GraduationCap className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Academic Information</h3>
                  </div>
                  <div className="space-y-5">
                    <div className="space-y-2.5">
                      <Label htmlFor="indexNumber" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Index Number
                      </Label>
                      <Input
                        id="indexNumber"
                        value={user.indexNumber}
                        disabled
                        className="h-11 bg-slate-100/80 dark:bg-slate-900/80 font-mono text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 cursor-not-allowed"
                      />
                      <p className="text-xs text-slate-500 dark:text-slate-500 flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50">
                        <AlertCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                        This field cannot be modified
                      </p>
                    </div>
                    <div className="space-y-2.5">
                      <Label htmlFor="year" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Academic Year / Class
                      </Label>
                      {isEditing ? (
                        <Input
                          id="year"
                          value={formData.year}
                          onChange={(e) =>
                            setFormData({ ...formData, year: e.target.value })
                          }
                          disabled={isSaving}
                          placeholder="e.g., Year 1, Year 2, Level 300"
                          className="h-11 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        />
                      ) : (
                        <div className="flex items-center justify-between p-4 rounded-lg border border-slate-200/80 dark:border-slate-800/80 bg-gradient-to-r from-slate-50 to-white dark:from-slate-900/50 dark:to-slate-800/30 hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
                          <span className={`text-sm ${!user.year ? "text-slate-400 dark:text-slate-600 italic" : "text-slate-900 dark:text-slate-50 font-medium"}`}>
                            {user.year || "Not specified"}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleEdit}
                            className="h-8 w-8 p-0 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-50 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CarouselItem>

              {/* Slide 3: Contact Information */}
              <CarouselItem>
                <div className="space-y-5">
                  <div className="flex items-center gap-3 pb-3 border-b border-slate-200/60 dark:border-slate-800/60">
                    <div className="p-2 rounded-lg bg-green-50 dark:bg-green-950/30">
                      <Mail className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Contact Information</h3>
                  </div>
                  <div className="space-y-5">
                    <div className="space-y-2.5">
                      <Label htmlFor="email" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Email Address
                      </Label>
                      {isEditing ? (
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) =>
                            setFormData({ ...formData, email: e.target.value })
                          }
                          disabled={isSaving}
                          placeholder="student@example.com"
                          className="h-11 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        />
                      ) : (
                        <div className="flex items-center justify-between p-4 rounded-lg border border-slate-200/80 dark:border-slate-800/80 bg-gradient-to-r from-slate-50 to-white dark:from-slate-900/50 dark:to-slate-800/30 hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
                          <span className={`text-sm ${!user.email ? "text-slate-400 dark:text-slate-600 italic" : "text-slate-900 dark:text-slate-50 font-medium"}`}>
                            {user.email || "Not provided"}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleEdit}
                            className="h-8 w-8 p-0 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-50 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CarouselItem>
            </CarouselContent>
            <CarouselPrevious className="left-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800" />
            <CarouselNext className="right-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800" />
          </Carousel>

          {/* Pagination Dots - Enhanced */}
          <div className="flex justify-center items-center gap-2.5 pt-5">
            {[0, 1, 2].map((index) => (
              <button
                key={index}
                onClick={() => api?.scrollTo(index)}
                className={`rounded-full transition-all duration-300 ${
                  current === index
                    ? "w-10 h-2.5 bg-gradient-to-r from-primary to-primary/80 dark:from-primary dark:to-primary/80 shadow-md"
                    : "w-2.5 h-2.5 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 dark:hover:bg-slate-600 hover:scale-125"
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>

          {/* Edit Mode Actions - Enhanced */}
          {isEditing && (
            <div className="flex gap-3 justify-end pt-5 border-t border-slate-200/60 dark:border-slate-800/60">
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isSaving}
                className="min-w-[130px] h-11 border-2 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 hover:border-slate-400 dark:hover:border-slate-600 transition-all font-medium"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={isSaving}
                className="min-w-[130px] h-11 bg-gradient-to-r from-slate-900 to-slate-800 dark:from-slate-50 dark:to-slate-100 text-white dark:text-slate-900 hover:from-slate-800 hover:to-slate-700 dark:hover:from-slate-100 dark:hover:to-slate-200 shadow-lg hover:shadow-xl transition-all font-semibold"
              >
                {isSaving ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white dark:border-slate-900 border-t-transparent rounded-full animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        <DialogFooter className="px-8 py-6 border-t border-slate-200/60 dark:border-slate-800/60 bg-gradient-to-r from-slate-50/80 to-white dark:from-slate-900/80 dark:to-slate-950/80 backdrop-blur-sm flex-col sm:flex-row gap-3">
          {isEditing ? (
            <>
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isSaving}
                className="w-full sm:w-auto h-11 border-2 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 hover:border-slate-400 dark:hover:border-slate-600 transition-all font-medium"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={isSaving}
                className="w-full sm:w-auto h-11 bg-gradient-to-r from-slate-900 to-slate-800 dark:from-slate-50 dark:to-slate-100 text-white dark:text-slate-900 hover:from-slate-800 hover:to-slate-700 dark:hover:from-slate-100 dark:hover:to-slate-200 shadow-lg hover:shadow-xl transition-all font-semibold"
              >
                {isSaving ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white dark:border-slate-900 border-t-transparent rounded-full animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={handleEdit}
                className="w-full sm:w-auto h-11 border-2 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-400 dark:hover:border-slate-600 transition-all font-medium shadow-sm"
              >
                <Edit2 className="h-4 w-4 mr-2" />
                Edit Information
              </Button>
              <Button
                onClick={onConfirm}
                className="w-full sm:w-auto h-11 bg-gradient-to-r from-primary to-primary/90 dark:from-primary dark:to-primary/90 text-white hover:from-primary/90 hover:to-primary/80 dark:hover:from-primary/90 dark:hover:to-primary/80 shadow-lg hover:shadow-xl transition-all font-semibold"
              >
                <Check className="h-4 w-4 mr-2" />
                Confirm & Proceed
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

