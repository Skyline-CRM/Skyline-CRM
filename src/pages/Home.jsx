import ManagerDashboard from "../components/ManagerDashboard";
import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import Auth from "../components/Auth";
import AgentDashboard from "../components/AgentDashboard";
import { supabase } from "../services/supabase";
import Leads from "../components/Leads";


function Home() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [profile, setProfile] = useState(null);

  // Refresh dashboard stats
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Reset CallForm
  const [formResetTrigger, setFormResetTrigger] = useState(0);

  // Leads page
  const [showLeads, setShowLeads] = useState(false);


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

        console.log("PROFILE:", profileData);
      }

      setLoading(false);
    };


    getCurrentUser();


    // Listen for login/logout

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

          console.log("PROFILE:", profileData);

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

    setRefreshTrigger((prev) => prev + 1);

    setFormResetTrigger((prev) => prev + 1);
  };


  // =========================
  // LEADS CLICK
  // =========================

  const handleLeadsClick = () => {
    setShowLeads(true);
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
        onLeads={handleLeadsClick}
        onLogout={handleLogout}
      />


      <div className="container">

        {showLeads ? (

          <Leads />

        ) : (

          <AgentDashboard
            refreshTrigger={refreshTrigger}
          />

        )}

      </div>

    </>
  );
}


export default Home;