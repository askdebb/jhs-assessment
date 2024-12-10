// document.addEventListener("DOMContentLoaded", () => {
//   // console.log("Script is running");

//   const targetDate = new Date("November 25, 2024 23:59:59").getTime();
//   // console.log("Target date:", targetDate);

//   const countdownElement = document.getElementById("count-down");


//   if (!countdownElement) console.error("Countdown element not found");



//     // Remove start button and show countdown
//     //startButton.classList.add("hidden");
//     // countdownElement.classList.remove("hidden");

//     // Begin the countdown
//     const countdownInterval = setInterval(() => {
//       const now = new Date().getTime();
//       const timeDifference = targetDate - now;
//       console.log("time difference: ", timeDifference);
      

//       if (timeDifference < 0) {
//         clearInterval(countdownInterval);
//         // countdownElement.textContent = "Happy New Year!";

//       //  window.location.href = "../deadline.html";
      
   
//         return;
//       }

//       const days = Math.floor(timeDifference / (1000 * 60 * 60 * 24));
//       const hours = Math.floor((timeDifference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
//       const minutes = Math.floor((timeDifference % (1000 * 60)) / (1000 * 60));
//       const seconds = Math.floor((timeDifference % (1000)) / 1000);
  
//       countdownElement.textContent = `${days}d ${hours}h ${minutes}m ${seconds}s`;

//     }, 1000);

    

  
// });

document.addEventListener("DOMContentLoaded", () => {
  // Ensure script is running
  console.log("Script is running");

  const targetDate = new Date("Decembe 10, 2024 23:59:59").getTime();
  console.log("Target date:", targetDate); // Log target date

  const countdownElement = document.getElementById("count-down");
  
  // Ensure countdown element is present
  if (!countdownElement) {
    console.error("Countdown element not found");
    return; // Exit if the element is missing
  }
  console.log("Countdown element found");

  // Begin the countdown
  const countdownInterval = setInterval(() => {
    const now = new Date().getTime();
    const timeDifference = targetDate - now;

    // console.log("Time difference:", timeDifference); // Log time difference
    
    if (timeDifference < 0) {
      // If the countdown is complete
      clearInterval(countdownInterval);
      console.log("Countdown completed");
      countdownElement.textContent = "Countdown Complete!";
      
      // Uncomment this line if you want to redirect after countdown
      window.location.href = "../deadline.html";

      return;
    }

    // Calculate days, hours, minutes, seconds
    const days = Math.floor(timeDifference / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeDifference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeDifference % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeDifference % (1000 * 60)) / 1000);

    // console.log(`Countdown: ${days}d ${hours}h ${minutes}m ${seconds}s`); // Log countdown
    
    // Update the DOM with the countdown
    countdownElement.textContent = `${days}d ${hours}h ${minutes}m ${seconds}s`;
  }, 1000);
});


