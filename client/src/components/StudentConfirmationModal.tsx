import { useState, useEffect } from "react";
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
} from "@/components/ui/carousel";
import { User, Edit2, Check, X, UserCircle, Mail, GraduationCap, Hash } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface StudentConfirmationModalProps {
  user: {
    id: string;
    indexNumber: string;
    fullName: string;
    email?: string | null;
    year?: string | null;
  };
  open: boolean;
  onConfirm: () => void;
  onUpdate: (updatedUser: { email?: string | null; year?: string | null; fullName?: string }) => void;
}

export default function StudentConfirmationModal({
  user,
  open,
  onConfirm,
  onUpdate,
}: StudentConfirmationModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    fullName: user.fullName,
    email: user.email || "",
    year: user.year || "",
  });
  const { toast } = useToast();

  // Reset form when user changes
  useEffect(() => {
    setFormData({
      fullName: user.fullName,
      email: user.email || "",
      year: user.year || "",
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
    });
    setIsEditing(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await apiRequest("PUT", "/api/auth/profile", {
        fullName: formData.fullName,
        email: formData.email || null,
        year: formData.year || null,
      });

      if (!response.ok) {
        throw new Error("Failed to update profile");
      }

      const data = await response.json();
      onUpdate({
        email: data.user.email,
        year: data.user.year,
        fullName: data.user.fullName,
      });

      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      });

      setIsEditing(false);
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
      <DialogContent className="sm:max-w-[600px] p-0 gap-0 overflow-hidden border-0 shadow-2xl">
        {/* Gradient Header */}
        <div className="relative bg-gradient-to-br from-primary via-primary/90 to-primary/80 p-6 text-primary-foreground">
          <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,white,transparent)]" />
          <DialogHeader className="relative z-10">
            <DialogTitle className="text-2xl font-bold tracking-tight">
              Confirm Your Details
            </DialogTitle>
            <DialogDescription className="text-primary-foreground/90">
              Please verify your information before proceeding to the voting platform
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-6 space-y-6 bg-background">
          {/* Carousel Slider */}
          <Carousel className="w-full" opts={{ loop: true }}>
            <CarouselContent>
              {/* Slide 1: Student Portrait */}
              <CarouselItem>
                <div className="flex flex-col items-center space-y-6 p-8 rounded-xl bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 border border-primary/20">
                  <div className="relative">
                    <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse" />
                    <Avatar className="h-32 w-32 relative z-10 ring-4 ring-primary/20 ring-offset-4 ring-offset-background">
                      <AvatarImage src={undefined} alt={user.fullName} />
                      <AvatarFallback className="text-4xl font-bold bg-gradient-to-br from-primary to-primary/70 text-primary-foreground">
                        {getInitials(user.fullName)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="text-center space-y-2">
                    <h3 className="text-lg font-semibold text-foreground">Student Portrait</h3>
                    <p className="text-sm text-muted-foreground">Your profile picture</p>
                  </div>
                </div>
              </CarouselItem>

              {/* Slide 2: Personal Information */}
              <CarouselItem>
                <div className="p-6 rounded-xl bg-gradient-to-br from-blue-50/50 dark:from-blue-950/20 to-background border border-blue-200/50 dark:border-blue-800/50">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-blue-500/10">
                      <UserCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className="text-lg font-semibold">Personal Information</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="fullName" className="text-sm font-medium flex items-center gap-2">
                        <User className="h-4 w-4" />
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
                          className="bg-background"
                        />
                      ) : (
                        <div className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                          <span className="font-medium">{user.fullName}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleEdit}
                            className="h-8 w-8 p-0"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CarouselItem>

              {/* Slide 3: Academic Information */}
              <CarouselItem>
                <div className="p-6 rounded-xl bg-gradient-to-br from-purple-50/50 dark:from-purple-950/20 to-background border border-purple-200/50 dark:border-purple-800/50">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-purple-500/10">
                      <GraduationCap className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <h3 className="text-lg font-semibold">Academic Information</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="indexNumber" className="text-sm font-medium flex items-center gap-2">
                        <Hash className="h-4 w-4" />
                        Index Number
                      </Label>
                      <Input
                        id="indexNumber"
                        value={user.indexNumber}
                        disabled
                        className="bg-muted font-mono"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="year" className="text-sm font-medium flex items-center gap-2">
                        <GraduationCap className="h-4 w-4" />
                        Year/Class
                      </Label>
                      {isEditing ? (
                        <Input
                          id="year"
                          value={formData.year}
                          onChange={(e) =>
                            setFormData({ ...formData, year: e.target.value })
                          }
                          disabled={isSaving}
                          placeholder="e.g., Year 1, Year 2"
                          className="bg-background"
                        />
                      ) : (
                        <div className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                          <span className={!user.year ? "text-muted-foreground italic" : ""}>
                            {user.year || "Not provided"}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleEdit}
                            className="h-8 w-8 p-0"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CarouselItem>

              {/* Slide 4: Contact Information */}
              <CarouselItem>
                <div className="p-6 rounded-xl bg-gradient-to-br from-green-50/50 dark:from-green-950/20 to-background border border-green-200/50 dark:border-green-800/50">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-green-500/10">
                      <Mail className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <h3 className="text-lg font-semibold">Contact Information</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm font-medium flex items-center gap-2">
                        <Mail className="h-4 w-4" />
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
                          placeholder="Enter your email"
                          className="bg-background"
                        />
                      ) : (
                        <div className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                          <span className={!user.email ? "text-muted-foreground italic" : ""}>
                            {user.email || "Not provided"}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleEdit}
                            className="h-8 w-8 p-0"
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
            <CarouselPrevious className="left-2" />
            <CarouselNext className="right-2" />
          </Carousel>

          {/* Edit Mode Actions */}
          {isEditing && (
            <div className="flex gap-3 justify-end pt-4 border-t">
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isSaving}
                className="min-w-[100px]"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={isSaving}
                className="min-w-[100px] bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary"
              >
                <Check className="h-4 w-4 mr-2" />
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          )}
        </div>

        <DialogFooter className="p-6 pt-0 border-t bg-background flex-col sm:flex-row gap-3">
          {!isEditing && (
            <>
              <Button
                variant="outline"
                onClick={handleEdit}
                className="w-full sm:w-auto border-2 hover:bg-accent"
              >
                <Edit2 className="h-4 w-4 mr-2" />
                Edit Details
              </Button>
              <Button
                onClick={onConfirm}
                className="w-full sm:w-auto bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all"
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

