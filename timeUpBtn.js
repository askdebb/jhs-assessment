const hallelujahAudio = document.getElementById("hallelujah");

const startButton = document.getElementById("startButton");
startButton.addEventListener("click", () => {
//   window.location.href = "./countdown.html";

console.log("Playing 'Hallelujah'");
startButton.innerText = "Okay, Loading...";

setTimeout(()=> {
    startButton.innerText = "Sorry, such is life, 😒, Enjoy!!"
    hallelujahAudio.play().catch((error) => {
      console.error("Audio playback failed:", error);
    });
}, 2000)

  
});