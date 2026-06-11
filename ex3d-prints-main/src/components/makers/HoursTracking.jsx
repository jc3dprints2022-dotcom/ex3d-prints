import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Clock, Plus, Minus, TrendingUp, AlertCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function HoursTracking({ user, onUpdate }) {
  const [hoursPrinted, setHoursPrinted] = useState(user?.hours_printed_this_week || 0);
  const [maxHours, setMaxHours] = useState(user?.max_hours_per_week || 40);
  const [addingHours, setAddingHours] = useState(false);
  const [hoursToAdd, setHoursToAdd] = useState('');
  const { toast } = useToast();

  const hoursRemaining = Math.max(0, maxHours - hoursPrinted);
  const percentageUsed = (hoursPrinted / maxHours) * 100;

  const handleAddHours = async () => {
    const hours = parseFloat(hoursToAdd);
    if (isNaN(hours) || hours <= 0) {
      toast({ title: "Please enter valid hours", variant: "destructive" });
      return;
    }

    try {
      const newTotal = hoursPrinted + hours;
      await base44.auth.updateMe({ hours_printed_this_week: newTotal });
      setHoursPrinted(newTotal);
      setHoursToAdd('');
      setAddingHours(false);
      toast({ title: "Hours updated!" });
      if (onUpdate) onUpdate();
    } catch (error) {
      toast({ title: "Failed to update hours", variant: "destructive" });
    }
  };

  const handleAdjustMaxHours = async (adjustment) => {
    const newMax = Math.max(1, maxHours + adjustment);
    try {
      await base44.auth.updateMe({ max_hours_per_week: newMax });
      setMaxHours(newMax);
      toast({ title: "Maximum hours updated!" });
      if (onUpdate) onUpdate();
    } catch (error) {
      toast({ title: "Failed to update maximum hours", variant: "destructive" });
    }
  };

  const handleResetWeek = async () => {
    try {
      await base44.auth.updateMe({ 
        hours_printed_this_week: 0,
        last_hours_reset: new Date().toISOString()
      });
      setHoursPrinted(0);
      toast({ title: "Weekly hours reset!" });
      if (onUpdate) onUpdate();
    } catch (error) {
      toast({ title: "Failed to reset hours", variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-900">
          <Clock className="w-5 h-5 text-blue-500" />
          Printing Hours This Week
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Hours Overview */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg">
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-600">{hoursPrinted.toFixed(1)}</p>
              <p className="text-sm text-gray-700">Hours Printed</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-purple-600">{hoursRemaining.toFixed(1)}</p>
              <p className="text-sm text-gray-700">Hours Remaining</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-gray-900">{maxHours}</p>
              <p className="text-sm text-gray-700">Max Hours/Week</p>
            </div>
          </div>
          
          <Progress value={percentageUsed} className="h-3" />
          <p className="text-sm text-gray-600 text-center mt-2">
            {percentageUsed.toFixed(0)}% of weekly capacity used
          </p>
        </div>

        {/* Warnings */}
        {percentageUsed >= 90 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-gray-900">
              You're at {percentageUsed.toFixed(0)}% of your weekly capacity. Consider increasing your max hours or completing current orders before accepting more.
            </AlertDescription>
          </Alert>
        )}

        {/* Add Hours Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-gray-900 font-semibold">Log Printing Hours</Label>
            <Button 
              variant={addingHours ? "secondary" : "outline"} 
              size="sm"
              onClick={() => setAddingHours(!addingHours)}
            >
              {addingHours ? 'Cancel' : 'Add Hours'}
            </Button>
          </div>

          {addingHours && (
            <div className="flex gap-2">
              <Input
                type="number"
                step="0.5"
                min="0"
                placeholder="Hours spent printing"
                value={hoursToAdd}
                onChange={(e) => setHoursToAdd(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddHours()}
              />
              <Button onClick={handleAddHours}>
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            </div>
          )}
        </div>

        {/* Adjust Max Hours */}
        <div className="space-y-3">
          <Label className="text-gray-900 font-semibold">Adjust Weekly Maximum</Label>
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => handleAdjustMaxHours(-5)}
              disabled={maxHours <= 5}
            >
              <Minus className="w-4 h-4" />
            </Button>
            <div className="flex-1 text-center">
              <p className="text-2xl font-bold text-gray-900">{maxHours} hours/week</p>
            </div>
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => handleAdjustMaxHours(5)}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-sm text-gray-600 text-center">
            Adjust in 5-hour increments. Your availability affects order assignment.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={handleResetWeek}
            className="flex-1"
          >
            Reset Week
          </Button>
          <Button 
            variant="outline"
            onClick={() => handleAdjustMaxHours(10)}
            className="flex-1"
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            Increase by 10
          </Button>
        </div>

        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <p className="text-sm text-gray-900">
            <strong>Tip:</strong> Your available hours are used by our matching algorithm. Keep this updated for accurate order assignments.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}