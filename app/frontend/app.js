async function api(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(errorText(body) || `Request failed (${response.status})`);
  }
  return body;
}

function errorText(body) {
  if (!body || !body.detail) return "";
  // Validation errors are returned as a list.
  return Array.isArray(body.detail)
    ? body.detail.map((d) => `${d.loc.at(-1)}: ${d.msg}`).join(", ")
    : body.detail;
}

function showMessage(text, isError = false) {
  const message = document.getElementById("message");
  message.textContent = text;
  message.className = isError ? "error" : "success";
  message.hidden = false;
  clearTimeout(showMessage.timer);
  showMessage.timer = setTimeout(() => (message.hidden = true), 4000);
}

// Empty form fields are sent as null.
function formToJson(form) {
  const data = {};
  for (const [key, value] of new FormData(form)) {
    data[key] = value.trim() === "" ? null : value.trim();
  }
  return data;
}

// textContent is used instead of innerHTML to prevent HTML injection.
function fillTable(tbodyId, rows, emptyText) {
  const tbody = document.getElementById(tbodyId);
  tbody.replaceChildren();
  if (rows.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 5;
    cell.className = "empty";
    cell.textContent = emptyText;
    row.append(cell);
    tbody.append(row);
    return;
  }
  for (const values of rows) {
    const row = document.createElement("tr");
    for (const value of values) {
      const cell = document.createElement("td");
      cell.textContent = value ?? "—";
      row.append(cell);
    }
    tbody.append(row);
  }
}

async function loadPatients() {
  const patients = await api("/patients");
  fillTable(
    "patients",
    patients.map((p) => [p.id, p.full_name, p.email, p.phone, p.date_of_birth]),
    "No patients yet."
  );

  const select = document.querySelector("#appointment-form select[name=patient_id]");
  const selected = select.value;
  select.replaceChildren();
  if (patients.length === 0) {
    select.append(new Option("Add a patient first", ""));
  }
  for (const p of patients) {
    select.append(new Option(`${p.full_name} (#${p.id})`, p.id));
  }
  if (selected) select.value = selected;
}

async function loadAppointments() {
  const appointments = await api("/appointments");
  fillTable(
    "appointments",
    appointments.map((a) => [
      new Date(a.appointment_time).toLocaleString(),
      a.patient_name,
      a.doctor,
      a.reason,
      a.status,
    ]),
    "No appointments yet."
  );
}

async function loadStatus() {
  const version = document.getElementById("version");
  const status = document.getElementById("status");
  try {
    version.textContent = `v${(await api("/version")).version}`;
  } catch {
    version.textContent = "unavailable";
  }
  try {
    await api("/ready");
    status.textContent = "Database connected";
    status.className = "status ok";
  } catch {
    status.textContent = "Database unavailable";
    status.className = "status down";
  }
}

async function refresh() {
  await loadStatus();
  try {
    await Promise.all([loadPatients(), loadAppointments()]);
  } catch (error) {
    showMessage(`Could not load data: ${error.message}`, true);
  }
}

document.getElementById("patient-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.target;
  try {
    const patient = await api("/patients", {
      method: "POST",
      body: JSON.stringify(formToJson(form)),
    });
    form.reset();
    showMessage(`Patient ${patient.full_name} added.`);
    await refresh();
  } catch (error) {
    showMessage(error.message, true);
  }
});

document.getElementById("appointment-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.target;
  const data = formToJson(form);
  data.patient_id = Number(data.patient_id);
  try {
    await api("/appointments", { method: "POST", body: JSON.stringify(data) });
    form.reset();
    showMessage("Appointment booked.");
    await refresh();
  } catch (error) {
    showMessage(error.message, true);
  }
});

refresh();
