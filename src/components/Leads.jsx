import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";

function Leads({ onEditLead }) {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchLeads = async () => {
    setLoading(true);
    setError("");

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

    setLeads(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const formatDate = (date) => {
    if (!date) return "-";

    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="leads-page">
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

      {loading && (
        <div className="leads-message">
          Loading your interested leads...
        </div>
      )}

      {!loading && error && (
        <div className="leads-error">
          {error}
        </div>
      )}

      {!loading && !error && leads.length === 0 && (
        <div className="leads-empty">
          <h3>No interested leads yet</h3>

          <p>
            Customers marked as "Interested" will appear here.
          </p>
        </div>
      )}

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
                  <td className="customer-name">
                    {lead.customer_name || "-"}
                  </td>

                  <td>
                    {lead.contact_no || "-"}
                  </td>

                  <td>
                    {lead.email || "-"}
                  </td>

                  <td>
                    {lead.location || "-"}
                  </td>

                  <td>
                    <span className="lead-status">
                      {lead.status}
                    </span>
                  </td>

                  <td className="remarks-cell">
                    <div className="remarks-display">
                      <span>
                        {lead.remarks || "No remarks"}
                      </span>

                      <button
                        className="edit-remarks-btn"
                        onClick={() => onEditLead(lead.id)}
                        title="Edit lead"
                      >
                        ✏️
                      </button>
                    </div>
                  </td>

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