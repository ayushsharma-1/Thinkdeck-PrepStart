import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Star, ArrowRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface AssessmentCardProps {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  duration: string;
  difficulty: string;
  color: string;
  features: string[];
  onClick: () => void;
}

export const AssessmentCard = ({
  title,
  description,
  icon: Icon,
  duration,
  difficulty,
  color,
  features,
  onClick
}: AssessmentCardProps) => {
  return (
    <Card className="group h-full card-hover border-card-border bg-card relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-primary/10">
      {/* Gradient Background */}
      <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-[0.02] group-hover:opacity-[0.05] transition-opacity duration-300`}></div>
      
      <CardHeader className="relative z-10 pb-4">
        <div className="flex items-start justify-between mb-6">
          <div className={`p-4 rounded-xl bg-gradient-to-br ${color} shadow-lg group-hover:shadow-xl transition-shadow duration-300`}>
            <Icon className="w-7 h-7 text-white" />
          </div>
          <div className="flex flex-col gap-2">
            <Badge variant="outline" className="text-xs font-medium border-muted-foreground/30 bg-background/50">
              <Clock className="w-3 h-3 mr-1.5" />
              {duration}
            </Badge>
            <Badge variant="outline" className="text-xs font-medium border-muted-foreground/30 bg-background/50">
              <Star className="w-3 h-3 mr-1.5" />
              {difficulty}
            </Badge>
          </div>
        </div>
        
        <CardTitle className="text-2xl font-bold mb-3 group-hover:text-primary transition-colors duration-300 leading-tight">
          {title}
        </CardTitle>
        <CardDescription className="text-muted-foreground leading-relaxed text-sm">
          {description}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="relative z-10 pt-0">
        <div className="space-y-4 mb-8">
          <h4 className="font-semibold text-sm text-foreground tracking-wide">Key Features:</h4>
          <ul className="space-y-3">
            {features.map((feature, index) => (
              <li key={index} className="flex items-start text-sm text-muted-foreground leading-relaxed">
                <div className="w-2 h-2 bg-primary rounded-full mt-2 mr-3 flex-shrink-0"></div>
                {feature}
              </li>
            ))}
          </ul>
        </div>
        
        <Button 
          onClick={onClick}
          size="lg"
          className="w-full bg-primary hover:bg-primary-hover text-primary-foreground group font-semibold py-3 rounded-xl transition-all duration-300 hover:shadow-md"
        >
          Start Assessment
          <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform duration-300" />
        </Button>
      </CardContent>
    </Card>
  );
};