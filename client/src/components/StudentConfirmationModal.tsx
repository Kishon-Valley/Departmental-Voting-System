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
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await fetch('/api/auth/upload-avatar', {
        method: 'POST',
        body: formData,
        credentials: 'include', // Include cookies for session
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Upload failed' }));
        throw new Error(errorData.message || 'Failed to upload image');
      }

      const data = await response.json();
      
      // Update form data with new URL
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
      <DialogContent className="sm:max-w-[700px] p-0 gap-0 overflow-hidden border shadow-2xl">
        {/* Professional Header */}
        <div className="relative bg-slate-50 dark:bg-slate-900 border-b px-8 py-6">
          <DialogHeader className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <DialogTitle className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                Student Information Verification
              </DialogTitle>
            </div>
            <DialogDescription className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Please review and verify your student information before proceeding. Ensure all details are accurate as they will be used for election verification purposes.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-8 space-y-6 bg-white dark:bg-slate-950">
          {/* Student Profile Section */}
          <div className="flex flex-col items-center space-y-4 pb-6 border-b">
            <div className="relative">
              <Avatar className="h-28 w-28 ring-2 ring-slate-200 dark:ring-slate-800 ring-offset-2">
                <AvatarImage 
                  src={previewImage || formData.profilePicture || user.profilePicture || undefined} 
                  alt={user.fullName} 
                />
                <AvatarFallback className="text-3xl font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {getInitials(user.fullName)}
                </AvatarFallback>
              </Avatar>
              {isEditing && (
                <div className="absolute -bottom-1 -right-1 flex gap-1">
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
                    className="h-8 w-8 rounded-full p-0 border-2 border-white dark:border-slate-950 bg-white dark:bg-slate-900 shadow-md hover:bg-slate-50 dark:hover:bg-slate-800"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    title="Upload image"
                  >
                    {isUploading ? (
                      <div className="h-4 w-4 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              )}
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">{user.fullName}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-mono">{user.indexNumber}</p>
              {isEditing && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  Click the upload icon to change your profile picture
                </p>
              )}
            </div>
          </div>

          {/* Carousel Slider */}
          <Carousel setApi={setApi} className="w-full" opts={{ loop: false }}>
            <CarouselContent>
              {/* Slide 1: Personal Information */}
              <CarouselItem>
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <UserCircle className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                    <h3 className="text-base font-semibold text-slate-900 dark:text-slate-50">Personal Information</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="fullName" className="text-sm font-medium text-slate-700 dark:text-slate-300">
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
                          className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                        />
                      ) : (
                        <div className="flex items-center justify-between p-3.5 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                          <span className="text-sm font-medium text-slate-900 dark:text-slate-50">{user.fullName}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleEdit}
                            className="h-8 w-8 p-0 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-50"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="profilePicture" className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                        <ImageIcon className="h-4 w-4" />
                        Profile Picture
                      </Label>
                      {isEditing ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
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
                              className="flex items-center gap-2"
                            >
                              <Upload className="h-4 w-4" />
                              {isUploading ? "Uploading..." : "Upload Image"}
                            </Button>
                            <span className="text-xs text-slate-500 dark:text-slate-400">
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
                            className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                          />
                        </div>
                      ) : (
                        <div className="flex items-center justify-between p-3.5 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
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
                            className="h-8 w-8 p-0 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-50"
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
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <GraduationCap className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                    <h3 className="text-base font-semibold text-slate-900 dark:text-slate-50">Academic Information</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="indexNumber" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Index Number
                      </Label>
                      <Input
                        id="indexNumber"
                        value={user.indexNumber}
                        disabled
                        className="bg-slate-100 dark:bg-slate-900 font-mono text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800"
                      />
                      <p className="text-xs text-slate-500 dark:text-slate-500 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        This field cannot be modified
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="year" className="text-sm font-medium text-slate-700 dark:text-slate-300">
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
                          className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                        />
                      ) : (
                        <div className="flex items-center justify-between p-3.5 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                          <span className={`text-sm ${!user.year ? "text-slate-400 dark:text-slate-600 italic" : "text-slate-900 dark:text-slate-50"}`}>
                            {user.year || "Not specified"}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleEdit}
                            className="h-8 w-8 p-0 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-50"
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
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <Mail className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                    <h3 className="text-base font-semibold text-slate-900 dark:text-slate-50">Contact Information</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm font-medium text-slate-700 dark:text-slate-300">
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
                          className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                        />
                      ) : (
                        <div className="flex items-center justify-between p-3.5 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                          <span className={`text-sm ${!user.email ? "text-slate-400 dark:text-slate-600 italic" : "text-slate-900 dark:text-slate-50"}`}>
                            {user.email || "Not provided"}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleEdit}
                            className="h-8 w-8 p-0 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-50"
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

          {/* Pagination Dots */}
          <div className="flex justify-center items-center gap-2 pt-4">
            {[0, 1, 2].map((index) => (
              <button
                key={index}
                onClick={() => api?.scrollTo(index)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  current === index
                    ? "w-8 bg-slate-900 dark:bg-slate-50"
                    : "w-2 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 dark:hover:bg-slate-600"
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>

          {/* Edit Mode Actions */}
          {isEditing && (
            <div className="flex gap-3 justify-end pt-4 border-t border-slate-200 dark:border-slate-800">
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isSaving}
                className="min-w-[120px] border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={isSaving}
                className="min-w-[120px] bg-slate-900 dark:bg-slate-50 text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100"
              >
                <Check className="h-4 w-4 mr-2" />
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          )}
        </div>

        <DialogFooter className="px-8 py-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex-col sm:flex-row gap-3">
          {!isEditing && (
            <>
              <Button
                variant="outline"
                onClick={handleEdit}
                className="w-full sm:w-auto border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <Edit2 className="h-4 w-4 mr-2" />
                Edit Information
              </Button>
              <Button
                onClick={onConfirm}
                className="w-full sm:w-auto bg-slate-900 dark:bg-slate-50 text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 shadow-sm hover:shadow-md transition-all"
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

