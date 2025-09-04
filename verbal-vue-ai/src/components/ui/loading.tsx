import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const LoadingSpinner = ({ size = "md", className }: LoadingSpinnerProps) => {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6", 
    lg: "w-8 h-8"
  };

  return (
    <div
      className={cn(
        "animate-spin rounded-full border-2 border-muted border-t-primary",
        sizeClasses[size],
        className
      )}
    />
  );
};

interface LoadingCardProps {
  className?: string;
}

export const LoadingCard = ({ className }: LoadingCardProps) => {
  return (
    <div className={cn("animate-pulse", className)}>
      <div className="bg-card border border-card-border rounded-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="w-12 h-12 bg-muted rounded-lg"></div>
          <div className="flex gap-2">
            <div className="w-16 h-6 bg-muted rounded-full"></div>
            <div className="w-16 h-6 bg-muted rounded-full"></div>
          </div>
        </div>
        <div className="space-y-2">
          <div className="w-3/4 h-6 bg-muted rounded"></div>
          <div className="w-full h-4 bg-muted rounded"></div>
          <div className="w-5/6 h-4 bg-muted rounded"></div>
        </div>
        <div className="space-y-2">
          <div className="w-24 h-4 bg-muted rounded"></div>
          <div className="space-y-1">
            <div className="w-full h-3 bg-muted rounded"></div>
            <div className="w-full h-3 bg-muted rounded"></div>
            <div className="w-3/4 h-3 bg-muted rounded"></div>
          </div>
        </div>
        <div className="w-full h-10 bg-muted rounded-md"></div>
      </div>
    </div>
  );
};

interface LoadingOverlayProps {
  message?: string;
  className?: string;
}

export const LoadingOverlay = ({ message = "Loading...", className }: LoadingOverlayProps) => {
  return (
    <div className={cn(
      "fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center",
      className
    )}>
      <div className="bg-card border border-card-border rounded-lg p-6 flex flex-col items-center gap-4 shadow-lg">
        <LoadingSpinner size="lg" />
        <p className="text-muted-foreground">{message}</p>
      </div>
    </div>
  );
};

export const LoadingButton = ({ children, loading, ...props }: any) => {
  return (
    <button {...props} disabled={loading || props.disabled}>
      <div className="flex items-center gap-2">
        {loading && <LoadingSpinner size="sm" />}
        {children}
      </div>
    </button>
  );
};