document.addEventListener("DOMContentLoaded", () => {
  console.log("Minebox homepage loaded ✅");

  // Select all cards
  const cards = document.querySelectorAll(".card");

  cards.forEach(card => {
    card.addEventListener("click", () => {
      // Get target link from data attribute
      const targetPage = card.dataset.link;

      if (targetPage) {
        console.log(`Opening ${targetPage}...`);
        window.location.href = targetPage; // Navigate
      }
    });
  });
});
