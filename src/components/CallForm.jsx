import { useState, useEffect } from "react";
import { supabase } from "../services/supabase";


function CallForm({ onCallSaved,resetTrigger }) {
  const [formData, setFormData] = useState({
    customer_name: "",
    contact_no: "",
    email: "",
    location: "",
    status: "",
    remarks: "",
  }, [resetTrigger]);

  const [notification, setNotification] = useState("");

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
  e.preventDefault();

  // Get currently logged-in user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.error("No logged-in user found.");
    setNotification("Please login first.");
    return;
  }

 // Contact number validation
  if (!/^\d{10}$/.test(formData.contact_no)) {
    setNotification("Please enter a valid 10-digit contact number.");

    setTimeout(() => {
      setNotification("");
    }, 3000);

    return;
  }

    // Status validation
  if (!formData.status) {
    setNotification("Please select a call status.");

    setTimeout(() => {
      setNotification("");
    }, 3000);

    return;
  }

  const { data, error } = await supabase
    .from("calls")
    .insert([
      {
        ...formData,
        agent_id: user.id,
      },
    ])
    .select();

  if (error) {
    console.error("Supabase Error:", error);
    setNotification("Failed to save call.");
    return;
  }


  // Refresh dashboard
  if (onCallSaved) {
    onCallSaved();
  }

  setNotification("Call saved successfully!");

  setTimeout(() => {
    setNotification("");
  }, 3000);

  // Reset form
  setFormData({
    customer_name: "",
    contact_no: "",
    email: "",
    location: "",
    status: "",
    remarks: "",
  });
};

  return (
    <>
      {/* Notification */}
      {notification && (
        <div className="soft-notification">
          {notification}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          name="customer_name"
          placeholder="Customer Name"
          value={formData.customer_name}
          onChange={handleChange}
        />

        <input
          type="text"
          name="contact_no"
          placeholder="Contact Number"
          value={formData.contact_no}
          onChange={handleChange}
        />

        <input
          className="one-third"
          type="email"
          name="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleChange}
        />

        <input
          className="one-third"
          type="text"
          name="location"
          placeholder="Location"
          value={formData.location}
          onChange={handleChange}
        />

        <select
          className="one-third"
          name="status"
          value={formData.status}
          onChange={handleChange}
        >
          <option value="">Select Status</option>
          <option>Interested</option>
          <option>Not Interested</option>
          <option>Wrong Number</option>
          <option>Not Connected</option>
        </select>

        <textarea
          className="remarks-box"
          name="remarks"
          placeholder="Remarks"
          value={formData.remarks}
          onChange={handleChange}
        />

        <button type="submit" className="save-btn">
          Save
        </button>
      </form>
    </>
  );
}

export default CallForm;