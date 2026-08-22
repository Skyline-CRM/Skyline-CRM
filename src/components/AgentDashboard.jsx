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

  // Temporary status selection
  const [selectedStatus, setSelectedStatus] = useState({});

  // Temporary Interested fields
  const [interestedData, setInterestedData] = useState({});

  const currentCall = calls[currentCallIndex];

  // =========================================================
  // GET LOGGED-IN USER
  // =========================================================

  useEffect(() => {
    const getUser = async () => {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (error) {
          console.error(
            "Error getting logged-in user:",
            error
          );

          setLoading(false);
          return;
        }

        if (!user) {
          console.log("No logged-in user found.");

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
      } catch (error) {
        console.error(
          "Unexpected user error:",
          error
        );

        setLoading(false);
      }
    };

    getUser();
  }, []);

  // =========================================================
  // FETCH DATA WHEN USER / REFRESH CHANGES
  // =========================================================

  useEffect(() => {
    if (!user) return;

    fetchAgentCalls();
    fetchTodayStats();
  }, [user, refreshTrigger]);

  // =========================================================
  // FETCH TODAY'S COMPLETED CALLS
  //
  // TODAY'S CALLS =
  //
  // agent_id = current agent
  // status IS NOT NULL
  // created_at = today
  //
  // created_at is updated whenever the agent saves a call.
  // =========================================================

 const fetchTodayStats = async () => {
  if (!user) return;

  try {
    console.log(
      "Fetching today's stats for agent:",
      user.id
    );

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const startOfTomorrow = new Date(startOfDay);
    startOfTomorrow.setDate(
      startOfTomorrow.getDate() + 1
    );

    const startISO = startOfDay.toISOString();
    const endISO = startOfTomorrow.toISOString();

    const { data, error } = await supabase
      .from("calls")
      .select("id, status, created_at")
      .eq("agent_id", user.id)
      .not("status", "is", null)
      .gte("created_at", startISO)
      .lt("created_at", endISO);

    if (error) {
      console.error(
        "Error fetching today's stats:",
        error
      );
      return;
    }

    const completedToday = (data || []).filter(
      (call) =>
        call.status &&
        call.status.trim() !== ""
    );

    const newStats = {
      total: completedToday.length,

      interested: completedToday.filter(
        (call) => call.status === "Interested"
      ).length,

      notInterested: completedToday.filter(
        (call) => call.status === "Not Interested"
      ).length,

      wrongNumber: completedToday.filter(
        (call) => call.status === "Wrong Number"
      ).length,

      notPicked: completedToday.filter(
        (call) => call.status === "Not Picked"
      ).length,
    };

    setStats(newStats);

  } catch (error) {
    console.error(
      "Unexpected stats error:",
      error
    );
  }
};

  // =========================================================
  // FETCH ASSIGNED CALLS
  //
  // ASSIGNED CALLS =
  //
  // agent_id = current agent
  // status IS NULL
  // =========================================================

  const fetchAgentCalls = async () => {
    if (!user) return;

    try {
      setLoading(true);

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
          created_at
        `
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

      const agentCalls = data || [];

      setCalls(agentCalls);

      // Prevent invalid current index
      setCurrentCallIndex((prevIndex) => {
        if (agentCalls.length === 0) {
          return 0;
        }

        if (prevIndex >= agentCalls.length) {
          return 0;
        }

        return prevIndex;
      });
    } catch (error) {
      console.error(
        "Unexpected error fetching calls:",
        error
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // HANDLE CALL FIELD CHANGE
  // =========================================================

  const handleCallFieldChange = (
    callId,
    field,
    value
  ) => {
    setCalls((prevCalls) =>
      prevCalls.map((call) =>
        call.id === callId
          ? {
              ...call,
              [field]: value,
            }
          : call
      )
    );
  };

  // =========================================================
  // HANDLE STATUS CHANGE
  //
  // This only changes temporary React state.
  // Supabase is updated when Save & Next is clicked.
  // =========================================================

  const handleStatusChange = (
    callId,
    status
  ) => {
    setSelectedStatus((prev) => ({
      ...prev,
      [callId]: status,
    }));

    // If agent changes away from Interested,
    // remove temporary Interested data.
    if (status !== "Interested") {
      setInterestedData((prev) => {
        const updated = {
          ...prev,
        };

        delete updated[callId];

        return updated;
      });
    }
  };

  // =========================================================
  // HANDLE INTERESTED FIELD CHANGE
  // =========================================================

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

  // =========================================================
  // SAVE CALL & GO TO NEXT
  // =========================================================

  const saveCall = async (callId) => {
    if (!user) {
      console.error(
        "No logged-in user."
      );

      return;
    }

    const call = calls.find(
      (item) => item.id === callId
    );

    if (!call) {
      console.error(
        "Call not found:",
        callId
      );

      return;
    }

    const status =
      selectedStatus[callId];

    // =====================================================
    // STATUS REQUIRED
    // =====================================================

    if (!status) {
      alert(
        "Please select a call status."
      );

      return;
    }

    // =====================================================
    // INTERESTED VALIDATION
    // =====================================================

    const interested =
      interestedData[callId] || {};

    if (status === "Interested") {
      if (!interested.budget?.trim()) {
        alert(
          "Please enter budget."
        );

        return;
      }

      if (
        !interested.preferred_location?.trim()
      ) {
        alert(
          "Please enter preferred location."
        );

        return;
      }

      if (
        !interested.preference?.trim()
      ) {
        alert(
          "Please enter preference."
        );

        return;
      }
    }

    try {
      setSavingCall(true);

      // ===================================================
      // UPDATE DATA
      //
      // IMPORTANT:
      //
      // We intentionally update created_at whenever the
      // agent saves the call.
      //
      // This makes created_at represent the latest
      // status-update/completion time.
      // ===================================================

      const updateData = {
        email: call.email || null,

        location:
          call.location || null,

        remarks:
          call.remarks || null,

        status: status,

        created_at:
          new Date().toISOString(),
      };

      // ===================================================
      // INTERESTED DATA
      // ===================================================

      if (status === "Interested") {
        updateData.budget =
          interested.budget?.trim() ||
          null;

        updateData.preferred_location =
          interested.preferred_location?.trim() ||
          null;

        updateData.preference =
          interested.preference?.trim() ||
          null;
      } else {
        // Clear Interested-only fields
        updateData.budget = null;

        updateData.preferred_location =
          null;

        updateData.preference =
          null;
      }

      // ===================================================
      // UPDATE SUPABASE
      // ===================================================

      const { data, error } =
        await supabase
          .from("calls")
          .update(updateData)
          .eq("id", callId)
          .eq("agent_id", user.id)
          .select();

      if (error) {
        console.error(
          "Error saving call:",
          error.message,
          error.details,
          error.hint
        );

        alert(
          "Failed to save call. Please try again."
        );

        return;
      }

      // ===================================================
      // REMOVE COMPLETED CALL FROM LOCAL STATE
      // ===================================================

      setCalls((prevCalls) =>
        prevCalls.filter(
          (item) => item.id !== callId
        )
      );

      // ===================================================
      // CLEAR SELECTED STATUS
      // ===================================================

      setSelectedStatus((prev) => {
        const updated = {
          ...prev,
        };

        delete updated[callId];

        return updated;
      });

      // ===================================================
      // CLEAR INTERESTED DATA
      // ===================================================

      setInterestedData((prev) => {
        const updated = {
          ...prev,
        };

        delete updated[callId];

        return updated;
      });

      // ===================================================
      // RESET CALL INDEX
      // ===================================================

      setCurrentCallIndex(0);

      // ===================================================
      // REFRESH ASSIGNED CALLS
      // ===================================================

      await fetchAgentCalls();

      // ===================================================
      // REFRESH TOP STATS
      //
      // THIS IS IMPORTANT.
      //
      // Without this, the top counters would remain
      // unchanged until another dashboard refresh.
      // ===================================================

      await fetchTodayStats();

    } catch (error) {
      console.error(
        "Unexpected save error:",
        error
      );

      alert(
        "Something went wrong while saving the call."
      );
    } finally {
      setSavingCall(false);
    }
  };

  // =========================================================
  // GREETING
  // =========================================================

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

  // =========================================================
  // INITIAL LOADING
  // =========================================================

  if (loading && !user) {
    return null;
  }

  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="agent-dashboard">
      {/* =====================================================
          GREETING
      ===================================================== */}

      <div className="agent-welcome">
        <h1>
          {greeting}, {userName}!
        </h1>

        <p>Here's your call performance for today.</p>
      </div>

      {/* =====================================================
          STATS
      ===================================================== */}

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

      {/* =====================================================
          ASSIGNED CALLS
      ===================================================== */}

      <div className="assigned-leads">
        <div className="assigned-leads-header">

          <h2>
            My Assigned Calls
          </h2>

          <span>
            {calls.length} Calls
          </span>

        </div>

        {calls.length === 0 ? (
          <div className="no-leads">🎉 Saara data khtm ho gya beta!😝<br /> Sir se data maag lo!! 🤪</div>
        ) : (
          <div className="lead-list">
            {currentCall ? (
              <div className="agent-call-card">
                {/* =================================================
                    CUSTOMER INFORMATION
                ================================================= */}

                <div className="lead-info">
                  <h2 className="customer-call-heading">
                    <span className="customer-name">
                      {currentCall.customer_name}
                    </span>

                    <span className="customer-number">
                      📞 {currentCall.contact_no}
                    </span>
                  </h2>

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
                      disabled={savingCall}
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
                      disabled={savingCall}
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
                      disabled={savingCall}
                    />
                  </div>
                </div>

                {/* =================================================
                    STATUS
                ================================================= */}

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

                {/* =================================================
                    INTERESTED SECTION
                ================================================= */}

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
                          disabled={savingCall}
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
                          disabled={savingCall}
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
                          disabled={savingCall}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* =================================================
                    SAVE BUTTON
                ================================================= */}

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