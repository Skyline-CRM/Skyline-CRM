import ManagerDashboard from "../components/ManagerDashboard";
import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import Auth from "../components/Auth";
import AgentDashboard from "../components/AgentDashboard";
import { supabase } from "../services/supabase";
import Leads from "../components/Leads";
import FollowUps from "../components/FollowUps";

function Home() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [profile, setProfile] = useState(null);

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [formResetTrigger, setFormResetTrigger] = useState(0);

  const [showLeads, setShowLeads] = useState(false);

  const [showFollowUps, setShowFollowUps] = useState(false);

  const [editCallId, setEditCallId] = useState(null);

  const [searchNumber, setSearchNumber] = useState("");

  // =========================
  // GET CURRENT USER
  // =========================

  useEffect(() => {
    const getCurrentUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setUser(user);

      if (user) {
        const { data: profileData, error } = await supabase
          .from("profiles")
          .select("name, role, approval_status")
          .eq("user_id", user.id)
          .single();

        if (error) {
          console.error("Profile error:", error);
        }

        setProfile(profileData);
      }

      setLoading(false);
    };

    getCurrentUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const loggedInUser = session?.user ?? null;

        setUser(loggedInUser);

        if (loggedInUser) {
          const { data: profileData, error } = await supabase
            .from("profiles")
            .select("name, role, approval_status")
            .eq("user_id", loggedInUser.id)
            .single();

          if (error) {
            console.error("Profile error:", error);
          }

          setProfile(profileData);
        } else {
          setProfile(null);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // =========================
  // LOGOUT
  // =========================

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Logout error:", error);
      return;
    }

    setUser(null);
    setProfile(null);
  };

  // =========================
  // HOME CLICK
  // =========================

  const handleHomeClick = () => {
    setShowLeads(false);
    setShowFollowUps(false);
    setEditCallId(null);
    setSearchNumber("");

    setRefreshTrigger((prev) => prev + 1);
    setFormResetTrigger((prev) => prev + 1);
  };

  // =========================
  // LEADS CLICK
  // =========================

  const handleLeadsClick = () => {
    setShowLeads(true);
    setShowFollowUps(false);
    setEditCallId(null);
    setSearchNumber("");
  };

  // =========================
  // FOLLOW UP CLICK
  // =========================

  const handleFollowUpsClick = () => {
    setShowLeads(false);
    setShowFollowUps(true);
    setEditCallId(null);
    setSearchNumber("");
  };

  // =========================
  // EDIT LEAD
  // =========================

  const handleEditLead = (callId) => {
    setEditCallId(callId);
    setShowLeads(false);
    setShowFollowUps(false);
    setSearchNumber("");
  };

  // =========================
  // EDIT FOLLOW UP
  // =========================

  const handleEditFollowUp = (callId) => {
    setEditCallId(callId);
    setShowLeads(false);
    setShowFollowUps(false);
    setSearchNumber("");
  };

  // =========================
  // SEARCH CONTACT
  // =========================

  const handleSearch = (number) => {
    setSearchNumber(number);
    setShowLeads(false);
    setShowFollowUps(false);
    setEditCallId(null);
  };

  // =========================
  // LOADING
  // =========================

  if (loading) {
    return null;
  }

  // =========================
  // LOGGED OUT
  // =========================

  if (!user) {
    return <Auth onClose={() => {}} />;
  }

  // =========================
  // APPROVAL CHECK
  // =========================

  if (
    user &&
    profile &&
    profile.approval_status !== "approved"
  ) {
    return (
      <div className="approval-message">
        <h2>
          Account Pending Approval
        </h2>

        <p>
          Your account has been created successfully.
          Please wait for an admin to approve your account.
        </p>

        <button onClick={handleLogout}>
          Logout
        </button>
      </div>
    );
  }

  // =========================
  // PROFILE LOADING
  // =========================

  if (user && !profile) {
    return (
      <div className="approval-message">
        <h2>
          Loading Profile...
        </h2>
      </div>
    );
  }

  // =========================
  // ADMIN / MANAGER
  // =========================

  if (profile?.role === "admin") {
    return (
      <ManagerDashboard
        managerName={
          profile?.name ||
          user?.user_metadata?.name ||
          user?.email?.split("@")[0] ||
          "Manager"
        }
      />
    );
  }

  // =========================
  // AGENT
  // =========================

  return (
    <>
      <Navbar
        userName={
          profile?.name ||
          user?.user_metadata?.name ||
          user?.email?.split("@")[0] ||
          "User"
        }
        onHome={handleHomeClick}
        onFollowUps={handleFollowUpsClick}
        onLeads={handleLeadsClick}
        onLogout={handleLogout}
        onSearch={handleSearch}
      />

      <div className="container">
        {showLeads ? (
          <Leads onEditLead={handleEditLead} />
        ) : showFollowUps ? (
          <FollowUps onEditFollowUp={handleEditFollowUp} />
        ) : (
          <AgentDashboard
            refreshTrigger={refreshTrigger}
            searchNumber={searchNumber}
            editCallId={editCallId}
          />
        )}
      </div>
    </>
  );
}

export default Home;