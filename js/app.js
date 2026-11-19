(function () {
  const root = document.getElementById("app");

  const state = {
    query: "",
    topicId: topics[0].id,
    activeId: null,
    view: "lectures",
    workbookId: null,
    sheetStatus: "idle",
  };

  const sheetCache = {};

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function currentTopic() {
    return topics.find((topic) => topic.id === state.topicId) ?? topics[0];
  }

  function findLecture(id) {
    for (const topic of topics) {
      const index = topic.lectures.findIndex((item) => item.id === id);
      if (index !== -1) return { topic, lecture: topic.lectures[index], index };
    }
    return null;
  }

  function renderBlock(block) {
    if (block.type === "h2") return `<h2>${escapeHtml(block.text)}</h2>`;
    if (block.type === "p") return `<p>${escapeHtml(block.text)}</p>`;
    if (block.type === "list") {
      return `<ul>${block.items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
    }
    if (block.type === "callout") {
      return `<div class="callout"><strong>${escapeHtml(block.title)}</strong>${escapeHtml(block.text)}</div>`;
    }
    if (block.type === "example") {
      return `<div class="example"><strong>${escapeHtml(block.label)}</strong><pre>${escapeHtml(block.prompt)}</pre></div>`;
    }
    if (block.type === "table") {
      const head = block.head
        ? `<thead><tr>${block.head.map((cell) => `<th>${escapeHtml(cell)}</th>`).join("")}</tr></thead>`
        : "";
      const rows = block.rows
        .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`)
        .join("");
      return `<div class="table-wrap"><table>${head}<tbody>${rows}</tbody></table></div>`;
    }
    return "";
  }

  function renderTabs(topic) {
    const tabs = topics
      .map(
        (item) => `
          <button
            class="${item.id === topic.id ? "tab is-active" : "tab"}"
            role="tab"
            aria-selected="${item.id === topic.id}"
            data-action="topic"
            data-id="${item.id}"
          >
            <span class="tab-num">${pad(item.number)}</span>
            <span class="tab-copy">
              <span class="tab-title">${escapeHtml(item.title)}</span>
              <span class="tab-sub">${escapeHtml(item.subtitle)}</span>
            </span>
          </button>
        `
      )
      .join("");

    return `
      <div class="tabs" role="tablist" aria-label="Теми">${tabs}</div>
      <div class="topic-now">
        <p class="topic-now-kicker">Тема ${pad(topic.number)}</p>
        <h2>${escapeHtml(topic.title)}</h2>
        <p>${escapeHtml(topic.subtitle)}</p>
      </div>`;
  }

  function renderToolbar(placeholder, label, count, switchLabel, switchMode) {
    return `
      <div class="toolbar">
        <input
          class="search"
          data-action="search"
          value="${escapeHtml(state.query)}"
          placeholder="${placeholder}"
          aria-label="${label}"
        />
        <div class="toolbar-side">
          <div class="count">${count}</div>
          <button class="switch" data-action="mode" data-mode="${switchMode}">${switchLabel}</button>
        </div>
      </div>`;
  }

  function renderHome(topic, filtered) {
    const cards =
      filtered.length === 0
        ? `<p class="empty">Няма съвпадение в тази тема. Пробвай друга дума или смени таба.</p>`
        : `<section class="grid">${filtered
            .map(
              (lecture) => `
                <button class="card" data-action="lecture" data-id="${lecture.id}">
                  <div class="card-top">
                    <span class="num">${pad(lecture.number)}</span>
                  </div>
                  <div>
                    <h2>${escapeHtml(lecture.title)}</h2>
                    <h3>${escapeHtml(lecture.subtitle)}</h3>
                  </div>
                  <p>${escapeHtml(lecture.teaser)}</p>
                  <div class="tags">
                    ${lecture.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}
                  </div>
                </button>
              `
            )
            .join("")}</section>`;

    return `
      <main class="wrap">
        <section class="hero">
          <h1>Лекциите, събрани като тетрадка.</h1>
          <p>${escapeHtml(course.tagline)}</p>
        </section>
        ${renderTabs(topic)}
        ${renderToolbar(
          "Търси подтема в избраната тема…",
          "Търсене в подтемите",
          filtered.length === 1 ? "1 подтема" : `${filtered.length} подтеми`,
          "Упражнения по темата →",
          "practice"
        )}
        ${cards}
      </main>
    `;
  }

  function renderLecture(active) {
    const prev = active.topic.lectures[active.index - 1];
    const next = active.topic.lectures[active.index + 1];
    const pager = `
      <nav class="pager" aria-label="Подтеми">
        ${
          prev
            ? `<button class="pager-link" data-action="lecture" data-id="${prev.id}"><span>← Предишна</span>${escapeHtml(prev.title)}</button>`
            : "<span></span>"
        }
        ${
          next
            ? `<button class="pager-link pager-next" data-action="lecture" data-id="${next.id}"><span>Следваща →</span>${escapeHtml(next.title)}</button>`
            : `<button class="pager-link pager-next" data-action="mode" data-mode="practice"><span>Към упражненията →</span>${escapeHtml(active.topic.title)}</button>`
        }
      </nav>`;

    return `
      <main class="wrap lecture">
        <button class="back" data-action="back" data-topic="${active.topic.id}">
          ← Към ${escapeHtml(active.topic.title)}
        </button>
        <article class="paper">
          <div class="paper-kicker">
            <span>Тема ${pad(active.topic.number)} · Подтема ${pad(active.lecture.number)}</span>
          </div>
          <h1>${escapeHtml(active.lecture.title)}</h1>
          <p class="lede">${escapeHtml(active.lecture.subtitle)}</p>
          ${active.lecture.content.map(renderBlock).join("")}
        </article>
        ${pager}
      </main>
    `;
  }

  function renderHeader() {
    const modes = [
      ["lectures", "Лекции"],
      ["practice", "Упражнения"],
      ["exam", "Изпит"],
    ]
      .map(
        ([id, label]) => `
          <button
            class="mode${state.view === id ? " is-active" : ""}"
            data-action="mode"
            data-mode="${id}"
            aria-pressed="${state.view === id}"
          >${label}</button>`
      )
      .join("");

    return `
      <header class="wrap topbar">
        <button class="brand" data-action="home">
          <span class="brand-kicker">${escapeHtml(course.subtitle)}</span>
          <span class="brand-name">${escapeHtml(course.title)}</span>
        </button>
        <nav class="modes" aria-label="Раздели">${modes}</nav>
        <div class="topbar-meta">${escapeHtml(course.instructor)}</div>
      </header>`;
  }

  function renderPracticeHome(topic, filtered) {
    const cards =
      filtered.length === 0
        ? `<p class="empty">Няма такова упражнение в тази тема. Пробвай друга дума.</p>`
        : `<section class="grid">${filtered
            .map(
              (book) => `
                <button class="card" data-action="workbook" data-id="${book.id}">
                  <div class="card-top">
                    <span class="num">${escapeHtml(book.code)}</span>
                    <span class="tag">С примерно решение</span>
                  </div>
                  <div>
                    <h2>${escapeHtml(book.title)}</h2>
                    <h3>${escapeHtml(book.subtitle)}</h3>
                  </div>
                  <p>${escapeHtml(book.teaser)}</p>
                </button>`
            )
            .join("")}</section>`;

    return `
      <main class="wrap">
        <section class="hero">
          <h1>${escapeHtml(practiceIntro.title)}</h1>
          <p>${escapeHtml(practiceIntro.tagline)}</p>
        </section>
        ${renderTabs(topic)}
        ${renderToolbar(
          "Търси упражнение в избраната тема…",
          "Търсене в упражненията",
          filtered.length === 1 ? "1 упражнение" : `${filtered.length} упражнения`,
          "← Лекциите по темата",
          "lectures"
        )}
        ${cards}
      </main>`;
  }

  function renderSheetBody(id) {
    const cached = sheetCache[id];
    if (!cached) {
      return `<p class="lede">${
        state.sheetStatus === "error"
          ? "Листът не се зареди. Презареди страницата и опитай пак."
          : "Зарежда се листът…"
      }</p>`;
    }
    const toc = cached.toc
      .map(
        (item) =>
          `<button class="toc-link toc-l${item.level}" data-action="jump" data-id="${item.id}">${escapeHtml(item.text)}</button>`
      )
      .join("");
    return `
      <div class="sheet-layout">
        <nav class="toc" aria-label="Съдържание на листа">${toc}</nav>
        <article class="paper sheet">${cached.html}</article>
      </div>`;
  }

  function loadSheet(id) {
    const text = sheets[id];
    if (!text) {
      state.sheetStatus = "error";
      return;
    }
    if (!sheetCache[id]) sheetCache[id] = renderMarkdown(text);
    state.sheetStatus = "ready";
  }

  function renderSheet() {
    const book = workbooks.find((item) => item.id === state.workbookId);
    const topic = topics.find((item) => item.id === book.topic);

    return `
      <main class="wrap lecture">
        <button class="back" data-action="practice-home">← Към упражненията: ${escapeHtml(topic.title)}</button>
        <p class="sheet-kicker">Тема ${pad(topic.number)} · Упражнение ${escapeHtml(book.code)}</p>
        ${renderSheetBody(book.id)}
      </main>`;
  }

  function renderExam() {
    loadSheet("exam");
    return `
      <main class="wrap">
        <section class="hero">
          <h1>${escapeHtml(examIntro.title)}</h1>
          <p>${escapeHtml(examIntro.tagline)}</p>
        </section>
        <div class="lecture">${renderSheetBody("exam")}</div>
      </main>`;
  }

  function openWorkbook(id) {
    const book = workbooks.find((item) => item.id === id);
    state.view = "practice";
    state.workbookId = id;
    state.activeId = null;
    if (book) state.topicId = book.topic;
    window.scrollTo(0, 0);
    loadSheet(id);
    render();
  }

  function matches(fields, q) {
    return fields.join(" ").toLowerCase().includes(q);
  }

  function render() {
    const searchEl = root.querySelector(".search");
    const hadSearchFocus = document.activeElement === searchEl;
    const selectionStart = hadSearchFocus ? searchEl.selectionStart : null;
    const selectionEnd = hadSearchFocus ? searchEl.selectionEnd : null;

    const q = state.query.trim().toLowerCase();
    const topic = currentTopic();
    let main = "";

    if (state.view === "exam") {
      main = renderExam();
    } else if (state.view === "practice") {
      if (state.workbookId) {
        main = renderSheet();
      } else {
        const inTopic = workbooks.filter((book) => book.topic === topic.id);
        const filtered = !q
          ? inTopic
          : inTopic.filter((book) => matches([book.title, book.subtitle, book.teaser, book.code], q));
        main = renderPracticeHome(topic, filtered);
      }
    } else {
      const active = state.activeId ? findLecture(state.activeId) : null;
      const filtered = !q
        ? topic.lectures
        : topic.lectures.filter((lecture) =>
            matches([lecture.title, lecture.subtitle, lecture.teaser, ...(lecture.tags || [])], q)
          );
      main = active ? renderLecture(active) : renderHome(topic, filtered);
    }

    root.innerHTML = `${renderHeader()}${main}`;

    if (hadSearchFocus) {
      const nextSearch = root.querySelector(".search");
      if (nextSearch) {
        nextSearch.focus();
        nextSearch.setSelectionRange(selectionStart, selectionEnd);
      }
    }
  }

  root.addEventListener("click", (event) => {
    const target = event.target.closest("[data-action]");
    if (!target || !root.contains(target)) return;

    const action = target.dataset.action;
    if (action === "home") {
      state.view = "lectures";
      state.activeId = null;
      state.workbookId = null;
      state.query = "";
      window.scrollTo(0, 0);
      render();
    } else if (action === "mode") {
      if (state.activeId) {
        const active = findLecture(state.activeId);
        if (active) state.topicId = active.topic.id;
      }
      state.view = target.dataset.mode;
      state.activeId = null;
      state.workbookId = null;
      state.query = "";
      window.scrollTo(0, 0);
      render();
    } else if (action === "topic") {
      state.topicId = target.dataset.id;
      state.query = "";
      state.activeId = null;
      render();
    } else if (action === "lecture") {
      state.activeId = target.dataset.id;
      window.scrollTo(0, 0);
      render();
    } else if (action === "back") {
      state.topicId = target.dataset.topic;
      state.activeId = null;
      window.scrollTo(0, 0);
      render();
    } else if (action === "workbook") {
      openWorkbook(target.dataset.id);
    } else if (action === "practice-home") {
      state.workbookId = null;
      state.query = "";
      window.scrollTo(0, 0);
      render();
    } else if (action === "jump") {
      const destination = document.getElementById(target.dataset.id);
      if (destination) destination.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });

  root.addEventListener("input", (event) => {
    if (event.target.matches("[data-action='search']")) {
      state.query = event.target.value;
      render();
    }
  });

  render();
})();
