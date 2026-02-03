document.addEventListener("DOMContentLoaded", () => {

  const form = document.getElementById("contactForm");
  if (!form) return;

  const submitBtn = form.querySelector(".btn-primary");
  const popup = document.getElementById("popup");

  const fields = [
    { id: "name", message: "This field is mandatory" },
    { id: "email", message: "Enter a valid email", validate: isValidEmail },
    { id: "message", message: "This field is mandatory" }
  ];

  /* ---------- BLUR VALIDATION ---------- */
  fields.forEach(f => {
    const input = document.getElementById(f.id);
    if (!input) return;

    input.addEventListener("blur", () => {
      if (!input.value.trim()) {
        showFieldError(f.id, f.message);
      }
    });

    input.addEventListener("input", () => {
      clearFieldError(f.id);
    });
  });

  /* ---------- SUBMIT ---------- */
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    let hasError = false;

    fields.forEach(f => {
      const input = document.getElementById(f.id);
      if (!input) return;

      const value = input.value.trim();

      if (!value || (f.validate && !f.validate(value))) {
        showFieldError(f.id, f.message);
        if (!hasError) input.focus();
        hasError = true;
      }
    });

    if (hasError) {
      showPopup("Please fix highlighted fields ❌", "#dc2626");
      return;
    }

    // ✅ REAL BACKEND CALL STARTS HERE
    setLoading(true);
    showPopup("Submitting…", "#d97706");

    try {
      const res = await fetch("http://127.0.0.1:5000/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: document.getElementById("name").value.trim(),
          email: document.getElementById("email").value.trim(),
          message: document.getElementById("message").value.trim()
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to send message");
      }

      showPopup("Message sent successfully ✔", "#16a34a");
      form.reset();

    } catch (error) {
      console.error(error);
      // Show actual error message if available, else generic
      showPopup(error.message || "Server error. Try again later ❌", "#dc2626");
    } finally {
      setLoading(false);
    }
  });

  /* ---------- HELPERS ---------- */

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function setLoading(isLoading) {
    if (!submitBtn) return;
    submitBtn.disabled = isLoading;
    submitBtn.textContent = isLoading ? "Sending…" : "Send Message 🚀";
    submitBtn.style.opacity = isLoading ? "0.7" : "1";
  }

  function showPopup(msg, color) {
    if (!popup) return;

    popup.textContent = msg;
    popup.style.color = color;
    popup.classList.remove("hidden");

    clearTimeout(popup.hideTimer);
    popup.hideTimer = setTimeout(() => {
      popup.classList.add("hidden");
    }, 3000);
  }

  function showFieldError(id, msg) {
    const field = document.getElementById(id)?.closest(".form-group");
    if (!field) return;

    field.classList.add("error");
    field.querySelector(".error-msg").textContent = msg;
  }

  function clearFieldError(id) {
    const field = document.getElementById(id)?.closest(".form-group");
    if (!field) return;

    field.classList.remove("error");
    field.querySelector(".error-msg").textContent = "";
  }

});
