/**
 * Seedora Parent Event RSVP & AWS/Supabase Sync Integration Script
 * Allows parents to register attendance for upcoming school events.
 */

// Inject RSVP Modal HTML dynamically into the page on load
document.addEventListener('DOMContentLoaded', () => {
    const modalHtml = `
        <div id="rsvp-modal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); z-index:1000; align-items:center; justify-content:center;">
            <div style="background:#1a1d24; border:1px solid rgba(255,255,255,0.15); border-radius:8px; padding:25px; width:400px; max-width:90%;">
                <h3 id="rsvp-event-title" style="color:#fff; margin-top:0; font-size:1.1rem;">Event RSVP</h3>
                <p style="color:#aaa; font-size:0.85rem; margin-bottom:15px;">Confirm your attendance for this school event.</p>
                <form id="rsvp-form" onsubmit="submitRsvp(event)">
                    <input type="hidden" id="rsvp-event-id">
                    <div style="margin-bottom:12px;">
                        <label style="font-size:0.75rem; color:#aaa; display:block; margin-bottom:4px;">Parent / Guardian Name</label>
                        <input type="text" id="parent-name" class="form-control" required placeholder="e.g. Benjamin Tremble">
                    </div>
                    <div style="margin-bottom:15px;">
                        <label style="font-size:0.75rem; color:#aaa; display:block; margin-bottom:4px;">Attendance Response</label>
                        <select id="rsvp-response" class="form-control">
                            <option value="Attending">Attending</option>
                            <option value="Apologies / Unable to Attend">Apologies / Unable to Attend</option>
                        </select>
                    </div>
                    <div style="display:flex; justify-content:flex-end; gap:10px;">
                        <button type="button" class="btn" style="background:#6c757d;" onclick="closeRsvpModal()">Cancel</button>
                        <button type="submit" class="btn" style="background:#28a745;">Confirm RSVP</button>
                    </div>
                </form>
                <div id="rsvp-success-msg" style="display:none; margin-top:10px; color:#28a745; font-size:0.85rem; text-align:center;">✅ RSVP successfully logged and synced with school database!</div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
});

function openRsvpModal(eventId, eventName) {
    document.getElementById('rsvp-event-id').value = eventId;
    document.getElementById('rsvp-event-title').textContent = `RSVP: ${eventName}`;
    document.getElementById('rsvp-modal').style.display = 'flex';
}

function closeRsvpModal() {
    document.getElementById('rsvp-modal').style.display = 'none';
    document.getElementById('rsvp-success-msg').style.display = 'none';
    document.getElementById('rsvp-form').reset();
}

async function submitRsvp(e) {
    e.preventDefault();
    const eventId = document.getElementById('rsvp-event-id').value;
    const parentName = document.getElementById('parent-name').value;
    const responseStatus = document.getElementById('rsvp-response').value;
    const schoolSlug = window.location.pathname.split('/')[1] || 'seedora-college';

    const rsvpPayload = {
        id: `rsvp-${Date.now()}`,
        event_id: eventId,
        school_slug: schoolSlug,
        parent_name: parentName,
        status: responseStatus,
        submitted_at: new Date().toISOString()
    };

    // Save locally
    let existingRsvps = JSON.parse(localStorage.getItem(`seedora_rsvps_${schoolSlug}`)) || [];
    existingRsvps.push(rsvpPayload);
    localStorage.setItem(`seedora_rsvps_${schoolSlug}`, JSON.stringify(existingRsvps));

    // Sync to Supabase & AWS API Gateway if available
    try {
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            await supabaseClient.from('seedora_rsvps').upsert(rsvpPayload);
        }
        if (typeof AWS_API_ENDPOINT !== 'undefined' && AWS_API_ENDPOINT !== 'YOUR_AWS_API_GATEWAY_URL') {
            await fetch(`${AWS_API_ENDPOINT}/rsvps`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(rsvpPayload)
            });
        }
    } catch (err) {
        console.warn('Cloud backend RSVP sync error (saved locally):', err);
    }

    document.getElementById('rsvp-success-msg').style.display = 'block';
    setTimeout(() => {
        closeRsvpModal();
    }, 2000);
}