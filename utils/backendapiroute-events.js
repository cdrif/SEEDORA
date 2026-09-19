// Example Node.js / Express or Vercel Serverless API Route structure

// GET /api/events - Returns events based on user role or filters
app.get('/api/events', async (req, res) => {
    try {
        const { status } = req.query;
        let query = supabase.from('seedora_events').select('*').order('date', { ascending: true });
        
        if (status && status !== 'all') {
            query = query.eq('status', status);
        }

        const { data, error } = await query;
        if (error) throw error;

        res.status(200).json({ success: true, events: data });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// POST /api/events - Admin only: Create event and log audit trail
app.post('/api/events', async (req, res) => {
    try {
        const { name, details, date, status, creator } = req.body;

        // Insert event
        const { data: eventData, error: eventError } = await supabase
            .from('seedora_events')
            .insert([{ name, details, date, status, creator }])
            .select()
            .single();

        if (eventError) throw eventError;

        // Insert immutable audit log entry
        await supabase.from('seedora_audit_log').insert([{
            action: 'CREATED',
            event_name: name,
            creator: creator,
            timestamp: new Date().toISOString()
        }]);

        res.status(201).json({ success: true, event: eventData });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// DELETE /api/events/:id - Admin only: Delete event and log audit trail
app.delete('/api/events/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { actor } = req.body; // Admin performing the action

        // Fetch event name first for the audit log
        const { data: targetEvent } = await supabase
            .from('seedora_events')
            .select('name')
            .eq('id', id)
            .single();

        const { error: deleteError } = await supabase
            .from('seedora_events')
            .delete()
            .eq('id', id);

        if (deleteError) throw deleteError;

        if (targetEvent) {
            await supabase.from('seedora_audit_log').insert([{
                action: 'DELETED',
                event_name: targetEvent.name,
                creator: actor || 'System Admin',
                timestamp: new Date().toISOString()
            }]);
        }

        res.status(200).json({ success: true, message: "Event deleted and logged." });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});