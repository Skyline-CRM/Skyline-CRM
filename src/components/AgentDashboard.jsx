import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";

function AgentDashboard({ refreshTrigger }) {
  const [userName, setUserName] = useState("");
  const [greeting, setGreeting] = useState("");

  const [stats, setStats] = useState({
    total: 0,
    interested: 0,
    notInterested: 0,
    wrongNumber: 0,
    notConnected: 0,
  });

  const [displayStats, setDisplayStats] = useState({
    total: 0,
    interested: 0,
    notInterested: 0,
    wrongNumber: 0,
    notConnected: 0,
  });

  // Get logged-in user's name
  useEffect(() => {
    getUserName();
  }, []);

  const getUserName = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      setUserName(user.user_metadata?.name || "Agent");
    }
  };

  // Greeting
  useEffect(() => {
    const updateGreeting = () => {
      const hour = new Date().getHours();

      if (hour < 12) {
        setGreeting("Good Morning");
      } else if (hour < 16) {
        setGreeting("Good Afternoon");
      } else {
        setGreeting("Good Evening");
      }
    };

    updateGreeting();
  }, []);

 // Fetch today's stats for logged-in agent
const fetchTodayStats = async () => {
  const now = new Date();

  const startOfDay = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  const startOfTomorrow = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1
  );

  // Get logged-in user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.error("No logged-in user found.");
    return;
  }

  console.log("Fetching stats for agent:", user.id);

  const { data, error } = await supabase
    .from("calls")
    .select("status, created_at, agent_id")
    .eq("agent_id", user.id) // ⭐ ONLY THIS AGENT'S CALLS
    .gte("created_at", startOfDay.toISOString())
    .lt("created_at", startOfTomorrow.toISOString());

  if (error) {
    console.error("Error fetching today's calls:", error);
    return;
  }

  const calls = data || [];

  console.log("Today's calls for this agent:", calls);

  setStats({
    total: calls.length,

    interested: calls.filter(
      (call) => call.status === "Interested"
    ).length,

    notInterested: calls.filter(
      (call) => call.status === "Not Interested"
    ).length,

    wrongNumber: calls.filter(
      (call) => call.status === "Wrong Number"
    ).length,

    notConnected: calls.filter(
      (call) => call.status === "Not Connected"
    ).length,
  });
};

  // Load stats on page load AND whenever refreshTrigger changes
  useEffect(() => {
    fetchTodayStats();
  }, [refreshTrigger]);

  // Number animation
  useEffect(() => {
    const duration = 700;
    const startTime = performance.now();

    const animate = (currentTime) => {
      const progress = Math.min(
        (currentTime - startTime) / duration,
        1
      );

      // Smooth animation
      const easeOut = 1 - Math.pow(1 - progress, 3);

      setDisplayStats({
        total: Math.floor(stats.total * easeOut),
        interested: Math.floor(stats.interested * easeOut),
        notInterested: Math.floor(
          stats.notInterested * easeOut
        ),
        wrongNumber: Math.floor(
          stats.wrongNumber * easeOut
        ),
        notConnected: Math.floor(
          stats.notConnected * easeOut
        ),
      });

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [stats]);

  return (
    <div className="agent-dashboard">
      <div className="agent-welcome">
        <h4>
          {greeting}, {userName}! Here's your call performance for today.
        </h4>

      </div>

      <div className="stats">

        <div className="stat-card">
          <h3>{displayStats.total}</h3>
          <p>Today's Calls</p>
        </div>

        <div className="stat-card">
          <h3>{displayStats.interested}</h3>
          <p>Interested</p>
        </div>

        <div className="stat-card">
          <h3>{displayStats.notInterested}</h3>
          <p>Not Interested</p>
        </div>

        <div className="stat-card">
          <h3>{displayStats.wrongNumber}</h3>
          <p>Wrong Number</p>
        </div>

        <div className="stat-card">
          <h3>{displayStats.notConnected}</h3>
          <p>Not Connected</p>
        </div>

      </div>

    </div>
  );
}

export default AgentDashboard;