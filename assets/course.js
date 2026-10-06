(function () {
  "use strict";

  const themeKey = "rp2350-course-theme";
  const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");

  function savedTheme() {
    try {
      const value = window.localStorage.getItem(themeKey);
      return value === "light" || value === "dark" ? value : null;
    } catch (_) {
      return null;
    }
  }

  function currentTheme() {
    return savedTheme() || (systemTheme.matches ? "dark" : "light");
  }

  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  }

  function updateThemeControls() {
    const dark = document.documentElement.dataset.theme === "dark";
    document.querySelectorAll("[data-theme-toggle]").forEach(function (button) {
      button.setAttribute("aria-pressed", String(dark));
      const label = button.querySelector("[data-theme-label]");
      const icon = button.querySelector("[data-theme-icon]");
      if (label) label.textContent = dark ? "Use light mode" : "Use dark mode";
      if (icon) icon.textContent = dark ? "☀" : "☾";
    });
  }

  function toggleTheme() {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    try {
      window.localStorage.setItem(themeKey, next);
    } catch (_) {
      // The selected theme still applies for this page when storage is unavailable.
    }
    applyTheme(next);
    updateThemeControls();
  }

  function checkQuiz(form) {
    let answered = 0;
    let correct = 0;
    const questions = form.querySelectorAll("[data-question]");

    questions.forEach(function (question) {
      const selected = question.querySelector("input[type='radio']:checked");
      const feedback = question.querySelector("[data-feedback]");
      const explanation = question.querySelector("[data-explanation]");
      question.classList.remove("is-correct", "is-incorrect", "is-unanswered");

      if (!selected) {
        question.classList.add("is-unanswered");
        if (feedback) feedback.textContent = "Choose an answer before checking this question.";
        if (explanation) explanation.hidden = true;
        return;
      }

      answered += 1;
      const isCorrect = selected.value === question.dataset.answer;
      if (isCorrect) {
        correct += 1;
        question.classList.add("is-correct");
        if (feedback) feedback.textContent = "Correct.";
      } else {
        question.classList.add("is-incorrect");
        if (feedback) feedback.textContent = "Not yet. Read the explanation, then explain the mechanism aloud.";
      }
      if (explanation) explanation.hidden = false;
    });

    const result = form.querySelector("[data-quiz-result]");
    if (result) {
      result.textContent = answered === questions.length
        ? "Score: " + correct + "/" + questions.length + ". Record this before retrying."
        : "Answered " + answered + "/" + questions.length + ". Complete every question for a baseline score.";
      result.focus();
    }
  }

  applyTheme(currentTheme());

  document.addEventListener("DOMContentLoaded", function () {
    updateThemeControls();

    document.querySelectorAll("[data-theme-toggle]").forEach(function (button) {
      button.addEventListener("click", toggleTheme);
    });

    document.querySelectorAll("[data-quiz]").forEach(function (form) {
      form.addEventListener("submit", function (event) {
        event.preventDefault();
        checkQuiz(form);
      });
    });
  });

  systemTheme.addEventListener("change", function () {
    if (!savedTheme()) {
      applyTheme(currentTheme());
      updateThemeControls();
    }
  });
}());
