import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";

function AgentDashboard({ refreshTrigger }) {
  const [user, setUser] = useState(null);
  const [userName, setUserName] = useState("Agent");

  const [stats, setStats] = useState({
    total: 0,
    interested: 0,
    notInterested: 0,
    wrongNumber: 0,
    notPicked: 0,
  });

  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentCallIndex, setCurrentCallIndex] = useState(0);
  const [savingCall, setSavingCall] = useState(false);
  const currentCall = calls[currentCallIndex];
  const goToNextCall = () => {
  setSelectedStatus({});
  setInterestedData({});

  setCurrentCallIndex((prev) => prev + 1);
};

  // Temporary status selection for each call
  const [selectedStatus, setSelectedStatus] = useState({});

  // Temporary interested fields
  const [interestedData, setInterestedData] = useState({});

  // ============================================
  // GET LOGGED-IN USER
  // ============================================

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      console.log("Logged-in agent:", user.id);

      setUser(user);

      const name =
        user.user_metadata?.name ||
        user.user_metadata?.full_name ||
        user.email?.split("@")[0] ||
        "Agent";

      setUserName(name);
    };

    getUser();
  }, []);

  // ============================================
  // FETCH CALLS WHEN USER / REFRESH CHANGES
  // ============================================

  useEffect(() => {
    if (user) {
      fetchAgentCalls();
    }
  }, [user, refreshTrigger]);

  // ============================================
  // FETCH AGENT CALLS
  // ============================================

  const fetchAgentCalls = async () => {
    try {
      setLoading(true);

      console.log(
        "Fetching calls for agent:",
        user.id
      );

      const { data, error } = await supabase
        .from("calls")
        .select(
          `
          id,
          customer_name,
          contact_no,
          email,
          location,
          status,
          remarks,
          budget,
          preferred_location,
          preference,
          agent_id,
          created_at,
          created_at
        `,
        )
        .eq("agent_id", user.id)
        .is("status", null)
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        console.error(
  "Error fetching agent calls:",
  error.message,
  error.details,
  error.hint
);
        return;
      }

      console.log(
        "Calls for this agent:",
        data
      );

      const agentCalls = data || [];

      setCalls(agentCalls);

      // ========================================
      // CALCULATE STATS
      // ========================================

      setStats({
        total: agentCalls.length,

        interested: agentCalls.filter(
          (call) =>
            call.status === "Interested"
        ).length,

        notInterested: agentCalls.filter(
          (call) =>
            call.status === "Not Interested"
        ).length,

        wrongNumber: agentCalls.filter(
          (call) =>
            call.status === "Wrong Number"
        ).length,

        notPicked: agentCalls.filter(
          (call) =>
            call.status === "Not Picked"
        ).length,
      });
    } catch (err) {
      console.error(
        "Unexpected error:",
        err
      );
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // STATUS CHANGE
  // ============================================

const handleStatusChange = (callId, status) => {

  // Only update the selected status in React state
  setSelectedStatus((prev) => ({
    ...prev,
    [callId]: status,
  }));

  // IMPORTANT:
  // Status is NOT saved to Supabase here.
  //
  // The call will be saved only when
  // "Save & Next Call" button is clicked.
};

  // ============================================
  // UPDATE STATUS
  // ============================================

  const updateCallStatus = async (
    callId,
    status
  ) => {
    if (!user) return;

    const { error } = await supabase
      .from("calls")
      .update({
        status: status,
        created_at:
          new Date().toISOString(),
      })
      .eq("id", callId)
      .eq("agent_id", user.id);

    if (error) {
      console.error(
        "Error updating call:",
        error
      );
      return;
    }

    console.log(
      "Call status updated:",
      callId,
      status
    );

    fetchAgentCalls();
  };

  // ============================================
  // INTERESTED FIELD CHANGE
  // ============================================

  const handleInterestedFieldChange = (
    callId,
    field,
    value
  ) => {
    setInterestedData((prev) => ({
      ...prev,

      [callId]: {
        ...prev[callId],
        [field]: value,
      },
    }));
  };

  // ============================================
  // SAVE INTERESTED CALL
  // ============================================

  const saveInterestedCall = async (callId) => {

  const data = interestedData[callId];

  if (!data?.budget) {
    alert("Please enter budget.");
    return;
  }

  if (!data?.preferred_location) {
    alert("Please enter preferred location.");
    return;
  }

  if (!data?.preference) {
    alert("Please enter preference.");
    return;
  }

  setSavingCall(true);

  const { error } = await supabase
    .from("calls")
    .update({
      status: "Interested",
      budget: data.budget,
      preferred_location: data.preferred_location,
      preference: data.preference,
    })
    .eq("id", callId)
    .eq("agent_id", user.id);

  if (error) {
    console.error(
      "Error saving interested call:",
      error
    );

    setSavingCall(false);
    return;
  }

  // Remove completed call
  setCalls((prev) =>
    prev.filter((call) => call.id !== callId)
  );

  setInterestedData({});
  setSelectedStatus({});

  setCurrentCallIndex(0);

  setSavingCall(false);

  // Refresh dashboard stats
  fetchAgentCalls();
};

  // ============================================
  // GREETING
  // ============================================

  const currentHour =
    new Date().getHours();

  let greeting;

  if (currentHour < 12) {
    greeting = "Good Morning";
  } else if (currentHour < 14) {
    greeting = "Good Afternoon";
  } else {
    greeting = "Good Evening";
  }

  // ============================================
  // LOADING
  // ============================================

  if (loading && !user) {
    return null;
  }

  // ============================================
  // UI
  // ============================================


  // ============================================
// SAVE CALL & GO TO NEXT
// ============================================

const saveCall = async (callId) => {
  const call = calls.find(
    (item) => item.id === callId
  );

  if (!call) {
    console.error("Call not found.");
    return;
  }

  const status = selectedStatus[callId];

  // Status required
  if (!status) {
    alert("Please select a call status.");
    return;
  }

  // ============================================
  // INTERESTED VALIDATION
  // ============================================

  const interested =
    interestedData[callId] || {};

  if (status === "Interested") {

    if (!interested.budget?.trim()) {
      alert("Please enter budget.");
      return;
    }

    if (!interested.preferred_location?.trim()) {
      alert("Please enter preferred location.");
      return;
    }

    if (!interested.preference?.trim()) {
      alert("Please enter preference.");
      return;
    }
  }

  setSavingCall(true);

  // ============================================
  // DATA TO SAVE
  // ============================================

  const updateData = {
    email: call.email || null,
    location: call.location || null,
    remarks: call.remarks || null,
    status: status,
  };

  // Only Interested gets these 3 fields
  if (status === "Interested") {

    updateData.budget =
      interested.budget || null;

    updateData.preferred_location =
      interested.preferred_location || null;

    updateData.preference =
      interested.preference || null;

  } else {

    // Clear interested-only fields
    updateData.budget = null;
    updateData.preferred_location = null;
    updateData.preference = null;
  }

  // ============================================
  // SAVE TO SUPABASE
  // ============================================

  const { error } = await supabase
    .from("calls")
    .update(updateData)
    .eq("id", callId)
    .eq("agent_id", user.id);

  if (error) {

    console.error(
      "Error saving call:",
      error
    );

    alert("Failed to save call.");

    setSavingCall(false);

    return;
  }

  // ============================================
  // REMOVE COMPLETED CALL
  // ============================================

  setCalls((prevCalls) =>
    prevCalls.filter(
      (item) => item.id !== callId
    )
  );

  // ============================================
  // CLEAR TEMPORARY DATA
  // ============================================

  setSelectedStatus((prev) => {

    const updated = {
      ...prev,
    };

    delete updated[callId];

    return updated;
  });

  setInterestedData((prev) => {

    const updated = {
      ...prev,
    };

    delete updated[callId];

    return updated;
  });

  // ============================================
  // NEXT CALL
  // ============================================

  setCurrentCallIndex(0);

  setSavingCall(false);

  // Refresh stats
  fetchAgentCalls();
};

  return (
    <div className="agent-dashboard">
      {/* GREETING */}

      <div className="agent-welcome">
        <h1>
          {greeting}, {userName}!
        </h1>

        <p>Here's your call performance for today.</p>
      </div>

      {/* ======================================
          STATS
      ====================================== */}

      <div className="stats">
        <div className="stat-card">
          <h3>{stats.total}</h3>
          <p>Today's Calls</p>
        </div>

        <div className="stat-card">
          <h3>{stats.interested}</h3>
          <p>Interested</p>
        </div>

        <div className="stat-card">
          <h3>{stats.notInterested}</h3>
          <p>Not Interested</p>
        </div>

        <div className="stat-card">
          <h3>{stats.wrongNumber}</h3>
          <p>Wrong Number</p>
        </div>

        <div className="stat-card">
          <h3>{stats.notPicked}</h3>
          <p>Not Picked</p>
        </div>
      </div>

      {/* ======================================
          ASSIGNED CALLS
      ====================================== */}

      <div className="assigned-leads">
        <div className="assigned-leads-header">
          <h2>My Assigned Calls</h2>

          <span>{calls.length} Calls</span>
        </div>

        {calls.length === 0 ? (
          <div className="no-leads">No calls assigned to you.</div>
        ) : (
          <div className="lead-list">
            {currentCall ? (
              <div className="agent-call-card">
                {/* =========================
              CALL NUMBER
          ========================= */}

                <div className="call-number">Call #{currentCallIndex + 1}</div>

                {/* =========================
              CUSTOMER INFORMATION
          ========================= */}

                <div className="lead-info">
                  <h2>{currentCall.customer_name}</h2>

                  <p>📞 {currentCall.contact_no}</p>

                  {/* EMAIL */}

                  <div className="agent-field">
                    <label>Email</label>

                    <input
                      type="email"
                      placeholder="Customer Email"
                      value={currentCall.email || ""}
                      onChange={(e) =>
                        handleCallFieldChange(
                          currentCall.id,
                          "email",
                          e.target.value,
                        )
                      }
                    />
                  </div>

                  {/* LOCATION */}

                  <div className="agent-field">
                    <label>Location</label>

                    <input
                      type="text"
                      placeholder="Customer Location"
                      value={currentCall.location || ""}
                      onChange={(e) =>
                        handleCallFieldChange(
                          currentCall.id,
                          "location",
                          e.target.value,
                        )
                      }
                    />
                  </div>

                  {/* REMARKS */}

                  <div className="agent-field remarks-field">
                    <label>Remarks</label>

                    <textarea
                      placeholder="Add remarks..."
                      value={currentCall.remarks || ""}
                      onChange={(e) =>
                        handleCallFieldChange(
                          currentCall.id,
                          "remarks",
                          e.target.value,
                        )
                      }
                    />
                  </div>
                </div>

                {/* =========================
              STATUS
          ========================= */}

                <div className="lead-action">
                  <label>Call Status</label>

                  <select
                    value={selectedStatus[currentCall.id] || ""}
                    onChange={(e) =>
                      handleStatusChange(currentCall.id, e.target.value)
                    }
                    disabled={savingCall}
                  >
                    <option value="">Select Status</option>

                    <option value="Interested">Interested</option>

                    <option value="Not Interested">Not Interested</option>

                    <option value="Wrong Number">Wrong Number</option>

                    <option value="Not Picked">Not Picked</option>
                  </select>
                </div>

                {/* =========================
              INTERESTED SECTION
          ========================= */}

                {selectedStatus[currentCall.id] === "Interested" && (
                  <div className="interested-panel">
                    <div className="interested-title">
                      ✨ Lead is Interested
                    </div>

                    <div className="interested-fields">
                      {/* BUDGET */}

                      <div>
                        <label>Budget</label>

                        <input
                          type="text"
                          placeholder="Enter budget"
                          value={interestedData[currentCall.id]?.budget || ""}
                          onChange={(e) =>
                            handleInterestedFieldChange(
                              currentCall.id,
                              "budget",
                              e.target.value,
                            )
                          }
                        />
                      </div>

                      {/* PREFERRED LOCATION */}

                      <div>
                        <label>Preferred Location</label>

                        <input
                          type="text"
                          placeholder="Enter location"
                          value={
                            interestedData[currentCall.id]
                              ?.preferred_location || ""
                          }
                          onChange={(e) =>
                            handleInterestedFieldChange(
                              currentCall.id,
                              "preferred_location",
                              e.target.value,
                            )
                          }
                        />
                      </div>

                      {/* PREFERENCE */}

                      <div>
                        <label>Preference</label>

                        <input
                          type="text"
                          placeholder="2 BHK / Villa / Plot"
                          value={
                            interestedData[currentCall.id]?.preference || ""
                          }
                          onChange={(e) =>
                            handleInterestedFieldChange(
                              currentCall.id,
                              "preference",
                              e.target.value,
                            )
                          }
                        />
                      </div>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  className="save-interested-btn"
                  onClick={() => saveCall(currentCall.id)}
                  disabled={savingCall}
                >
                  {savingCall ? "Saving..." : "✨ Save & Next Call"}
                </button>
              </div>
            ) : (
              <div className="no-leads">
                🎉 All assigned calls are completed!
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}



export default AgentDashboard;