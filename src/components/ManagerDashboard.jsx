import { supabase } from "../services/supabase";
import { useState } from "react";
import UploadData from "./UploadData";
import { useEffect } from "react";
window.supabaseClient = supabase;

function ManagerDashboard({ managerName }) {
  const [activeSection, setActiveSection] = useState("overview");

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
      id: "calls",
      icon: "📋",
      label: "All Calls",
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
      <td colSpan="6">
        No agent data available yet.
      </td>
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
            <p>
              Monthly performance reports will appear here.
            </p>
          </div>
        );

      case "agents":
        return (
          <div className="manager-placeholder">
            <span>👥</span>
            <h2>Agent Reports</h2>
            <p>
              Detailed agent-wise reports will appear here.
            </p>
          </div>
        );

      case "interested":
        return (
          <div className="manager-placeholder">
            <span>⭐</span>
            <h2>Interested Leads</h2>
            <p>
              All interested leads will appear here.
            </p>
          </div>
        );

      case "upload":
        return <UploadData />;

      case "calls":
        return (
          <div className="manager-placeholder">
            <span>📋</span>
            <h2>All Calls</h2>
            <p>
              Complete call records will appear here.
            </p>
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