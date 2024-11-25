import Learner from "./Learner.js";
import randomQuotes from "./QuotesAPI.js";
import LearnerPerformance from "./performance.js";

const fullName = document.getElementById("full-Name");
const ageInput = document.getElementById("age-Input");
const levelInput = document.getElementById("level-Input");
const genderInput = document.getElementById("gender-Input");
const emailInput = document.getElementById("email-Input");

const studentFormBtn = document.querySelector(".submit-student-btn");

const assessmentMenu = document.querySelector(".assessment-menu");

let displayStudentInfo = (name, age, level, gender, email) => {
  let studentProfile = "";

  studentProfile += `
           <div class="card card-card" style="width: 18rem;">
            <div class="card-header">
              Current Student's Profile
            </div>
            <ul class="list-group list-group-flush">
              <li class="list-group-item"><strong>Name: </strong>${name}</li>
              <li class="list-group-item"><strong>Age: </strong>${age}</li>
              <li class="list-group-item"><strong>Form: </strong>${level}</li>
              <li class="list-group-item"><strong>Gender: </strong>${gender}</li>
              <li class="list-group-item"><strong>Email: </strong>${email}</li>
            </ul>
          </div>
  `;
  document.querySelector(".user-profile").innerHTML = studentProfile;
};


let displayStudentPerformance = (firstCat, secondCat, thirdCat, projectWork) => {
  let studentPerformance = "";

  studentPerformance += `
           <div class="card card-card" style="width: 18rem;">
            <div class="card-header">
              Current Student's Performance
            </div>
            <ul class="list-group list-group-flush">
              <li class="list-group-item"><strong>Cat One: </strong>${firstCat}</li>
              <li class="list-group-item"><strong>Cat Two: </strong>${secondCat}</li>
              <li class="list-group-item"><strong>Cat Three: </strong>${thirdCat}</li>
              <li class="list-group-item"><strong>Project Work: </strong>${projectWork}</li>
            </ul>
          </div>
  `;
  document.querySelector(".user-performance").innerHTML = studentPerformance;
};

studentFormBtn.addEventListener("click", (e) => {
  e.preventDefault();
  if (
    !fullName.value ||
    !ageInput.value ||
    !levelInput.value ||
    !genderInput.value ||
    !emailInput.value
  ) {
    alert("All Input Fields Required!!");
  } else {
    const student = new Learner();
    student.name = fullName.value.trim();
    student.age = ageInput.value;
    student.level = levelInput.value;
    student.gender = genderInput.value;
    student.email = emailInput.value;

    const learnerBucket = [];

    learnerBucket.push({
      name: student.name,
      age: student.age,
      gender: student.gender,
      email: student.email,
      level: student.level,
    });

    let learnerCatTwo = 15;

    let learnerPerfomance = student.catTwoPerformance(learnerCatTwo);
    // console.log("Learner performance: ", learnerPerfomance);

    let overAllPerformance = student.finalResult(learnerCatTwo, 10);
    // console.log("Final Result: ", overAllPerformance);

    // console.log(learnerBucket);

    localStorage.setItem("learner", JSON.stringify(learnerBucket));
    const storedLearner = JSON.parse(localStorage.getItem("learner"));
    // console.log("stored learner: ", storedLearner);

    storedLearner.map((eachLearner) => {
      displayStudentInfo(
        eachLearner.name,
        eachLearner.age,
        eachLearner.level,
        eachLearner.gender,
        eachLearner.email
      );
      const overlay = document.getElementById("overlay");
      overlay.style.visibility = "visible";

      // Simulate a loading process, then hide the spinner (optional)
      setTimeout(() => {
        overlay.style.visibility = "hidden";
      }, 3000); // Hide after 3 seconds

      assessmentMenu.style.display = "flex";
      assessmentMenu.style.flexDirection = "column";
      assessmentMenu.style.justifyContent = "center";
      assessmentMenu.style.alignItems = "center";
      document.querySelector(".middle-section").style.display = "none";
    });


    const learnerPerfomanceScore = new LearnerPerformance();
    let cat1 = learnerPerfomanceScore.catOne = 'In process';
    let cat2 = learnerPerfomanceScore.catTwo = 'N/A';
    let cat3 = learnerPerfomanceScore.catThree = 'N/A';
    let pw = learnerPerfomanceScore.projectWork = 'N/A';

    displayStudentPerformance(cat1, cat2, cat3, pw);
  }


});

//  localStorage.removeItem('learner');
//  localStorage.clean;

let quoteBtn = document.getElementById("btn1");

quoteBtn.addEventListener("click", async () => {
  quoteBtn.innerText = "Fetching...";

  await randomQuotes();
  setTimeout(() => {
    quoteBtn.innerText = "Finished";
  }, 500);
  setTimeout(() => {
    quoteBtn.innerText = "New Quote";
  }, 1500);
});

// Example starter JavaScript for disabling form submissions if there are invalid fields
(() => {
  "use strict";

  // Fetch all the forms we want to apply custom Bootstrap validation styles to
  const forms = document.querySelectorAll(".needs-validation");

  // Loop over them and prevent submission
  Array.from(forms).forEach((form) => {
    form.addEventListener(
      "submit",
      (event) => {
        if (!form.checkValidity()) {
          event.preventDefault();
          event.stopPropagation();
        }

        form.classList.add("was-validated");
      },
      false
    );
  });
})();

