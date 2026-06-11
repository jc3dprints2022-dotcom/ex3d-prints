import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { X, AlertCircle, Info, AlertTriangle } from "lucide-react";

export default function AnnouncementBanner({ userRole, userId }) {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnnouncements();
  }, [userRole, userId]);

  const loadAnnouncements = async () => {
    setLoading(true);
    try {
      const allAnnouncements = await base44.entities.Announcement.filter({ 
        status: 'published' 
      });

      const now = new Date();
      const relevantAnnouncements = allAnnouncements.filter(ann => {
        // Check if expired
        if (ann.expiry_date && new Date(ann.expiry_date) < now) {
          return false;
        }

        // Check if user has already read it
        if (userId && ann.read_by && ann.read_by.includes(userId)) {
          return false;
        }

        // Check audience
        if (ann.target_audience === 'all') return true;
        if (ann.target_audience === 'consumers' && userRole === 'consumer') return true;
        if (ann.target_audience === 'makers' && userRole === 'maker') return true;
        if (ann.target_audience === 'specific_user' && ann.specific_user_id === userId) return true;

        return false;
      });

      setAnnouncements(relevantAnnouncements);
    } catch (error) {
      console.error('Failed to load announcements:', error);
    }
    setLoading(false);
  };

  const handleDismiss = async (announcementId) => {
    if (!userId) return;

    try {
      const announcement = announcements.find(a => a.id === announcementId);
      const updatedReadBy = announcement.read_by || [];
      
      if (!updatedReadBy.includes(userId)) {
        updatedReadBy.push(userId);
        await base44.entities.Announcement.update(announcementId, {
          read_by: updatedReadBy
        });
      }

      setAnnouncements(prev => prev.filter(a => a.id !== announcementId));
    } catch (error) {
      console.error('Failed to dismiss announcement:', error);
    }
  };

  const getIcon = (priority) => {
    switch (priority) {
      case 'urgent':
        return <AlertCircle className="h-5 w-5" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5" />;
      default:
        return <Info className="h-5 w-5" />;
    }
  };

  const getAlertClass = (priority) => {
    switch (priority) {
      case 'urgent':
        return 'border-red-500 bg-red-50 text-red-900';
      case 'warning':
        return 'border-yellow-500 bg-yellow-50 text-yellow-900';
      default:
        return 'border-blue-500 bg-blue-50 text-blue-900';
    }
  };

  if (loading || announcements.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4 mb-6">
      {announcements.map(announcement => (
        <Alert key={announcement.id} className={getAlertClass(announcement.priority)}>
          {getIcon(announcement.priority)}
          <AlertDescription className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <strong className="block mb-1">{announcement.title}</strong>
              <p>{announcement.message}</p>
            </div>
            {userId && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDismiss(announcement.id)}
                className="flex-shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );
}