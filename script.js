
function filterPhotos(kategorija) {
  const fotografije = document.querySelectorAll(".galerija figure");

  fotografije.forEach(function (fotografija) {
    const ustreza =
      kategorija === "vse" ||
      fotografija.dataset.category === kategorija;

    fotografija.style.display = ustreza ? "block" : "none";
  });
}

function preveriKviz() {
  const odgovor = document.querySelector(
    'input[name="odgovor"]:checked'
  );

  const rezultat = document.getElementById("rezultat");

  if (!odgovor) {
    rezultat.textContent = "Najprej izberi odgovor.";
    return;
  }

  if (odgovor.value === "b") {
    rezultat.textContent = "Pravilno! Odlično opravljeno.";
  } else {
    rezultat.textContent = "Poskusi znova. Razmisli o SDG 12.";
  }
}
