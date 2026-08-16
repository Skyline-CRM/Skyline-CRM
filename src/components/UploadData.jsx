import { useEffect, useState } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { supabase } from "../services/supabase";

function UploadData() {
  const [file, setFile] = useState(null);
  const [totalEntries, setTotalEntries] = useState(0);
  const [skippedEntries, setSkippedEntries] = useState(0);
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [agents, setAgents] = useState([]);
  const [assignments, setAssignments] = useState({});
  const [uploadedData, setUploadedData] = useState([]);


  // =====================================================
  // FETCH AGENTS
  // =====================================================

  useEffect(() => {
    fetchAgents();
  }, []);


  const fetchAgents = async () => {
    console.log("Fetching agents...");

    const {
      data,
      error,
    } = await supabase
      .from("profiles")
      .select(
        "user_id, name, role, approval_status"
      )
      .order("name", {
        ascending: true,
      });


    if (error) {
      console.error(
        "Error fetching profiles:",
        error
      );

      setMessage(
        "Unable to load agents."
      );

      return;
    }


    console.log(
      "All profiles:",
      data
    );


    // Only approved agents
    const agentProfiles =
      (data || []).filter(
        (profile) =>
          profile.role === "agent" &&
          profile.approval_status ===
            "approved"
      );


    console.log(
      "Approved agents:",
      agentProfiles
    );


    setAgents(
      agentProfiles
    );
  };


  // =====================================================
  // NORMALIZE COLUMN
  // =====================================================

  const normalizeKey = (key) => {
    return String(key || "")
      .toLowerCase()
      .trim()
      .replace(/[\s_-]+/g, "");
  };


  // =====================================================
  // FIND CUSTOMER NAME
  // =====================================================

  const findCustomerName = (row) => {

    const keys =
      Object.keys(row);


    const possibleKeys = [
      "customername",
      "customer",
      "name",
      "customerfullname",
      "fullname",
      "clientname",
      "client",
      "leadname",
      "lead",
    ];


    for (
      const key of keys
    ) {

      const normalized =
        normalizeKey(key);


      if (
        possibleKeys.includes(
          normalized
        )
      ) {

        const value =
          String(
            row[key] || ""
          ).trim();


        if (value) {
          return value;
        }
      }
    }


    return "";
  };


  // =====================================================
  // FIND CONTACT NUMBER
  // =====================================================

  const findContactNumber = (
    row
  ) => {

    const keys =
      Object.keys(row);


    const possibleKeys = [
      "contactno",
      "contactnumber",
      "contact",
      "mobileno",
      "mobilenumber",
      "mobile",
      "phone",
      "phonenumber",
      "phoneno",
      "number",
      "contactmobile",
      "leadnumber",
    ];


    for (
      const key of keys
    ) {

      const normalized =
        normalizeKey(key);


      if (
        possibleKeys.includes(
          normalized
        )
      ) {

        const value =
          String(
            row[key] || ""
          ).trim();


        if (value) {
          return value;
        }
      }
    }


    return "";
  };


  // =====================================================
  // PROCESS DATA
  // =====================================================

  const processUploadedData = (
    rows
  ) => {

    if (
      !rows ||
      rows.length === 0
    ) {

      setMessage(
        "No data found in this file."
      );

      setTotalEntries(0);

      setSkippedEntries(0);

      return;
    }


    let skipped = 0;


    const formattedData =
      rows
        .map((row) => {

          const customerName =
            findCustomerName(
              row
            );


          const contactNo =
            findContactNumber(
              row
            );


          // Name OR number missing
          // = skip this entry

          if (
            !customerName ||
            !contactNo
          ) {

            skipped++;

            return null;
          }


          return {

            customer_name:
              customerName,

            contact_no:
              contactNo,

            email: null,

            location: null,

            status: null,

            remarks: null,

            budget: null,

            preferred_location:
              null,

            preference: null,

            agent_id: null,
          };
        })
        .filter(Boolean);


    console.log(
      "Valid calls:",
      formattedData
    );


    console.log(
      "Skipped:",
      skipped
    );


    setUploadedData(formattedData);
    setTotalEntries(
      formattedData.length
    );


    setSkippedEntries(
      skipped
    );


    setAssignments({});


    if (
      formattedData.length === 0
    ) {

      setMessage(
        "No valid entries found. Customer Name and Contact Number are required."
      );

      return;
    }


    setMessage(
      `✅ ${formattedData.length} valid calls found. ${skipped} entries skipped because Customer Name or Contact Number was missing.`
    );
  };


  // =====================================================
  // FILE CHANGE
  // =====================================================

  const handleFileChange = (
    e
  ) => {

    const selectedFile =
      e.target.files[0];


    if (!selectedFile) {
      return;
    }


    setFile(
      selectedFile
    );

    setMessage("");
    setTotalEntries(0);
    setSkippedEntries(0);
    setAssignments({});


    const fileName =
      selectedFile.name.toLowerCase();


    // =====================================================
    // CSV
    // =====================================================

    if (
      fileName.endsWith(
        ".csv"
      )
    ) {

      Papa.parse(
        selectedFile,
        {
          header: true,

          skipEmptyLines: true,

          complete: (
            results
          ) => {

            console.log(
              "CSV rows:",
              results.data
            );

            processUploadedData(
              results.data
            );
          },

          error: (
            error
          ) => {

            console.error(
              "CSV error:",
              error
            );

            setMessage(
              "Failed to read CSV file."
            );
          },
        }
      );

      return;
    }


    // =====================================================
    // EXCEL
    // =====================================================

    if (
      fileName.endsWith(
        ".xlsx"
      ) ||
      fileName.endsWith(
        ".xls"
      )
    ) {

      const reader =
        new FileReader();


      reader.onload = (
        event
      ) => {

        try {

          const data =
            new Uint8Array(
              event.target.result
            );


          const workbook =
            XLSX.read(
              data,
              {
                type: "array",
              }
            );


          const firstSheet =
            workbook.Sheets[
              workbook.SheetNames[0]
            ];


          const jsonData =
            XLSX.utils.sheet_to_json(
              firstSheet,
              {
                defval: "",
              }
            );


          console.log(
            "Excel rows:",
            jsonData
          );


          processUploadedData(
            jsonData
          );

        } catch (
          error
        ) {

          console.error(
            "Excel error:",
            error
          );

          setMessage(
            "Failed to read Excel file."
          );
        }
      };


      reader.readAsArrayBuffer(
        selectedFile
      );

      return;
    }


    setMessage(
      "Please upload CSV, XLSX or XLS file."
    );
  };


  // =====================================================
  // ASSIGNED COUNT
  // =====================================================

  const assignedCount =
    Object.values(
      assignments
    ).reduce(
      (
        total,
        value
      ) =>
        total +
        (Number(value) || 0),
      0
    );


  const remainingCalls =
    Math.max(
      0,
      totalEntries -
        assignedCount
    );


  // =====================================================
  // CHANGE ASSIGNMENT
  // =====================================================

  const handleAssignmentChange = (
    agentId,
    value
  ) => {

    let count =
      parseInt(
        value,
        10
      );


    if (
      isNaN(count) ||
      count < 0
    ) {
      count = 0;
    }


    // Calls already assigned
    // to other agents

    const otherAssigned =
      Object.entries(
        assignments
      )
        .filter(
          ([id]) =>
            id !== agentId
        )
        .reduce(
          (
            total,
            [, value]
          ) =>
            total +
            (Number(value) || 0),
          0
        );


    const maximum =
      Math.max(
        0,
        totalEntries -
          otherAssigned
      );


    if (
      count > maximum
    ) {
      count =
        maximum;
    }


    setAssignments(
      (prev) => ({
        ...prev,

        [agentId]:
          count,
      })
    );
  };


  // =====================================================
  // UPLOAD + ASSIGN
  // =====================================================

  const uploadAndAssignCalls =
    async () => {

      if (
        assignedCount ===
        0
      ) {

        setMessage(
          "Please assign calls to at least one agent."
        );

        return;
      }


      setUploading(true);

      setMessage("");


      try {

        let currentIndex = 0;

        let uploadedTotal = 0;


        // =================================================
        // ASSIGN AGENT BY AGENT
        // =================================================

        for (
          const agent of agents
        ) {

          const count =
            Number(
              assignments[
                agent.user_id
              ]
            ) || 0;


          if (
            count <= 0
          ) {
            continue;
          }


          const agentCalls =
            uploadedData
              .slice(
                currentIndex,
                currentIndex +
                  count
              )
              .map(
                (call) => ({
                  customer_name:
                    call.customer_name,

                  contact_no:
                    call.contact_no,

                  email: null,

                  location: null,

                  status: null,

                  remarks: null,

                  budget: null,

                  preferred_location:
                    null,

                  preference: null,

                  agent_id:
                    agent.user_id,
                })
              );


          if (
            agentCalls.length ===
            0
          ) {
            continue;
          }


          console.log(
            `Uploading ${agentCalls.length} calls to ${agent.name}`
          );


          const {
            data,
            error,
          } =
            await supabase
              .from("calls")
              .insert(
                agentCalls
              )
              .select();


          if (error) {

            console.error(
              "Supabase upload error:",
              error
            );

            throw error;
          }


          uploadedTotal +=
            data.length;


          currentIndex +=
            agentCalls.length;
        }


        // =================================================
        // UNASSIGNED CALLS
        // =================================================

        const remainingData =
          uploadedData.slice(
            currentIndex
          );


        if (
          remainingData.length >
          0
        ) {

          const unassignedCalls =
            remainingData.map(
              (call) => ({
                customer_name:
                  call.customer_name,

                contact_no:
                  call.contact_no,

                email: null,

                location: null,

                status: null,

                remarks: null,

                budget: null,

                preferred_location:
                  null,

                preference: null,

                agent_id: null,
              })
            );


          const {
            data,
            error,
          } =
            await supabase
              .from("calls")
              .insert(
                unassignedCalls
              )
              .select();


          if (error) {
            throw error;
          }


          uploadedTotal +=
            data.length;
        }


        // =================================================
        // SUCCESS
        // =================================================

        setMessage(
          `🎉 ${uploadedTotal} calls uploaded successfully. ${assignedCount} assigned and ${remainingData.length} left unassigned.`
        );


        setFile(null);
        setTotalEntries(0);
        setSkippedEntries(0);
        setAssignments({});
        setUploadedData([]);


      } catch (
        error
      ) {

        console.error(
          "Upload failed:",
          error
        );


        setMessage(
          `❌ Upload failed: ${error.message}`
        );

      } finally {

        setUploading(false);
      }
    };


  // =====================================================
  // UI
  // =====================================================

  return (

    <div className="upload-data-page">


      {/* HEADER */}

      <div className="manager-page-header">

        <div>

          <h1>
            Upload Call Data
          </h1>

          <p>
            Upload CSV or Excel data
            and assign calls to agents.
          </p>

        </div>

      </div>


      {/* =================================================
          UPLOAD BOX
      ================================================= */}

      <div className="upload-card">

        <div className="upload-icon">
          📤
        </div>


        <h2>
          Upload File
        </h2>


        <p>
          CSV, XLSX or XLS supported
        </p>


        <input
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={
            handleFileChange
          }
        />


        {file && (

          <div className="selected-file">

            📄{" "}

            <strong>
              {file.name}
            </strong>

          </div>

        )}


        {message && (

          <div className="upload-message">

            {message}

          </div>

        )}

      </div>


      {/* =================================================
          SUMMARY
      ================================================= */}

      {totalEntries > 0 && (

        <div className="upload-summary">

          <div>
            <span>
              Valid Calls
            </span>

            <strong>
              {totalEntries}
            </strong>
          </div>


          <div>
            <span>
              Skipped
            </span>

            <strong>
              {skippedEntries}
            </strong>
          </div>


          <div>
            <span>
              Assigned
            </span>

            <strong>
              {assignedCount}
            </strong>
          </div>


          <div>
            <span>
              Remaining
            </span>

            <strong>
              {remainingCalls}
            </strong>
          </div>

        </div>

      )}


      {/* =================================================
          ASSIGNMENT SECTION
      ================================================= */}

      {totalEntries > 0 && (

        <div className="agent-assignment-card">

          <div className="assignment-header">

            <div>

              <h2>
                Assign Calls to Agents
              </h2>

              <p>
                Choose how many calls
                each agent should receive.
              </p>

            </div>


            <div className="assignment-counter">

              <span>
                Remaining
              </span>

              <strong>
                {remainingCalls}
              </strong>

            </div>

          </div>


          {/* =================================================
              NO AGENTS
          ================================================= */}

          {agents.length === 0 ? (

            <div className="no-agents">

              <strong>
                ⚠️ No approved agents found
              </strong>

              <p>
                Check the browser console
                for the profiles returned
                from Supabase.
              </p>

              <button
                type="button"
                onClick={
                  fetchAgents
                }
              >
                🔄 Refresh Agents
              </button>

            </div>

          ) : (

            <div className="agent-assignment-list">

              {agents.map(
                (agent) => {

                  const assigned =
                    Number(
                      assignments[
                        agent.user_id
                      ]
                    ) || 0;


                  return (

                    <div
                      className="agent-assignment-row"
                      key={
                        agent.user_id
                      }
                    >

                      {/* AGENT */}

                      <div className="agent-details">

                        <div className="agent-avatar">

                          {(
                            agent.name ||
                            "A"
                          )
                            .charAt(0)
                            .toUpperCase()}

                        </div>


                        <div>

                          <strong>
                            {agent.name ||
                              "Unnamed Agent"}
                          </strong>

                          <span>
                            Agent
                          </span>

                        </div>

                      </div>


                      {/* CALL INPUT */}

                      <div className="agent-call-input">

                        <label>
                          Calls
                        </label>

                        <input
                          type="number"
                          min="0"
                          value={
                            assignments[
                              agent.user_id
                            ] ?? ""
                          }
                          placeholder="0"
                          onChange={(
                            e
                          ) =>
                            handleAssignmentChange(
                              agent.user_id,
                              e.target.value
                            )
                          }
                        />

                      </div>


                      {/* STATUS */}

                      <div className="agent-assigned-count">

                        {assigned >
                        0
                          ? `✓ ${assigned} calls`
                          : "Not assigned"}

                      </div>

                    </div>

                  );
                }
              )}

            </div>

          )}


          {/* =================================================
              FOOTER
          ================================================= */}

          {agents.length > 0 && (

            <div className="assignment-footer">

              <div>

                <span>
                  Total
                </span>

                <strong>
                  {totalEntries}
                </strong>

              </div>


              <div>

                <span>
                  Assigned
                </span>

                <strong>
                  {assignedCount}
                </strong>

              </div>


              <div>

                <span>
                  Remaining
                </span>

                <strong>
                  {remainingCalls}
                </strong>

              </div>


              <button
                type="button"
                className="upload-submit-btn"
                onClick={
                  uploadAndAssignCalls
                }
                disabled={
                  uploading ||
                  assignedCount === 0
                }
              >

                {uploading
                  ? "Uploading..."
                  : `Upload & Assign ${assignedCount} Calls`}

              </button>

            </div>

          )}

        </div>

      )}

    </div>
  );
}

export default UploadData;