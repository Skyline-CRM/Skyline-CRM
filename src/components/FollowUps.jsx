import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";

function FollowUps({ onEditFollowUp }) {
  const [followUps, setFollowUps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchFollowUps = async () => {
    try {
      setLoading(true);
      setError("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("User not found.");
        return;
      }

      const { data, error } = await supabase
        .from("calls")
        .select(
          "id, customer_name, contact_no, email, location, status, remarks, created_at"
        )
        .eq("agent_id", user.id)
        .eq("status", "Follow up")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching follow ups:", error);
        setError("Unable to load follow ups.");
        return;
      }

      setFollowUps(data || []);
    } catch (err) {
      console.error("Error fetching follow ups:", err);
      setError("Unable to load follow ups.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFollowUps();
  }, []);

  return (
    <div className="leads-page">
      <div className="leads-header">
        <h1>Follow Up Leads</h1>

        <span className="leads-count">
          {followUps.length} Follow Up
          {followUps.length !== 1 ? "s" : ""}
        </span>
      </div>

      {loading && (
        <div className="leads-message">
          Loading follow ups...
        </div>
      )}

      {error && (
        <div className="leads-error">
          {error}
        </div>
      )}

      {!loading && !error && followUps.length === 0 && (
        <div className="leads-empty">
          No follow up leads found.
        </div>
      )}

      {!loading && !error && followUps.length > 0 && (
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
              {followUps.map((followUp) => (
                <tr key={followUp.id}>
                  <td className="customer-name">
                    {followUp.customer_name || "-"}
                  </td>

                  <td>{followUp.contact_no || "-"}</td>

                  <td>{followUp.email || "-"}</td>

                  <td>{followUp.location || "-"}</td>

                  <td>
                    <span className="lead-status">
                      {followUp.status}
                    </span>
                  </td>

                  <td className="remarks-cell">
                    <div className="remarks-display">
                      <span>
                        {followUp.remarks || "-"}
                      </span>

                      <button
                        className="edit-remarks-btn"
                        onClick={() =>
                          onEditFollowUp(followUp.id)
                        }
                        title="Edit follow up"
                      >
                        ✏️
                      </button>
                    </div>
                  </td>

                  <td>
                    {followUp.created_at
                      ? new Date(
                          followUp.created_at
                        ).toLocaleDateString()
                      : "-"}
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

export default FollowUps;