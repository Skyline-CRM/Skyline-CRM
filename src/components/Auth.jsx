import { useState } from "react";
import { supabase } from "../services/supabase";

function Auth({ onClose }) {
  const [isSignup, setIsSignup] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
  e.preventDefault();

  setMessage("");
  setError("");

  // SIGN UP
  if (isSignup) {
    if (!name || !email || !password) {
      setError("Please fill all fields.");
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          name: name,
          role: "agent",
        },
      },
    });

    if (error) {
      setError(error.message);
      return;
    }

    console.log("Signup successful:", data);

    setMessage(
      "Account created successfully. Please check your email to verify your account."
    );

    setName("");
    setEmail("");
    setPassword("");

    return;
  }

  // LOGIN
  if (!email || !password) {
    setError("Please enter email and password.");
    return;
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email,
    password: password,
  });

  if (error) {
    setError(error.message);
    return;
  }

console.log("Login successful:", data);

setMessage("Login successful!");

setEmail("");
setPassword("");

onClose();
};

  return (
    <div className="auth-overlay">

      <div className="auth-card">

        <h2>
          {isSignup ? "Create Account" : "Welcome Back"}
        </h2>

        <p className="auth-subtitle">
          {isSignup
            ? "Create your Skyline CRM account"
            : "Sign in to your Skyline CRM account"}
        </p>

        <form onSubmit={handleSubmit}>

          {isSignup && (
            <input
              type="text"
              placeholder="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          )}

          <input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            type="submit"
            className="auth-submit"
          >
            {isSignup ? "Create Account" : "Login"}
          </button>

        </form>

        {message && (
          <div className="auth-success">
            {message}
          </div>
        )}

        {error && (
          <div className="auth-error">
            {error}
          </div>
        )}

        <div className="auth-switch">

          {isSignup
            ? "Already have an account?"
            : "Don't have an account?"}

          <button
            type="button"
            onClick={() => {
              setIsSignup(!isSignup);
              setMessage("");
              setError("");
            }}
          >
            {isSignup ? " Login" : " Sign Up"}
          </button>

        </div>

      </div>

    </div>
  );
}

export default Auth;