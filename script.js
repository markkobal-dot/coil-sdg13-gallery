
"use strict";

document.addEventListener("DOMContentLoaded", () => {
  initMobileMenu();
  initGalleryFilters();
  initQuiz();
});

/* ---------------------------------
   MOBILNA NAVIGACIJA
---------------------------------- */

function initMobileMenu() {
  const menuButton = document.getElementById("menu-toggle");
  const navigation = document.getElementById("main-nav");

  if (!menuButton || !navigation) return;

  function closeMenu() {
    navigation.classList.remove("open");
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.setAttribute("aria-label", "Odpri navigacijo");
  }

  menuButton.addEventListener("click", () => {
    const isOpen = navigation.classList.toggle("open");

    menuButton.setAttribute("aria-expanded", String(isOpen));
    menuButton.setAttribute(
      "aria-label",
      isOpen ? "Zapri navigacijo" : "Odpri navigacijo"
    );
  });

  navigation.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeMenu);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeMenu();
      menuButton.focus();
    }
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 700) {
      closeMenu();
    }
  });
}

/* ---------------------------------
   FILTRIRANJE GALERIJE
---------------------------------- */

function initGalleryFilters() {
  const filterButtons = document.querySelectorAll(".filter-button");
  const galleryCards = document.querySelectorAll(".gallery-card");
  const status = document.getElementById("gallery-status");

  if (!filterButtons.length || !galleryCards.length) return;

  function filterGallery(category) {
    let visibleCount = 0;

    galleryCards.forEach((card) => {
      const matches =
        category === "vse" || card.dataset.category === category;

      card.hidden = !matches;

      if (matches) {
        visibleCount++;
      }
    });

    filterButtons.forEach((button) => {
      const isActive = button.dataset.filter === category;

      button.classList.toggle("active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });

    if (status) {
      status.textContent = `Prikazanih fotografij: ${visibleCount}.`;
    }
  }

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      filterGallery(button.dataset.filter);
    });
  });

  filterGallery("vse");
}

/* ---------------------------------
   KVIZ
---------------------------------- */

function initQuiz() {
  const form = document.getElementById("quiz-form");
  const result = document.getElementById("quiz-result");

  if (!form || !result) return;

  const correctAnswers = {
    q1: "a",
    q2: "b",
    q3: "a"
  };

  const explanations = {
    q1: "Današnje globalno segrevanje je predvsem posledica človekovih dejavnosti, ki povečujejo količino toplogrednih plinov.",
    q2: "Hoja in kolesarjenje sta za primerne razdalje možnosti prevoza z zelo majhnimi neposrednimi izpusti.",
    q3: "Trinajsti cilj trajnostnega razvoja je namenjen podnebnim ukrepom."
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!form.reportValidity()) {
      result.textContent = "Odgovori na vsa vprašanja in nato ponovno preveri kviz.";
      result.classList.add("error");
      return;
    }

    const formData = new FormData(form);
    let score = 0;
    const feedback = [];

    Object.entries(correctAnswers).forEach(([question, answer]) => {
      if (formData.get(question) === answer) {
        score++;
      } else {
        feedback.push(explanations[question]);
      }
    });

    result.classList.remove("error");

    let message = `Dosegel/-la si ${score} od 3 točk. `;

    if (score === 3) {
      message += "Odlično! Vsi odgovori so pravilni.";
    } else if (score === 2) {
      message += "Dobro opravljeno! Preberi še spodnjo razlago.";
    } else {
      message += "Ni problema — s ponovitvijo se lahko naučiš še več.";
    }

    if (feedback.length > 0) {
      message += "\n\nZa ponovitev:\n" + feedback.join("\n\n");
    }

    result.textContent = message;
  });
}
