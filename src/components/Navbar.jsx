import { useState } from "react";

function Navbar({ userName, onLogout, onLeads, onHome }) {
  const [showMenu, setShowMenu] = useState(false);


  return (
    <nav>

      <div className="logo">
        <img src="/logo.png" alt="Logo" />
      </div>

        <input
          type="text"
          placeholder="🔍 Search Contact Number"
          className="search-box"
        />

        <ul className="nav-links">
          <li onClick={onHome}>Home</li>
          <li onClick={onLeads}>Leads</li>
        </ul>

        <div className="user-menu">

          <button
            className="login-btn"
            onClick={() => setShowMenu(!showMenu)}
          >
            {userName||"User"} ▾
          </button>

          {showMenu && (
            <div className="user-dropdown">

              <button
                onClick={() => {
                  setShowMenu(false);
                  onLogout();
                }}
              >
                Logout
              </button>

            </div>
          )}

        </div>


    </nav>
  );
}

export default Navbar;