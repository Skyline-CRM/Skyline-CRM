import { supabase } from "../services/supabase";
import { useState } from "react";
import UploadData from "./UploadData";
import { useEffect } from "react";
window.supabaseClient = supabase;
import * as XLSX from "xlsx";



function ManagerDashboard({ managerName }) {

  const [activeSection, setActiveSection] = useState("overview");

  // ========================================
  // INTERESTED LEADS
  // ========================================

  const [interestedLeads, setInterestedLeads] = useState([]);
  const [interestedLeadsLoading, setInterestedLeadsLoading] = useState(false);
  const [interestedLeadsError, setInterestedLeadsError] = useState("");

  // ========================================
  // ASSIGNED CALLS
  // ========================================

  const [assignedCalls, setAssignedCalls] = useState([]);
  const [assignedCallsLoading, setAssignedCallsLoading] = useState(false);
  const [assignedCallsError, setAssignedCallsError] = useState("");

  // ========================================
  // DOWNLOAD INTERESTED LEADS EXCEL
  // ========================================

  const downloadInterestedLeadsExcel = () => {
    if (!interestedLeads || interestedLeads.length === 0) {
      return;
    }

    const excelData = interestedLeads.map((lead) => ({
      Customer: lead.customer_name || "",
      Contact: lead.contact_no || "",
      Email: lead.email || "",
      Location: lead.location || "",
      Agent: lead.agent_name || "",
      Budget: lead.budget || "",
      "Preferred Location": lead.preferred_location || "",
      Preference: lead.preference || "",
      Remarks: lead.remarks || "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Interested Leads"
    );

    XLSX.writeFile(
      workbook,
      "Interested_Leads.xlsx"
    );
  };

  // ========================================
  // FETCH ASSIGNED CALLS
  // ========================================

  const fetchAssignedCalls = async () => {
    setAssignedCallsLoading(true);
    setAssignedCallsError("");

    try {
      // Get calls where status has not been updated
      const { data: calls, error: callsError } = await supabase
        .from("calls")
        .select("agent_id, status")
        .or("status.is.null,status.eq.");

      if (callsError) {
        console.error("Error fetching assigned calls:", callsError);
        setAssignedCallsError("Unable to load assigned calls.");
        setAssignedCalls([]);
        return;
      }

      // Get agent names
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, name");

      if (profilesError) {
        console.error("Error fetching agent profiles:", profilesError);
        setAssignedCallsError("Unable to load agent names.");
        setAssignedCalls([]);
        return;
      }

      // Count pending calls for each agent
      const agentCounts = {};

      (calls || []).forEach((call) => {
        if (!call.agent_id) return;

        if (!agentCounts[call.agent_id]) {
          agentCounts[call.agent_id] = 0;
        }

        agentCounts[call.agent_id]++;
      });

      // Convert counts into table data
      const result = Object.entries(agentCounts).map(
        ([agentId, count]) => {
          const agent = (profiles || []).find(
            (profile) => profile.user_id === agentId
          );

          return {
            agent_id: agentId,
            agent_name: agent?.name || "Unknown Agent",
            pending_calls: count,
          };
        }
      );

      // Highest pending calls first
      result.sort((a, b) => b.pending_calls - a.pending_calls);

      setAssignedCalls(result);

    } catch (err) {
      console.error("Unexpected error fetching assigned calls:", err);
      setAssignedCallsError("Unable to load assigned calls.");
      setAssignedCalls([]);
    } finally {
      setAssignedCallsLoading(false);
    }
  };

  // ========================================
  // FETCH INTERESTED LEADS
  // ========================================

  const fetchInterestedLeads = async () => {
    setInterestedLeadsLoading(true);
    setInterestedLeadsError("");

    try {
      // Get all interested leads
      const { data: leads, error: leadsError } = await supabase
        .from("calls")
        .select(`
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
        `)
        .eq("status", "Interested")
        .order("created_at", { ascending: false });

      if (leadsError) {
        console.error("Error fetching interested leads:", leadsError);
        setInterestedLeadsError("Unable to load interested leads.");
        setInterestedLeads([]);
        return;
      }

      // Get agent names
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, name");

      if (profilesError) {
        console.error("Error fetching agent profiles:", profilesError);
        setInterestedLeadsError("Unable to load agent names.");
        setInterestedLeads([]);
        return;
      }

      // Match agent_id with profiles.user_id
      const leadsWithAgentNames = (leads || []).map((lead) => {
        const agent = (profiles || []).find(
          (profile) => profile.user_id === lead.agent_id
        );

        return {
          ...lead,
          agent_name: agent?.name || "-",
        };
      });

      setInterestedLeads(leadsWithAgentNames);

    } catch (err) {
      console.error("Unexpected error fetching interested leads:", err);
      setInterestedLeadsError("Unable to load interested leads.");
      setInterestedLeads([]);

    } finally {
      setInterestedLeadsLoading(false);
    }
  };

  // ========================================
  // INTERESTED LEADS EFFECT
  // ========================================

  useEffect(() => {
    console.log("Active section:", activeSection);

    if (activeSection === "interested") {
      console.log("Interested Leads tab opened!");
      fetchInterestedLeads();
    }
  }, [activeSection]);

  // ========================================
  // ASSIGNED CALLS EFFECT
  // ========================================

  useEffect(() => {
    if (activeSection === "AssignedCalls") {
      fetchAssignedCalls();
    }
  }, [activeSection]);


  // ========================================
  // EXISTING STATS
  // ========================================

  const [stats, setStats] = useState({
    total: 0,
    interested: 0,
    notInterested: 0,
    wrongNumber: 0,
    notPicked: 0,
  });

  const [agentPerformance, setAgentPerformance] = useState([]);

  const fetchTodayStats = async () => {
    try {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const startOfTomorrow = new Date(startOfDay);
      startOfTomorrow.setDate(
        startOfTomorrow.getDate() + 1
      );

    // ============================================
    // FETCH TODAY'S COMPLETED CALLS
    // ============================================

    const { data: calls, error: callsError } =
      await supabase
        .from("calls")
        .select(
          "id, agent_id, status, created_at"
        )
        .not("status", "is", null)
        .gte(
          "created_at",
          startOfDay.toISOString()
        )
        .lt(
          "created_at",
          startOfTomorrow.toISOString()
        );

    if (callsError) {
      console.error(
        "Error fetching today's calls:",
        callsError
      );
      return;
    }

    const completedToday = (calls || []).filter(
      (call) =>
        call.status &&
        call.status.trim() !== ""
    );

    // ============================================
    // OVERALL STATS
    // ============================================

    setStats({
      total: completedToday.length,

      interested: completedToday.filter(
        (call) =>
          call.status === "Interested"
      ).length,

      notInterested: completedToday.filter(
        (call) =>
          call.status === "Not Interested"
      ).length,

      wrongNumber: completedToday.filter(
        (call) =>
          call.status === "Wrong Number"
      ).length,

      notPicked: completedToday.filter(
        (call) =>
          call.status === "Not Picked"
      ).length,
    });

    // ============================================
    // FETCH ALL AGENTS
    // ============================================

    const { data: agents, error: agentsError } =
      await supabase
        .from("profiles")
        .select(
          "user_id, name"
        )
        .eq("role", "agent");

    if (agentsError) {
      console.error(
        "Error fetching agents:",
        agentsError
      );
      return;
    }

    // ============================================
    // CREATE AGENT-WISE STATS
    // ============================================

    const performance = agents.map(
      (agent) => {

        const agentCalls =
          completedToday.filter(
            (call) =>
              call.agent_id === agent.user_id
          );

        return {
          agent_id: agent.user_id,

          name: agent.name || "Agent",

          total: agentCalls.length,

          interested:
            agentCalls.filter(
              (call) =>
                call.status === "Interested"
            ).length,

          notInterested:
            agentCalls.filter(
              (call) =>
                call.status === "Not Interested"
            ).length,

          wrongNumber:
            agentCalls.filter(
              (call) =>
                call.status === "Wrong Number"
            ).length,

          notPicked:
            agentCalls.filter(
              (call) =>
                call.status === "Not Picked"
            ).length,
        };
      }
    );
    console.log("FINAL AGENT PERFORMANCE:", performance);

    setAgentPerformance(performance);

  } catch (error) {
    console.error(
      "Unexpected admin stats error:",
      error
    );
  }
};

  useEffect(() => {
  fetchTodayStats();
}, []);


  const menuItems = [
    {
      id: "overview",
      icon: "📊",
      label: "Overview",
    },
    {
      id: "monthly",
      icon: "📅",
      label: "Monthly Report",
    },
    {
      id: "agents",
      icon: "👥",
      label: "Agent Reports",
    },
    {
      id: "interested",
      icon: "⭐",
      label: "Interested Leads",
    },
    {
      id: "upload",
      icon: "📤",
      label: "Upload Data",
    },
    {
      id: "AssignedCalls",
      icon: "📋",
      label: "Pending Calls",
    },
  ];

  const renderContent = () => {
    switch (activeSection) {
      case "overview":
        return (
          <>
            <div className="manager-page-header">
              {/* LEFT */}
              <div>
                <h1>Hello, {managerName} 👋</h1>

                <p>Let's see team's performance today.</p>
              </div>

              {/* RIGHT */}
              <div className="manager-date">
                📅{" "}
                {new Date().toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </div>
            </div>

            {/* STAT CARDS */}

            <div className="manager-stats">
              <div className="manager-stat-card">
                <span className="stat-icon">📞</span>
                <div>
                  <p>Total Calls</p>
                  <h2>{stats.total}</h2>
                </div>
              </div>

              <div className="manager-stat-card interested">
                <span className="stat-icon">⭐</span>
                <div>
                  <p>Interested</p>
                  <h2>{stats.interested}</h2>
                </div>
              </div>

              <div className="manager-stat-card">
                <span className="stat-icon">❌</span>
                <div>
                  <p>Not Interested</p>
                  <h2>{stats.notInterested}</h2>
                </div>
              </div>

              <div className="manager-stat-card">
                <span className="stat-icon">☎️</span>
                <div>
                  <p>Wrong Number</p>
                  <h2>{stats.wrongNumber}</h2>
                </div>
              </div>

              <div className="manager-stat-card">
                <span className="stat-icon">📵</span>
                <div>
                  <p>Not Picked</p>
                  <h2>{stats.notPicked}</h2>
                </div>
              </div>
            </div>

            {/* AGENT PERFORMANCE */}

            <div className="manager-section">
              <div className="section-heading">
                <div>
                  <h2>Today's Agent Performance</h2>
                  <p>See how many calls each agent has handled today.</p>
                </div>
              </div>

              <div className="agent-table-wrapper">
                <table className="agent-performance-table">
                  <thead>
                    <tr>
                      <th>Agent</th>
                      <th>Total Calls</th>
                      <th>Interested</th>
                      <th>Not Interested</th>
                      <th>Wrong Number</th>
                      <th>Not Picked</th>
                    </tr>
                  </thead>

                  <tbody>
                    {agentPerformance.length > 0 ? (
                      agentPerformance.map((agent) => (
                        <tr key={agent.agent_id}>
                          <td>{agent.name}</td>

                          <td>{agent.total}</td>

                          <td>{agent.interested}</td>

                          <td>{agent.notInterested}</td>

                          <td>{agent.wrongNumber}</td>

                          <td>{agent.notPicked}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6">No agent data available yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        );

      case "monthly":
        return (
          <div className="manager-placeholder">
            <span>📅</span>
            <h2>Monthly Reports</h2>
            <p>Monthly performance reports will appear here.</p>
          </div>
        );

      case "agents":
        return (
          <div className="manager-placeholder">
            <span>👥</span>
            <h2>Agent Reports</h2>
            <p>Detailed agent-wise reports will appear here.</p>
          </div>
        );

      case "interested":
        return (
          <div>
            {" "}
            <div className="manager-page-header">
              {" "}
              <div>
                {" "}
                <h1>Interested Leads</h1>{" "}
                <p>All customers marked as interested by your agents.</p>{" "}
              </div>{" "}
              <div className="interested-leads-actions">
                <div className="interested-leads-count">
                  {interestedLeads.length} Leads
                </div>

                <button
                  type="button"
                  className="interested-leads-download"
                  onClick={downloadInterestedLeadsExcel}
                  disabled={interestedLeads.length === 0}
                >
                  Download Excel
                </button>
              </div>{" "}
            </div>{" "}
            <div className="manager-section">
              {" "}
              {interestedLeadsLoading && (
                <p className="interested-leads-message">
                  {" "}
                  Loading interested leads...{" "}
                </p>
              )}{" "}
              {!interestedLeadsLoading && interestedLeadsError && (
                <p className="interested-leads-error">
                  {" "}
                  {interestedLeadsError}{" "}
                </p>
              )}{" "}
              {!interestedLeadsLoading &&
                !interestedLeadsError &&
                interestedLeads.length === 0 && (
                  <p className="interested-leads-message">
                    {" "}
                    No interested leads found yet.{" "}
                  </p>
                )}{" "}
              {!interestedLeadsLoading &&
                !interestedLeadsError &&
                interestedLeads.length > 0 && (
                  <div className="interested-leads-table-wrapper">
                    {" "}
                    <table className="interested-leads-table">
                      <thead>
                        <tr>
                          <th>Customer</th>
                          <th>Contact</th>
                          <th>Email</th>
                          <th>Location</th>
                          <th>Agent</th>
                          <th>Budget</th>
                          <th>Preferred Location</th>
                          <th>Preference</th>
                          {/* <th>Status</th> */}
                          <th>Remarks</th>
                          {/* <th>Date</th> */}
                        </tr>
                      </thead>

                      <tbody>
                        {interestedLeads.map((lead) => (
                          <tr key={lead.id}>
                            <td>{lead.customer_name || "-"}</td>

                            <td>{lead.contact_no || "-"}</td>

                            <td>{lead.email || "-"}</td>

                            <td>{lead.location || "-"}</td>

                            <td>{lead.agent_name || "-"}</td>

                            <td>{lead.budget || "-"}</td>

                            <td>{lead.preferred_location || "-"}</td>

                            <td>{lead.preference || "-"}</td>

                            {/* <td>
                              <span className="interested-status">
                                {lead.status}
                              </span>
                            </td> */}

                            <td>{lead.remarks || "-"}</td>

                            {/* <td>
                              {lead.created_at
                                ? new Date(lead.created_at).toLocaleDateString(
                                    "en-IN",
                                  )
                                : "-"}
                            </td> */}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}{" "}
            </div>{" "}
          </div>
        );

      case "upload":
        return <UploadData />;

      case "AssignedCalls":
  return (
    <div>
      <div className="manager-page-header">
        <div>
          <h1>Pending Calls</h1>
          <p>Calls assigned to agents that are waiting for a status update.</p>
        </div>

        <div className="interested-leads-count">
          {assignedCalls.reduce(
            (total, agent) => total + agent.pending_calls,
            0
          )}{" "}
          Pending
        </div>
      </div>

      <div className="manager-section">
        {assignedCallsLoading && (
          <p className="interested-leads-message">
            Loading assigned calls...
          </p>
        )}

        {!assignedCallsLoading && assignedCallsError && (
          <p className="interested-leads-error">
            {assignedCallsError}
          </p>
        )}

        {!assignedCallsLoading &&
          !assignedCallsError &&
          assignedCalls.length === 0 && (
            <p className="interested-leads-message">
              No pending assigned calls found.
            </p>
          )}

        {!assignedCallsLoading &&
          !assignedCallsError &&
          assignedCalls.length > 0 && (
            <div className="interested-leads-table-wrapper">
              <table className="interested-leads-table">
                <thead>
                  <tr>
                    <th>Agent Name</th>
                    <th>Pending Calls</th>
                  </tr>
                </thead>

                <tbody>
                  {assignedCalls.map((agent) => (
                    <tr key={agent.agent_id}>
                      <td>{agent.agent_name}</td>
                      <td>{agent.pending_calls}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </div>
    </div>
  );

      default:
        return null;
    }
  };


  return (
    <div className="manager-dashboard">
      {/* =========================
          SIDEBAR
      ========================= */}

      <aside className="manager-sidebar">
        <div className="manager-brand">
          <div className="manager-logo">SI</div>

          <div>
            <h2>Skyline Infra</h2>
            <span>Manager Panel</span>
          </div>
        </div>

        <div className="sidebar-divider"></div>

        <nav className="manager-navigation">
          <p className="sidebar-title">MANAGEMENT</p>

          {menuItems.map((item) => (
            <button
              key={item.id}
              className={`manager-nav-item ${
                activeSection === item.id ? "active" : ""
              }`}
              onClick={() => setActiveSection(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>

              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="manager-sidebar-bottom">
          <button
            type="button"
            className="manager-logout-btn"
            onClick={handleManagerLogout}
          >
            🚪
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* =========================
          MAIN CONTENT
      ========================= */}

      <main className="manager-main">{renderContent()}</main>
    </div>
  );
}




const handleManagerLogout = async () => {
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error("Manager logout error:", error);
    return;
  }

  // Home.jsx ka auth state automatically update hoga
};

export default ManagerDashboard;
