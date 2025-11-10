import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, AlertCircle, CheckCircle, Mail } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function SecurityDRMSection() {
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [showEmailDialog, setShowEmailDialog] = useState(false);

  useEffect(() => {
    loadAuditLogs();
  }, []);

  const loadAuditLogs = async () => {
    setLoading(true);
    try {
      const logs = await base44.entities.AuditLog.list();
      setAuditLogs(logs.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
    } catch (error) {
      console.error("Failed to load audit logs:", error);
    }
    setLoading(false);
  };

  const getSeverityBadge = (severity) => {
    const colors = {
      info: 'bg-blue-100 text-blue-800',
      warning: 'bg-yellow-100 text-yellow-800',
      critical: 'bg-red-100 text-red-800'
    };
    return colors[severity] || 'bg-gray-100 text-gray-800';
  };

  const getSeverityIcon = (severity) => {
    if (severity === 'critical') return <AlertCircle className="w-4 h-4 text-red-600" />;
    if (severity === 'warning') return <AlertCircle className="w-4 h-4 text-yellow-600" />;
    return <CheckCircle className="w-4 h-4 text-blue-600" />;
  };

  const handleViewEmail = (log) => {
    setSelectedEmail(log);
    setShowEmailDialog(true);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Security & Activity Logs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 max-h-[600px] overflow-y-auto">
            {loading ? (
              <p>Loading audit logs...</p>
            ) : auditLogs.length === 0 ? (
              <p className="text-gray-500">No audit logs found</p>
            ) : (
              auditLogs.map(log => (
                <div key={log.id} className="flex items-start gap-3 p-4 border rounded-lg hover:bg-gray-50">
                  <div className="mt-1">
                    {getSeverityIcon(log.severity)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold capitalize">
                        {log.event_type.replace(/_/g, ' ')}
                      </span>
                      <Badge className={getSeverityBadge(log.severity)}>
                        {log.severity}
                      </Badge>
                      {log.event_type === 'email_sent' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleViewEmail(log)}
                          className="ml-auto"
                        >
                          <Mail className="w-4 h-4 mr-1" />
                          View Email
                        </Button>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      {new Date(log.created_date).toLocaleString()}
                    </p>
                    {log.user_id && (
                      <p className="text-sm text-gray-600">
                        User ID: {log.user_id}
                      </p>
                    )}
                    {log.details && (
                      <div className="mt-2 p-2 bg-gray-100 rounded text-sm">
                        <pre className="whitespace-pre-wrap font-mono text-xs">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Email View Dialog */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Email Details</DialogTitle>
            <DialogDescription>
              Sent on {selectedEmail && new Date(selectedEmail.created_date).toLocaleString()}
            </DialogDescription>
          </DialogHeader>
          {selectedEmail && selectedEmail.details && (
            <div className="space-y-4">
              <div>
                <p className="font-semibold text-sm text-gray-600">To:</p>
                <p className="text-sm">{selectedEmail.details.to}</p>
              </div>
              
              <div>
                <p className="font-semibold text-sm text-gray-600">Subject:</p>
                <p className="text-sm">{selectedEmail.details.subject}</p>
              </div>
              
              <div>
                <p className="font-semibold text-sm text-gray-600 mb-2">Message:</p>
                <div className="p-4 bg-gray-50 rounded border">
                  <pre className="whitespace-pre-wrap text-sm font-sans">
                    {selectedEmail.details.body || 'No message content available'}
                  </pre>
                </div>
              </div>
              
              {selectedEmail.details.email_id && (
                <div>
                  <p className="font-semibold text-sm text-gray-600">Email ID:</p>
                  <p className="text-xs text-gray-500 font-mono">{selectedEmail.details.email_id}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}