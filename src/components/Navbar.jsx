import { useState } from "react";

function Navbar({ userName, onLogout, onLeads, onHome, onSearch, onFollowUps }) {
  const [showMenu, setShowMenu] = useState(false);
  const [searchNumber, setSearchNumber] = useState("");

  const handleSearch = (e) => {
    if (e.key === "Enter") {
      const number = searchNumber.replace(/\D/g, "");

      if (!number) return;

      onSearch(number);
    }
  };


  return (
    <nav>

      <div className="logo">
        <img src={`${import.meta.env.BASE_URL}logo.png`} alt="Logo" />
      </div>

        <input
        type="text"
        placeholder="🔍 Search Contact Number"
        className="search-box"
        value={searchNumber}
        onChange={(e) => setSearchNumber(e.target.value)}
        onKeyDown={handleSearch}
        inputMode="numeric"
      />

        <ul className="nav-links">
          <li onClick={onHome}>Home</li>
          <li onClick={onFollowUps}>Follow-up</li>
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