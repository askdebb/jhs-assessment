
document.addEventListener("DOMContentLoaded", () => {
    // Set the target date and time
    console.log('script running');
    
    const targetDate = new Date("November 25, 2024 23:59:59").getTime();
  
    console.log(targetDate);
    
    // Update the countdown every second
    const countdownInterval = setInterval(() => {
      const now = new Date().getTime();
      const timeDifference = targetDate - now;
  
    //   Calculate days, hours, minutes, and seconds
      const days = Math.floor(timeDifference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((timeDifference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((timeDifference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeDifference % (1000 * 60)) / 1000);
  

      
  
      // Display the countdown
      const countdownElement = document.getElementById("countdown");
      if (countdownElement) {
        countdownElement.textContent = `${days}d ${hours}h ${minutes}m ${seconds}s`;
      }
  
      // Stop the countdown when the target date is reached
      if (timeDifference < 0) {
        clearInterval(countdownInterval);
        countdownElement.textContent = "Happy New Year!";
      }
    }, 1000);
  });