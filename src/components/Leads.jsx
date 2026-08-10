import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";

function Leads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Which lead is currently being edited
  const [editingId, setEditingId] = useState(null);

  // Temporary remarks while editing
  const [editedRemarks, setEditedRemarks] = useState("");

  // Saving state
  const [saving, setSaving] = useState(false);

  // Notification
  const [notification, setNotification] = useState("");

  // ==========================================
  // FETCH INTERESTED LEADS
  // ==========================================

  const fetchLeads = async () => {
    setLoading(true);
    setError("");

    // Get currently logged-in user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.error("User error:", userError);
      setError("Unable to identify logged-in user.");
      setLoading(false);
      return;
    }

    if (!user) {
      setError("Please login to view your leads.");
      setLoading(false);
      return;
    }

    console.log("Fetching leads for agent:", user.id);

    // Fetch only this agent's Interested calls
    const { data, error: leadsError } = await supabase
      .from("calls")
      .select(
        "id, customer_name, contact_no, email, location, status, remarks, created_at"
      )
      .eq("agent_id", user.id)
      .eq("status", "Interested")
      .order("created_at", { ascending: false });

    if (leadsError) {
      console.error("Error fetching leads:", leadsError);
      setError("Unable to load leads.");
      setLoading(false);
      return;
    }

    console.log("Interested leads:", data);

    setLeads(data || []);
    setLoading(false);
  };

  // Fetch when component opens
  useEffect(() => {
    fetchLeads();
  }, []);

  // ==========================================
  // START EDITING REMARKS
  // ==========================================

  const startEditing = (lead) => {
    setEditingId(lead.id);
    setEditedRemarks(lead.remarks || "");
  };

  // ==========================================
  // CANCEL EDITING
  // ==========================================

  const cancelEditing = () => {
    setEditingId(null);
    setEditedRemarks("");
  };

  // ==========================================
  // SAVE REMARKS
  // ==========================================

  const saveRemarks = async (leadId) => {
    setSaving(true);

    const { data, error } = await supabase
      .from("calls")
      .update({
        remarks: editedRemarks,
      })
      .eq("id", leadId)
      .select();

    if (error) {
      console.error("Error updating remarks:", error);

      setNotification("Failed to update remarks.");
      setSaving(false);

      setTimeout(() => {
        setNotification("");
      }, 5000);

      return;
    }

    console.log("Remarks updated:", data);

    // Update local table without needing a full page refresh
    setLeads((previousLeads) =>
      previousLeads.map((lead) =>
        lead.id === leadId
          ? {
              ...lead,
              remarks: editedRemarks,
            }
          : lead
      )
    );

    setEditingId(null);
    setEditedRemarks("");
    setSaving(false);

    setNotification("Remarks updated successfully!");

    setTimeout(() => {
      setNotification("");
    }, 5000);
  };

  // ==========================================
  // FORMAT DATE
  // ==========================================

  const formatDate = (date) => {
    if (!date) return "-";

    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // ==========================================
  // UI
  // ==========================================

  return (
    <div className="leads-page">

      {/* Header */}

      <div className="leads-header">
        <div>
          <h1>Interested Leads</h1>

          <p>
            Your customers who are interested in Skyline properties.
          </p>
        </div>

        <div className="leads-count">
          {leads.length} Leads
        </div>
      </div>


      {/* Notification */}

      {notification && (
        <div className="soft-notification">
          {notification}
        </div>
      )}


      {/* Loading */}

      {loading && (
        <div className="leads-message">
          Loading your interested leads...
        </div>
      )}


      {/* Error */}

      {!loading && error && (
        <div className="leads-error">
          {error}
        </div>
      )}


      {/* Empty */}

      {!loading && !error && leads.length === 0 && (
        <div className="leads-empty">
          <h3>No interested leads yet</h3>

          <p>
            Customers marked as "Interested" will appear here.
          </p>
        </div>
      )}


      {/* Table */}

      {!loading && !error && leads.length > 0 && (
        <div className="leads-table-wrapper">

          <table className="leads-table">

            <thead>
              <tr>
                <th>Customer</th>
                <th>Contact</th>
                <th>Email</th>
                <th>Location</th>
                <th>Status</th>
                <th>Remarks</th>
                <th>Date</th>
              </tr>
            </thead>


            <tbody>

              {leads.map((lead) => (

                <tr key={lead.id}>

                  {/* Customer */}

                  <td className="customer-name">
                    {lead.customer_name || "-"}
                  </td>


                  {/* Contact */}

                  <td>
                    {lead.contact_no || "-"}
                  </td>


                  {/* Email */}

                  <td>
                    {lead.email || "-"}
                  </td>


                  {/* Location */}

                  <td>
                    {lead.location || "-"}
                  </td>


                  {/* Status */}

                  <td>
                    <span className="lead-status">
                      {lead.status}
                    </span>
                  </td>


                  {/* Remarks */}

                  <td className="remarks-cell">

                    {editingId === lead.id ? (

                      <div className="remarks-edit">

                        <textarea
                          value={editedRemarks}
                          onChange={(e) =>
                            setEditedRemarks(e.target.value)
                          }
                          autoFocus
                        />

                        <div className="remarks-actions">

                          <button
                            className="remarks-save"
                            onClick={() => saveRemarks(lead.id)}
                            disabled={saving}
                          >
                            {saving ? "Saving..." : "Save"}
                          </button>

                          <button
                            className="remarks-cancel"
                            onClick={cancelEditing}
                            disabled={saving}
                          >
                            Cancel
                          </button>

                        </div>

                      </div>

                    ) : (

                      <div className="remarks-display">

                        <span>
                          {lead.remarks || "No remarks"}
                        </span>

                        <button
                          className="edit-remarks-btn"
                          onClick={() => startEditing(lead)}
                          title="Edit remarks"
                        >
                          ✏️
                        </button>

                      </div>

                    )}

                  </td>


                  {/* Date */}

                  <td>
                    {formatDate(lead.created_at)}
                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>
      )}

    </div>
  );
}

export default Leads;