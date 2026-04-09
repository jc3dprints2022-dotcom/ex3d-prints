import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Thin wrapper — delegates to checkAndReassignStaleOrders for backwards compatibility
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const result = await base44.asServiceRole.functions.invoke('checkAndReassignStaleOrders', {});
    return Response.json(result.data || { success: true });
  } catch (error) {
    console.error('reassignStaleOrders error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});