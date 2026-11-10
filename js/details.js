<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>SkillSwap — Your details</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;600;700&family=Fraunces:opsz,wght@9..144,500;9..144,700&display=swap"
      rel="stylesheet"
    />
    <link rel="stylesheet" href="css/styles.css" />
  </head>
  <body>
    <div class="page">
      <nav class="nav">
        <a class="brand" href="home.html"><span class="mark">S</span> SkillSwap</a>
        <div class="nav-links">
          <button class="ghost" id="logoutBtn" type="button">Log out</button>
        </div>
      </nav>
      <main class="wrap">
        <p class="eyebrow">Step 2 · Profile</p>
        <h1 class="page-title">Tell campus who you are.</h1>
        <p class="sub">
          Add what you want to learn and what you can teach. Matching uses this
          later — for now it stays on your device.
        </p>

        <form id="detailsForm" class="card" style="margin-top: 28px">
          <div class="grid-2">
            <label>
              Name
              <input type="text" name="name" id="nameInput" required />
            </label>
            <label>
              Semester
              <select name="semester" id="semesterInput" required>
                <option value="">Select</option>
                <option>1</option>
                <option>2</option>
                <option>3</option>
                <option>4</option>
                <option>5</option>
                <option>6</option>
                <option>7</option>
                <option>8</option>
              </select>
            </label>
            <label>
              Branch
              <select name="branch" id="branchInput" required>
                <option value="">Select</option>
                <option>CSE</option>
                <option>IT</option>
                <option>ECE</option>
                <option>EEE</option>
                <option>Mechanical</option>
                <option>Civil</option>
                <option>AI/ML</option>
                <option>Biotechnology</option>
                <option>Other</option>
              </select>
            </label>
          </div>

          <div class="skill-builder" style="margin-top: 8px">
            <strong>Skills you want to learn</strong>
            <div class="row">
              <input list="skillList" id="learnInput" placeholder="e.g. Guitar" />
              <button class="btn-outline" id="addLearn" type="button">Add</button>
            </div>
            <div class="chips" id="learnChips"></div>
          </div>

          <div class="skill-builder">
            <strong>Skills you can impart</strong>
            <div class="row">
              <input list="skillList" id="teachInput" placeholder="e.g. Python" />
              <select id="levelInput">
                <option>Beginner</option>
                <option selected>Intermediate</option>
                <option>Advanced</option>
                <option>Expert</option>
              </select>
              <button class="btn-outline" id="addTeach" type="button">Add</button>
            </div>
            <div class="chips" id="teachChips"></div>
          </div>

          <datalist id="skillList"></datalist>
          <p class="note" id="detailsNote"></p>
          <button class="btn" type="submit">Submit profile</button>
        </form>

        <section class="card" id="deleteZone" style="margin-top: 28px; border-color: #c0392b">
          <h2 style="margin:0 0 8px;font-family:var(--font-display)">Delete account</h2>
          <p class="muted">
            This permanently removes your profile, connections and messages. It cannot be undone.
          </p>
          <label>
            Confirm with your password
            <input type="password" id="deletePassword" autocomplete="current-password" />
          </label>
          <p class="note" id="deleteNote"></p>
          <button class="btn-outline" id="deleteBtn" type="button" style="color:#c0392b;border-color:#c0392b">
            Delete my account
          </button>
        </section>
      </main>
    </div>
    <script src="js/app.js"></script>
    <script src="js/details.js"></script>
  </body>
</html>