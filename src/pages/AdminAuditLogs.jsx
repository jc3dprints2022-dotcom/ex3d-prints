import React, { useState, useEffect } from 'react';
import { AuditLog } from '@/entities/AuditLog';
import { User } from '@/entities/User';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const currentUser = await User.me();
      setUser(currentUser);
      
      // Check if admin
      if (currentUser.role !== 'admin') {
        window.location.href = '/';
        return;
      }
      
      const allLogs = await AuditLog.list('-created_date', 100);
      setLogs(allLogs);
      setFilteredLogs(allLogs);
    } catch (error) {
      console.error('Error loading audit logs:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (searchQuery) {
      const filtered = logs.filter(log => 
        log.token_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.watermark_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.user_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.ip_address?.includes(searchQuery)
      );
      setFilteredLogs(filtered);
    } else {
      setFilteredLogs(logs);
    }
  }, [searchQuery, logs]);

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case 'warning': return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      default: return <Info className="w-5 h-5 text-blue-600" />;
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Security Audit Logs</h1>
          <p className="text-slate-600 mt-2">Track all file downloads, token issuance, and security events</p>
        </div>

        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  placeholder="Search by token ID, watermark ID, user ID, or IP address..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button onClick={loadData} variant="outline">
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {filteredLogs.map(log => (
            <Card key={log.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    {getSeverityIcon(log.severity)}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Badge className={getSeverityColor(log.severity)}>
                          {log.event_type.replace('_', ' ').toUpperCase()}
                        </Badge>
                        <span className="text-sm text-slate-500">
                          {new Date(log.created_date).toLocaleString()}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-sm mt-3">
                        {log.user_id && <div><strong>User ID:</strong> {log.user_id}</div>}
                        {log.file_id && <div><strong>File ID:</strong> {log.file_id}</div>}
                        {log.token_id && <div><strong>Token ID:</strong> {log.token_id}</div>}
                        {log.ip_address && <div><strong>IP Address:</strong> {log.ip_address}</div>}
                        {log.details?.watermark_id && <div><strong>Watermark ID:</strong> {log.details.watermark_id}</div>}
                        {log.details?.maker_id && <div><strong>Maker ID:</strong> {log.details.maker_id}</div>}
                        {log.details?.file_size && <div><strong>File Size:</strong> {(log.details.file_size / 1024).toFixed(2)} KB</div>}
                        {log.details?.file_count && <div><strong>Files:</strong> {log.details.file_count}</div>}
                      </div>
                      
                      {log.details && Object.keys(log.details).length > 0 && (
                        <details className="mt-3">
                          <summary className="cursor-pointer text-sm text-blue-600 hover:text-blue-700">
                            View full details
                          </summary>
                          <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-x-auto">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {filteredLogs.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <Info className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">No logs found</h3>
                <p className="text-slate-600">
                  {searchQuery ? 'Try a different search query' : 'Audit logs will appear here'}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}