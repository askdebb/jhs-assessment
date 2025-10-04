document.addEventListener('DOMContentLoaded', () => {
  // Ensure script is running
  console.log('Script is running');

  const targetDate = new Date('October 5,2025 23:59:59').getTime();
  console.log('Target date:', targetDate); // Log target date

  const countdownElements = document.querySelectorAll('.countdown');

  setInterval(() => {
    const now = new Date().getTime();
    const timeDifference = targetDate - now;

    let formatted;
    if (timeDifference < 0) {
      formatted = 'Countdown Complete!';
      clearInterval(countdownInterval);
      window.location.href =
        'https://askdebb.github.io/jhs-assessment/deadline.html';
    } else {
      const days = Math.floor(timeDifference / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (timeDifference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
      );
      const minutes = Math.floor(
        (timeDifference % (1000 * 60 * 60)) / (1000 * 60),
      );
      const seconds = Math.floor((timeDifference % (1000 * 60)) / 1000);
      formatted = `${days}d ${hours}h ${minutes}m ${seconds}s`;
    }

    countdownElements.forEach((el) => (el.textContent = formatted));
  }, 1000);
});
