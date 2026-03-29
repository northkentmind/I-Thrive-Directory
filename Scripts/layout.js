document.addEventListener("DOMContentLoaded", () => {
  fetch("header.html")
    .then(response => {
      if (!response.ok) throw new Error("Header not found");
      return response.text();
    })
    .then(html => {
      document.getElementById("site-header").innerHTML = html;
      // Initialize directory after header is loaded
      if (typeof initDirectory === 'function') {
        initDirectory();
      }
    })
    .catch(err => console.error("Header load error:", err));
});
